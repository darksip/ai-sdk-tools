import {
  DEFAULT_TEMPLATE,
  formatWorkingMemory,
  getWorkingMemoryInstructions,
  type ConversationMessage,
  type MemoryConfig,
} from "@fondation-io/memory";
import {
  Experimental_Agent as AISDKAgent,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateObject,
  generateText,
  type LanguageModel,
  type ModelMessage,
  type StepResult,
  stepCountIs,
  type Tool,
  tool,
  type UIMessage,
  type UIMessageStreamOnFinishCallback,
  type UIMessageStreamWriter,
} from "ai";
import { z } from "zod";
import { createLogger } from "@fondation-io/debug";
import { createHandoffTool, isHandoffResult, HANDOFF_TOOL_NAME } from "./handoff.js";
import { promptWithHandoffInstructions } from "./handoff-prompt.js";
import { writeAgentStatus, writeSuggestions } from "./streaming.js";
import {
  getUsageTrackingConfig,
  type UsageTrackingEvent,
} from "./usage-tracking-config.js";
import type {
  AgentConfig,
  AgentEvent,
  AgentGenerateOptions,
  AgentGenerateResult,
  AgentStreamOptions,
  AgentStreamOptionsUI,
  AgentStreamResult,
  ExtendedExecutionContext,
  HandoffInstruction,
  Agent as IAgent,
  InputGuardrail,
  MemoryIdentifiers,
  OutputGuardrail,
  ToolPermissions,
  ConfiguredHandoff,
  HandoffInputData,
} from "./types.js";
import { AgentRunContext } from "./run-context.js";
import { extractTextFromMessage } from "./utils.js";
import { createExecutionContext } from "./context.js";
import { createDefaultInputFilter } from "./tool-result-extractor.js";

const logger = createLogger('AGENT');

export class Agent<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> implements IAgent<TContext>
{
  public readonly name: string;
  public readonly instructions: string | ((context: TContext) => string);
  public readonly matchOn?:
    | (string | RegExp)[]
    | ((message: string) => boolean);
  public readonly onEvent?: (event: AgentEvent) => void | Promise<void>;
  public readonly inputGuardrails?: InputGuardrail[];
  public readonly outputGuardrails?: OutputGuardrail[];
  public readonly permissions?: ToolPermissions;
  public readonly lastMessages?: number;
  private readonly memory?: MemoryConfig;
  private readonly model: LanguageModel;
  private readonly aiAgent: AISDKAgent<Record<string, Tool>>;
  private readonly handoffAgents: Array<IAgent<any> | ConfiguredHandoff<any>>;
  private readonly configuredTools:
    | Record<string, Tool>
    | ((context: TContext) => Record<string, Tool>);
  // Cache for system prompt construction
  private _cachedSystemPrompt?: string;
  private _cacheKey?: string;

  constructor(config: AgentConfig<TContext>) {
    this.name = config.name;
    this.instructions = config.instructions;
    this.matchOn = config.matchOn;
    this.onEvent = config.onEvent;
    this.inputGuardrails = config.inputGuardrails;
    this.outputGuardrails = config.outputGuardrails;
    this.permissions = config.permissions;
    this.lastMessages = config.lastMessages;
    this.memory = config.memory;
    this.model = config.model;
    this.handoffAgents = config.handoffs || [];

    // Store tools config (will be resolved at runtime)
    this.configuredTools = config.tools || {};

    // Create AI SDK Agent with minimal config (system prompt overridden per-request in stream())
    this.aiAgent = new AISDKAgent<Record<string, Tool>>({
      model: config.model,
      system: "", // Will be overridden per-request with resolved instructions
      tools: {}, // Will be overridden per-request with resolved tools
      stopWhen: stepCountIs(config.maxTurns || 10),
      temperature: config.temperature,
      ...config.modelSettings,
    });
  }

  async generate(options: AgentGenerateOptions): Promise<AgentGenerateResult> {
    const startTime = new Date();

    try {
      const result =
        options.messages && options.messages.length > 0
          ? await this.aiAgent.generate({
              messages: [
                ...options.messages,
                { role: "user", content: options.prompt || "Continue" },
              ],
            })
          : await this.aiAgent.generate({
              prompt: options.prompt,
            });

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Extract handoffs from steps
      const handoffs: HandoffInstruction[] = [];
      if (result.steps) {
        for (const step of result.steps) {
          if (step.toolResults) {
            for (const toolResult of step.toolResults) {
              if (isHandoffResult(toolResult.output)) {
                handoffs.push(toolResult.output as HandoffInstruction);
              }
            }
          }
        }
      }

      // Build the result object
      const generateResult: AgentGenerateResult = {
        text: result.text || "",
        finalAgent: this.name,
        finalOutput: result.text || "",
        handoffs,
        metadata: {
          startTime,
          endTime,
          duration,
        },
        steps: result.steps,
        finishReason: result.finishReason,
        usage: result.usage,
        providerMetadata: result.providerMetadata,
        toolCalls: result.toolCalls?.map((tc) => ({
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          args: "args" in tc ? tc.args : undefined,
        })),
      };

      // Track usage if configured
      const tracker = getUsageTrackingConfig();
      if (tracker) {
        const event = this.buildUsageEvent({
          method: "generate",
          result: generateResult,
          context: (options as any).context,
          duration,
        });
        // Invoke tracking asynchronously (don't block return)
        this.invokeUsageTracker(event).catch((err) =>
          logger.error("Usage tracking failed", { error: err }),
        );
      }

      return generateResult;
    } catch (error) {
      throw new Error(
        `Agent ${this.name} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  stream(
    options: AgentStreamOptions | { messages: ModelMessage[] },
  ): AgentStreamResult {
    logger.debug(`${this.name} stream called`, { name: this.name });

    // Extract our internal execution context (we map to/from AI SDK's experimental_context at boundaries)
    const executionContext = (options as Record<string, unknown>)
      .executionContext as Record<string, unknown> | undefined;
    const maxSteps = (options as Record<string, unknown>).maxSteps as
      | number
      | undefined;
    const onStepFinish = (options as Record<string, unknown>).onStepFinish as
      | ((step: unknown) => void | Promise<void>)
      | undefined;
    const onFinish = (options as Record<string, unknown>).onFinish as
      | ((event: unknown) => void | Promise<void>)
      | undefined;

    // Resolve instructions dynamically (static string or function)
    const resolvedInstructions =
      typeof this.instructions === "function"
        ? this.instructions(executionContext as TContext)
        : this.instructions;

    // Get memory addition from context if preloaded
    const extendedContext = executionContext as ExtendedExecutionContext | undefined;
    const memoryAddition = extendedContext?._memoryAddition || "";

    // Build cache key for static parts
    const cacheKey = `${typeof this.instructions === "string" ? this.instructions : "dynamic"}_${this.handoffAgents.length}_${this.memory?.workingMemory?.enabled || false}`;
    
    // Build system prompt with caching for static parts
    let systemPrompt: string;
    if (this._cacheKey === cacheKey && this._cachedSystemPrompt && !memoryAddition) {
      // Use cached version if no dynamic memory addition
      systemPrompt = this._cachedSystemPrompt;
    } else {
      // Build the static base prompt
      let basePrompt = this.handoffAgents.length > 0
        ? promptWithHandoffInstructions(resolvedInstructions)
        : resolvedInstructions;

      // Add working memory instructions if enabled
      if (this.memory?.workingMemory?.enabled) {
        const workingMemoryInstructions = getWorkingMemoryInstructions(
          this.memory.workingMemory.template || DEFAULT_TEMPLATE,
        );
        basePrompt += `\n\n${workingMemoryInstructions}`;
      }

      // Cache the base prompt if instructions are static
      if (typeof this.instructions === "string" && !memoryAddition) {
        this._cachedSystemPrompt = basePrompt;
        this._cacheKey = cacheKey;
      }

      // Add dynamic memory addition
      systemPrompt = basePrompt + memoryAddition;
    }

    // Resolve tools dynamically (static object or function)
    const resolvedTools =
      typeof this.configuredTools === "function"
        ? this.configuredTools(executionContext as TContext)
        : { ...this.configuredTools };

    // Add handoff tool if needed
    if (this.handoffAgents.length > 0) {
      resolvedTools[HANDOFF_TOOL_NAME] = createHandoffTool(this.handoffAgents);
      // Note: Agents communicate via conversationMessages during handoffs
    }

    // Add working memory update tool if enabled
    // Give to all agents that can do work (have tools beyond just handoff)
    const hasOtherTools = Object.keys(resolvedTools).some(key => key !== HANDOFF_TOOL_NAME);
    const isPureOrchestrator = this.handoffAgents.length > 0 && !hasOtherTools;
    
    if (this.memory?.workingMemory?.enabled && !isPureOrchestrator) {
      resolvedTools.updateWorkingMemory = this.createWorkingMemoryTool();
    }

    // Note: Conversation history is automatically loaded via loadMessagesWithHistory()

    // Compose onFinish with usage tracking if configured
    const tracker = getUsageTrackingConfig();
    const composedOnFinish = tracker
      ? async (event: unknown) => {
          // Build and track usage event
          const trackingEvent = this.buildUsageEvent({
            method: "stream",
            event,
            context: executionContext,
          });

          // Run user callback and tracking in parallel
          await Promise.all([
            onFinish?.(event),
            this.invokeUsageTracker(trackingEvent),
          ]);
        }
      : onFinish;

    // Build additional options to pass to AI SDK
    const additionalOptions: Record<string, unknown> = {
      system: systemPrompt, // Override system prompt per call
      tools: resolvedTools, // Add resolved tools here
    };

    if (executionContext) {
      additionalOptions.experimental_context = executionContext;
    }

    if (maxSteps) additionalOptions.maxSteps = maxSteps;
    if (onStepFinish) additionalOptions.onStepFinish = onStepFinish;
    if (composedOnFinish) additionalOptions.onFinish = composedOnFinish;

    // Handle simple { messages } format (like working code)
    if ("messages" in options && !("prompt" in options) && options.messages) {
      logger.debug(`Stream with messages only`, {
        messageCount: options.messages.length,
      });
      return this.aiAgent.stream({
        messages: options.messages,
        ...additionalOptions,
      }) as unknown as AgentStreamResult;
    }

    // Handle full AgentStreamOptions format
    const opts = options as AgentStreamOptions;
    logger.debug(`Stream options for ${this.name}`, {
      hasPrompt: !!opts.prompt,
      messageCount: opts.messages?.length || 0,
    });

    if (!opts.prompt && (!opts.messages || opts.messages.length === 0)) {
      throw new Error("No prompt or messages provided to stream method");
    }

    // If we have messages, append prompt as user message
    if (opts.messages && opts.messages.length > 0 && opts.prompt) {
      return this.aiAgent.stream({
        messages: [...opts.messages, { role: "user", content: opts.prompt }],
        ...additionalOptions,
      }) as unknown as AgentStreamResult;
    }

    // Prompt only
    if (opts.prompt) {
      return this.aiAgent.stream({
        prompt: opts.prompt,
        ...additionalOptions,
      }) as unknown as AgentStreamResult;
    }

    throw new Error("No valid options provided to stream method");
  }

  getHandoffs(): Array<IAgent<any>> {
    return this.handoffAgents.map(h => 'agent' in h ? h.agent : h);
  }

  getConfiguredHandoffs(): Array<ConfiguredHandoff<any>> {
    return this.handoffAgents.map(h => 'agent' in h ? h : { agent: h });
  }

  /**
   * Convert agent execution to UI Message Stream Response
   * High-level API for Next.js route handlers
   *
   * This follows the working pattern from the route.ts reference code
   */
  toUIMessageStream(options: AgentStreamOptionsUI): Response {
    const {
      message,
      strategy = "auto",
      maxRounds = 5,
      maxSteps = 10,
      context,
      agentChoice,
      toolChoice,
      beforeStream,
      onEvent,
      // AI SDK createUIMessageStream options
      onFinish,
      onError,
      generateId,
      // AI SDK toUIMessageStream options
      sendReasoning,
      sendSources,
      sendFinish,
      sendStart,
      messageMetadata,
      // Response options
      status,
      statusText,
      headers,
    } = options;

    // Store user message text for later use in onFinish
    const userMessageText = extractTextFromMessage(
      convertToModelMessages([message])[0],
    );

    // Declare variable to store chat metadata (will be loaded in execute block)
    let existingChatForSave: any = null;

    // Accumulate assistant text during streaming
    let accumulatedAssistantText = "";

    // Wrap onFinish to save messages after streaming
    const wrappedOnFinish: UIMessageStreamOnFinishCallback<never> = async (
      event,
    ) => {
      // Save messages and update chat session after stream completes
      if (this.memory?.history?.enabled && context) {
        const { chatId, userId } = this.extractMemoryIdentifiers(
          context as TContext,
        );

        if (!chatId) {
          logger.warn("Cannot save messages: chatId is missing from context");
        } else {
          try {
            // Use accumulated text from streaming instead of responseMessage
            logger.debug(`Using accumulated assistant text (length: ${accumulatedAssistantText.length})`);
            await this.saveConversation(
              chatId,
              userId,
              userMessageText,
              accumulatedAssistantText,
              existingChatForSave,
            );
          } catch (err) {
            logger.error("Failed to save conversation", { error: err });
          }
        }
      }

      // Call user's onFinish
      await onFinish?.(event);
    };

    const stream = createUIMessageStream({
      originalMessages: [message] as never[],
      onFinish: wrappedOnFinish,
      onError,
      generateId,
      execute: async ({ writer }) => {
        // Load history and working memory in parallel for better performance
        const [messages, memoryAddition] = await Promise.all([
          this.loadMessagesWithHistory(message, context as TContext),
          context && this.memory?.workingMemory?.enabled
            ? this.loadWorkingMemory(context as TContext)
            : Promise.resolve(""),
        ]);

        // Load chat metadata once for the entire request (stored in closure for wrappedOnFinish)
        const { chatId, userId } = this.extractMemoryIdentifiers(context as TContext);
        if (this.memory?.chats?.enabled && chatId) {
          existingChatForSave = await this.memory.provider?.getChat?.(chatId);
        }

        // Extract input from last message for routing
        const lastMessage = messages[messages.length - 1];
        const input = extractTextFromMessage(lastMessage);

        // Generate chat title if this is the first message (using pre-loaded chat)
        await this.maybeGenerateChatTitle(context as TContext, input, writer, existingChatForSave);

        // Create AgentRunContext for the workflow
        const runContext = new AgentRunContext(context || {});
        runContext.metadata = {
          agent: this.name,
          requestId: `req_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        };

        // Create execution context with user context and writer
        const executionContext = createExecutionContext({
          context: (context || {}) as Record<string, unknown>,
          writer,
          metadata: {
            agent: this.name,
            requestId: runContext.metadata.requestId as string,
          },
        });

        // Add runContext to execution context for shared memory tool
        (executionContext as any).runContext = runContext;

        // Initialize handoff chain for usage tracking
        (executionContext as any)._handoffChain = [] as string[];

        // Store memory addition for system prompt injection
        if (memoryAddition) {
          const extendedExecContext =
            executionContext as ExtendedExecutionContext;
          extendedExecContext._memoryAddition = memoryAddition;
        }

        try {
          // Execute beforeStream hook - allows for rate limiting, auth, etc.
          if (beforeStream) {
            const shouldContinue = await beforeStream({ writer });
            if (shouldContinue === false) {
              // Type assertion needed: custom finish message format
              writer.write({ type: "finish" } as any);
              return;
            }
          }

          // Prepare conversation messages
          const conversationMessages = [...messages];

          // Get handoff agents (specialists)
          const specialists = this.getHandoffs();

          // Emit orchestrator start (even if we skip to specialist via programmatic routing)
          writeAgentStatus(writer, {
            status: "routing",
            agent: this.name,
          });

          if (onEvent) {
            await onEvent({
              type: "agent-start",
              agent: this.name,
              round: 0,
            });
          }

          // Determine starting agent using programmatic routing
          let currentAgent: IAgent<any> = this;

          // Check for explicit agent or tool choice (highest priority)
          if (agentChoice && specialists.length > 0) {
            const chosenAgent = specialists.find(
              (agent) => agent.name === agentChoice,
            );
            if (chosenAgent) {
              currentAgent = chosenAgent;
              logger.debug(`Explicit agent choice: ${currentAgent.name}`, { agent: currentAgent.name });

              // Mark orchestrator as completing
              writeAgentStatus(writer, {
                status: "completing",
                agent: this.name,
              });

              if (onEvent) {
                await onEvent({
                  type: "agent-finish",
                  agent: this.name,
                  round: 0,
                });
              }

              // Emit handoff event for explicit choice
              writer.write({
                type: "data-agent-handoff",
                data: {
                  from: this.name,
                  to: chosenAgent.name,
                  reason: "User selected agent",
                  routingStrategy: "explicit",
                },
                transient: true,
              } as never);

              if (onEvent) {
                await onEvent({
                  type: "agent-handoff",
                  from: this.name,
                  to: chosenAgent.name,
                  reason: "User selected agent",
                });
              }
            }
          } else if (toolChoice && specialists.length > 0) {
            // Find agent that has the requested tool
            const agentWithTool = specialists.find((agent) => {
              const agentImpl = agent as Agent<any>;
              return (
                agentImpl.configuredTools &&
                toolChoice in agentImpl.configuredTools
              );
            });

            if (agentWithTool) {
              currentAgent = agentWithTool;
              logger.debug(`Tool choice routing: ${toolChoice} → ${currentAgent.name}`, { toolChoice, agent: currentAgent.name });

              // Mark orchestrator as completing
              writeAgentStatus(writer, {
                status: "completing",
                agent: this.name,
              });

              if (onEvent) {
                await onEvent({
                  type: "agent-finish",
                  agent: this.name,
                  round: 0,
                });
              }

              // Emit handoff event for tool choice
              writer.write({
                type: "data-agent-handoff",
                data: {
                  from: this.name,
                  to: agentWithTool.name,
                  reason: `User requested tool: ${toolChoice}`,
                  routingStrategy: "tool-choice",
                  preferredTool: toolChoice,
                },
                transient: true,
              } as never);

              if (onEvent) {
                await onEvent({
                  type: "agent-handoff",
                  from: this.name,
                  to: agentWithTool.name,
                  reason: `User requested tool: ${toolChoice}`,
                });
              }
            }
          } else if (strategy === "auto" && specialists.length > 0) {
            // Try programmatic classification
            const matchedAgent = specialists.find((agent) => {
              if (!agent.matchOn) return false;
              if (typeof agent.matchOn === "function") {
                return agent.matchOn(input);
              }
              if (Array.isArray(agent.matchOn)) {
                return agent.matchOn.some((pattern) => {
                  if (typeof pattern === "string") {
                    return input.toLowerCase().includes(pattern.toLowerCase());
                  }
                  if (pattern instanceof RegExp) {
                    return pattern.test(input);
                  }
                  return false;
                });
              }
              return false;
            });

            if (matchedAgent) {
              currentAgent = matchedAgent;
              logger.debug(`Programmatic match: ${currentAgent.name}`, { agent: currentAgent.name });

              // Mark orchestrator as completing
              writeAgentStatus(writer, {
                status: "completing",
                agent: this.name,
              });

              if (onEvent) {
                await onEvent({
                  type: "agent-finish",
                  agent: this.name,
                  round: 0,
                });
              }

              // Emit handoff event for programmatic routing
              writer.write({
                type: "data-agent-handoff",
                data: {
                  from: this.name,
                  to: matchedAgent.name,
                  reason: "Programmatic routing match",
                  routingStrategy: "programmatic",
                },
                transient: true,
              } as never);

              if (onEvent) {
                await onEvent({
                  type: "agent-handoff",
                  from: this.name,
                  to: matchedAgent.name,
                  reason: "Programmatic routing match",
                });
              }
            }
          }

          let round = 0;
          const usedSpecialists = new Set<string>();

          // If we used programmatic routing, mark specialist as used
          if (currentAgent !== this) {
            usedSpecialists.add(currentAgent.name);
          }

          while (round++ < maxRounds) {
            // Send status: agent executing
            writeAgentStatus(writer, {
              status: "executing",
              agent: currentAgent.name,
            });

            // Get context window size from agent config, with sensible defaults
            // Use lower default for specialists (no handoffs) to reduce token usage
            const defaultLastMessages = currentAgent.getHandoffs().length > 0 ? 10 : 5;
            const lastMessages = currentAgent.lastMessages ?? defaultLastMessages;
            
            // Ensure we have at least the original user message
            let messagesToSend = conversationMessages.slice(-lastMessages);
            if (messagesToSend.length === 0 && messages.length > 0) {
              messagesToSend = messages.slice(-1); // Use the last user message
            }

            // Emit agent start event
            if (onEvent) {
              await onEvent({
                type: "agent-start",
                agent: currentAgent.name,
                round,
              });
            }

            // Type assertion needed: executionContext and onStepFinish types don't strictly match
            const result = currentAgent.stream({
              messages: messagesToSend,
              executionContext: executionContext,
              maxSteps, // Limit tool calls per round
              onStepFinish: async (step: unknown) => {
                if (onEvent) {
                  await onEvent({
                    type: "agent-step",
                    agent: currentAgent.name,
                    step: step as StepResult<Record<string, Tool>>,
                  });
                }
              },
            } as any);

            // This automatically converts fullStream to proper UI message chunks
            // Pass toUIMessageStream options from user config
            const uiStream = result.toUIMessageStream({
              sendReasoning,
              sendSources,
              sendFinish,
              sendStart,
              messageMetadata,
            });

            // Track for orchestration
            let textAccumulated = "";
            let handoffData: HandoffInstruction | null = null;
            const toolCallNames = new Map<string, string>(); // toolCallId -> toolName
            const toolResults = new Map<string, any>(); // toolName -> result
            let hasStartedContent = false;
            
            // Optimize handoff detection with Set for O(1) lookups
            const handoffToolNames = new Set([HANDOFF_TOOL_NAME]);

            // Stream UI chunks - AI SDK handles all the formatting!
            for await (const chunk of uiStream) {
              // Skip undefined/null chunks
              if (!chunk) {
                logger.warn("Received null/undefined chunk from uiStream");
                continue;
              }

              // Track tool names when they start (do this early for handoff detection)
              if (chunk.type === "tool-input-start") {
                toolCallNames.set(chunk.toolCallId, chunk.toolName);
                logger.debug(`Tool call started: ${chunk.toolName} (${chunk.toolCallId})`, { 
                  toolName: chunk.toolName, 
                  toolCallId: chunk.toolCallId,
                  agent: currentAgent.name,
                  round,
                });
              }

              // Check if this chunk is related to handoff (internal orchestration)
              let isHandoffChunk = false;
              
              if (chunk.type === "tool-input-start") {
                isHandoffChunk = handoffToolNames.has((chunk as any).toolName);
              } else if (chunk.type === "tool-input-delta" || chunk.type === "tool-input-available") {
                const toolName = toolCallNames.get((chunk as any).toolCallId);
                isHandoffChunk = toolName ? handoffToolNames.has(toolName) : false;
              } else if (chunk.type === "tool-output-available") {
                const toolName = toolCallNames.get((chunk as any).toolCallId);
                isHandoffChunk = toolName ? handoffToolNames.has(toolName) : false;
              }

              // Clear status on first actual content (text or non-handoff tool)
              if (
                !hasStartedContent &&
                (chunk.type === "text-delta" ||
                  (chunk.type === "tool-input-start" && !isHandoffChunk))
              ) {
                hasStartedContent = true;
              }

              // Log general errors
              if (chunk.type === "error") {
                logger.error("Stream error", { 
                  error: (chunk as any).errorText || (chunk as any).error || chunk
                });
              }

              // Capture tool results and detect handoffs
              if (chunk.type === "tool-output-available") {
                const toolName = toolCallNames.get(chunk.toolCallId);
                if (toolName) {
                  // Store tool result for handoff context
                  toolResults.set(toolName, chunk.output);
                  logger.debug(`Captured ${toolName}`, { toolName, outputType: typeof chunk.output });
                  
                  // Detect handoff
                  if (handoffToolNames.has(toolName)) {
                    handoffData = chunk.output as HandoffInstruction;
                    logger.debug("Handoff detected", handoffData);
                  }
                }
              }

              // Filter out handoff tool chunks from UI (internal orchestration)
              // But keep agent status events (written separately via writeAgentStatus)
              if (!isHandoffChunk) {
                try {
                  writer.write(chunk as any);
                } catch (error) {
                  logger.error("Failed to write chunk to stream", { 
                    chunkType: chunk.type,
                    error,
                  });
                }
              }

              // Track text for conversation history
              if (chunk.type === "text-delta") {
                textAccumulated += chunk.delta;
              }
            }

            // Update conversation - only add text if it's a complete response
            // Don't add intermediate text that was generated between tool calls
            if (textAccumulated && !handoffData) {
              // Only add to conversation if this is a final response (no handoff occurred)
              conversationMessages.push({
                role: "assistant",
                content: textAccumulated,
              });
              // Accumulate for memory save
              accumulatedAssistantText += textAccumulated;
            } else if (textAccumulated && handoffData) {
              // If there was a handoff, this text was intermediate - don't add to conversation
              // The handoff agent will provide the final response
              logger.debug("Skipping intermediate text due to handoff", { 
                textLength: textAccumulated.length,
                handoffTarget: handoffData.targetAgent
              });
            }

            // Emit agent finish event
            if (onEvent) {
              await onEvent({
                type: "agent-finish",
                agent: currentAgent.name,
                round,
              });
            }

            // Handle orchestration flow
            if (currentAgent === this) {
              if (handoffData) {
                // Check if this specialist has already been used
                if (usedSpecialists.has(handoffData.targetAgent)) {
                  // Don't route to the same specialist twice - task is complete
                  break;
                }

                // Send routing status
                writeAgentStatus(writer, {
                  status: "routing",
                  agent: this.name,
                });

                // Mark specialist as used and route to it
                usedSpecialists.add(handoffData.targetAgent);
                const nextAgent = specialists.find(
                  (a) => a.name === handoffData.targetAgent,
                );
                if (nextAgent) {
                  // Apply handoff input filter if configured
                  const configuredHandoffs = this.getConfiguredHandoffs();
                  const configuredHandoff = configuredHandoffs.find(
                    (ch) => ch.agent.name === handoffData.targetAgent
                  );

                  // Apply handoff input filter if configured
                  const inputFilter = configuredHandoff?.config?.inputFilter;
                  if (inputFilter) {
                    try {
                      // Build HandoffInputData with captured tool results
                      const handoffInputData: HandoffInputData = {
                        inputHistory: conversationMessages,
                        preHandoffItems: [],
                        newItems: Array.from(toolResults.entries()).map(([name, result]) => ({
                          toolName: name,
                          result: result
                        })),
                        runContext,
                      };

                      // Apply filter to modify conversation history
                      const filteredData = inputFilter(handoffInputData);
                      
                      // Update conversation messages with filtered data
                      conversationMessages.length = 0;
                      conversationMessages.push(...filteredData.inputHistory);
                    } catch (error) {
                      logger.error("Error applying handoff input filter", { error });
                      // Continue with original conversation messages as fallback
                    }
                  } else {
                    // Use default input filter to modify conversation history
                    logger.debug("Applying default input filter for", { targetAgent: handoffData.targetAgent });
                    const defaultFilter = createDefaultInputFilter();
                    
                    const handoffInputData: HandoffInputData = {
                      inputHistory: conversationMessages,
                      preHandoffItems: [],
                      newItems: Array.from(toolResults.entries()).map(([name, result]) => ({
                        toolName: name,
                        result: result
                      })),
                      runContext,
                    };
                    
                    logger.debug("Input history length", { length: handoffInputData.inputHistory.length });
                    logger.debug("Input history messages", { 
                      messages: handoffInputData.inputHistory.map(m => ({ role: m.role, contentType: typeof m.content }))
                    });
                    const filteredData = defaultFilter(handoffInputData);
                    logger.debug("Filtered history length", { length: filteredData.inputHistory.length });
                    
                    // Update conversation messages with filtered data
                    conversationMessages.length = 0;
                    conversationMessages.push(...filteredData.inputHistory);
                    logger.debug("Updated conversation messages length", { length: conversationMessages.length });
                  }

                  // Call onHandoff callback if configured
                  if (configuredHandoff?.config?.onHandoff) {
                    try {
                      await configuredHandoff.config.onHandoff(runContext);
                    } catch (error) {
                      logger.error("Error in onHandoff callback", { error });
                      // Continue execution - callback errors shouldn't stop handoff
                    }
                  }

                  // Update handoff chain before switching agents (for usage tracking)
                  const handoffChain = (executionContext as any)._handoffChain as string[];
                  if (!handoffChain.includes(this.name)) {
                    handoffChain.push(this.name);
                  }

                  currentAgent = nextAgent;

                  writer.write({
                    type: "data-agent-handoff",
                    data: {
                      from: this.name,
                      to: nextAgent.name,
                      reason: handoffData.reason,
                      routingStrategy: "llm",
                    },
                    transient: true,
                  } as never);

                  // Emit handoff event
                  if (onEvent) {
                    await onEvent({
                      type: "agent-handoff",
                      from: this.name,
                      to: nextAgent.name,
                      reason: handoffData.reason,
                    });
                  }
                }
              } else {
                // Orchestrator done, no more handoffs
                break;
              }
            } else {
              // Specialist done
              if (handoffData) {
                // Specialist handed off to another specialist
                if (usedSpecialists.has(handoffData.targetAgent)) {
                  // Already used this specialist - complete
                  break;
                }

                // Route to next specialist
                usedSpecialists.add(handoffData.targetAgent);
                const nextAgent = specialists.find(
                  (a) => a.name === handoffData.targetAgent,
                );
                if (nextAgent) {
                  // Apply handoff input filter if configured
                  const configuredHandoffs = this.getConfiguredHandoffs();
                  const configuredHandoff = configuredHandoffs.find(
                    (ch) => ch.agent.name === handoffData.targetAgent
                  );

                  if (configuredHandoff?.config?.inputFilter) {
                    try {
                      // Build HandoffInputData
                      const handoffInputData: HandoffInputData = {
                        inputHistory: conversationMessages.slice(0, -1), // All messages except the last assistant message
                        preHandoffItems: [], // No pre-handoff items for specialist-to-specialist
                        newItems: conversationMessages.slice(-1), // The last assistant message
                        runContext,
                      };

                      // Apply filter
                      const filteredData = configuredHandoff.config.inputFilter(handoffInputData);
                      
                      // Update conversation messages with filtered data
                      conversationMessages.length = 0;
                      conversationMessages.push(...filteredData.inputHistory, ...filteredData.newItems);
                    } catch (error) {
                      logger.error("Error applying handoff input filter", { error });
                      // Continue with original conversation messages as fallback
                    }
                  }

                  // Call onHandoff callback if configured
                  if (configuredHandoff?.config?.onHandoff) {
                    try {
                      await configuredHandoff.config.onHandoff(runContext);
                    } catch (error) {
                      logger.error("Error in onHandoff callback", { error });
                      // Continue execution - callback errors shouldn't stop handoff
                    }
                  }

                  const previousAgent = currentAgent;
                  currentAgent = nextAgent;

                  // Write handoff to stream for devtools
                  writer.write({
                    type: "data-agent-handoff",
                    data: {
                      from: previousAgent.name,
                      to: nextAgent.name,
                      reason: handoffData.reason,
                      routingStrategy: "llm",
                    },
                    transient: true,
                  } as never);

                  // Emit handoff event
                  if (onEvent) {
                    await onEvent({
                      type: "agent-handoff",
                      from: previousAgent.name,
                      to: nextAgent.name,
                      reason: handoffData.reason,
                    });
                  }
                }
              } else {
                // No handoff - specialist is done, complete the task
                break;
              }
            }
          }

          // Emit completion event
          if (onEvent) {
            await onEvent({
              type: "agent-complete",
              totalRounds: round,
            });
          }

          // Log if this was a tool-only turn 
          if (accumulatedAssistantText.length === 0) {
            logger.debug("Tool-only turn - no text response generated");
          }

          // Generate suggestions after orchestration completes
          const config = this.memory?.chats?.generateSuggestions;
          const minLength = typeof config === "object" && config.minResponseLength 
            ? config.minResponseLength 
            : 100;

          // Only generate if response is substantial enough
          if (accumulatedAssistantText.length >= minLength) {
            // Use focused context window (recent exchanges) instead of full history
            const contextWindow = typeof config === "object" && config.contextWindow
              ? config.contextWindow
              : 1;

            // Get last N exchanges (user + assistant pairs)
            const recentMessages = conversationMessages.slice(-(contextWindow * 2));
            
            const conversationContext = recentMessages
              .map((msg) => {
                const role = msg.role === "user" ? "User" : "Assistant";
                return `${role}: ${typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)}`;
              })
              .join("\n\n");

            // Generate suggestions based on recent context
            await this.generateSuggestions(conversationContext, conversationMessages, writer, context as TContext).catch(
              (err) => logger.error("Suggestion generation error", { error: err }),
            );
          }

          writer.write({ type: "finish" });
        } catch (error) {
          logger.error("Error in toUIMessageStream", { error });

          // Emit error event
          if (onEvent) {
            await onEvent({
              type: "agent-error",
              error: error instanceof Error ? error : new Error(String(error)),
            });
          }

          // Type assertions needed: custom error and finish message formats
          writer.write({
            type: "error",
            error: error instanceof Error ? error.message : String(error),
          } as any);
          writer.write({ type: "finish" } as any);
        }
      },
    });

    const response = createUIMessageStreamResponse({
      stream,
      status,
      statusText,
      headers,
    });

    return response;
  }

  /**
   * Extract chatId and userId from context for memory operations
   */
  private extractMemoryIdentifiers(context: TContext): {
    chatId?: string;
    userId?: string;
  } {
    const ctx = context as TContext & MemoryIdentifiers;
    const chatId = ctx.chatId || ctx.metadata?.chatId;
    const userId = ctx.userId || ctx.metadata?.userId;
    return { chatId, userId };
  }

  /**
   * Generate a title for the chat based on the first user message
   */
  private async generateChatTitle(
    chatId: string,
    userMessage: string,
    writer: UIMessageStreamWriter,
    context?: TContext,
  ): Promise<void> {
    if (!this.memory?.chats?.generateTitle) return;

    const config = this.memory.chats.generateTitle;
    const model = typeof config === "object" ? config.model : this.model;
    const instructions =
      typeof config === "object" && config.instructions
        ? config.instructions
        : "Generate a short title based on the user's message. Max 80 characters. No quotes or colons.";

    try {
      // Generate title based only on the user's message
      const { text } = await generateText({
        model,
        system: instructions,
        prompt: userMessage,
      });

      await this.memory.provider?.updateChatTitle?.(chatId, text);

      writer.write({
        type: "data-chat-title",
        data: { chatId, title: text },
      });

      logger.debug(`Generated title for ${chatId}`, { chatId, title: text });
    } catch (err) {
      logger.error("Title generation failed", { error: err });
    }
  }

  /**
   * Build capabilities description from available tools and agents
   */
  private buildCapabilitiesDescription(context?: TContext): string {
    const capabilities: string[] = [];

    // Add tools (exclude internal tools)
    if (this.configuredTools) {
      // Resolve tools if they're a function
      const resolvedTools =
        typeof this.configuredTools === "function" && context
          ? this.configuredTools(context)
          : typeof this.configuredTools === "object"
            ? this.configuredTools
            : {};

      const toolNames = Object.keys(resolvedTools).filter(
        (name) => name !== "handoff_to_agent" && name !== "updateWorkingMemory"
      );
      
      if (toolNames.length > 0) {
        capabilities.push("Available tools:");
        for (const toolName of toolNames) {
          const tool = resolvedTools[toolName];
          // @ts-expect-error - accessing internal tool properties
          const description = tool?.spec?.description || toolName;
          capabilities.push(`- ${toolName}: ${description}`);
        }
      }
    }

    // Add handoff agents
    const handoffs = this.getHandoffs();
    if (handoffs.length > 0) {
      if (capabilities.length > 0) capabilities.push("");
      capabilities.push("Can route to specialist agents:");
      for (const agent of handoffs) {
        // @ts-expect-error - accessing internal agent properties
        const description = agent.handoffDescription || `${agent.name} agent`;
        capabilities.push(`- ${agent.name}: ${description}`);
      }
    }

    return capabilities.join("\n");
  }

  /**
   * Generate contextual prompt suggestions after agent response
   */
  private async generateSuggestions(
    conversationContext: string,
    conversationMessages: ModelMessage[],
    writer: UIMessageStreamWriter,
    context?: TContext,
  ): Promise<void> {
    const config = this.memory?.chats?.generateSuggestions;
    if (!config) return;
    
    // Handle boolean true (use defaults) or object config with enabled check
    let enabled: boolean;
    if (typeof config === "boolean") {
      enabled = config;
    } else if (typeof config.enabled === "function") {
      // Call the function with messages and context
      enabled = await config.enabled({ messages: conversationMessages, context });
    } else {
      enabled = config.enabled;
    }
    
    if (!enabled) return;
    
    const model = typeof config === "object" && config.model ? config.model : this.model;
    const limit = typeof config === "object" && config.limit ? config.limit : 5;
    
    // Build default instructions with actual capabilities
    const defaultInstructions = `Generate ${limit} contextual follow-up suggestions based on what was JUST discussed.

${this.buildCapabilitiesDescription(context)}

Guidelines:
1. Analyze what the assistant just showed/discussed (data, analysis, insights)
2. Suggest logical NEXT STEPS that build on this specific response
3. Keep suggestions ultra-brief (2-3 words ideal, max 5 words)
4. Use action verbs ("Show", "Compare", "Analyze", "Check", "List", "Explore")
5. Make suggestions specific to the context, not generic
6. Focus on available capabilities that provide value

Good suggestions are:
- Specific to what was just discussed
- Actionable using available capabilities
- Brief and clear (2-3 words)
- Natural next steps, not repetitive`;

    const instructions =
      typeof config === "object" && config.instructions
        ? config.instructions
        : defaultInstructions;

    try {
      // Define schema for structured output
      const suggestionsSchema = z.object({
        prompts: z
          .array(z.string().max(40))
          .min(3)
          .max(limit)
          .describe(`Array of prompt suggestions (2-5 words each)`),
      });

      // Generate suggestions using structured output
      const { object } = await generateObject({
        model,
        system: instructions,
        prompt: conversationContext,
        schema: suggestionsSchema,
        mode: "json",
      });

      const { prompts } = object;

      // Stream suggestions as transient data part
      writeSuggestions(writer, prompts);
    } catch (err) {
      logger.error("Suggestion generation failed", { error: err });
    }
  }

  /**
   * Create the updateWorkingMemory tool
   */
  private createWorkingMemoryTool() {
    const scope = this.memory?.workingMemory?.scope || "chat";
    const memory = this.memory;
    const extractMemoryIdentifiers = this.extractMemoryIdentifiers.bind(this);

    return tool({
      description: `Save user information (name, role, company, preferences) to persistent memory for future conversations.`,
      inputSchema: z.object({
        content: z
          .string()
          .describe(
            "Updated working memory content in markdown format. Include user preferences, role, company, and any important facts to remember.",
          ),
      }),
      execute: async ({ content }, options) => {
        logger.debug("updateWorkingMemory tool called", { contentLength: content.length });
        
        if (!memory?.provider) {
          logger.warn("Memory provider not configured");
          return "Memory system not configured";
        }

        const { getContext } = await import("./context.js");
        const ctx = getContext(options as { experimental_context?: Record<string, unknown> });
        const contextData = ctx as TContext | undefined;

        if (!contextData) {
          logger.warn("Context not available for working memory update");
          return "Context not available";
        }

        const { chatId, userId } = extractMemoryIdentifiers(contextData);
        logger.debug("Updating working memory", { chatId, userId, scope });

        try {
          await memory.provider.updateWorkingMemory({
            chatId,
            userId,
            scope,
            content,
          });
          logger.debug("Working memory updated successfully");
          return "success"; 
        } catch (error) {
          logger.error("Failed to update working memory", { 
            error: error instanceof Error ? error.message : error 
          });
          return "error"; 
        }
      },
    });
  }

  /**
   * Load working memory and inject into system prompt
   */
  private async loadWorkingMemory(context: TContext): Promise<string> {
    if (!this.memory?.workingMemory?.enabled || !this.memory?.provider) {
      return "";
    }

    const { chatId, userId } = this.extractMemoryIdentifiers(context);
    const scope = this.memory.workingMemory.scope;

    try {
      const memory = await this.memory.provider.getWorkingMemory({
        chatId,
        userId,
        scope,
      });

      if (!memory) return "";

      return formatWorkingMemory(memory);
    } catch (error) {
      logger.error("Failed to load working memory", { 
        error: error instanceof Error ? error.message : error 
      });
      return "";
    }
  }

  /**
   * Extract assistant text from response message
   */
  private extractAssistantText(responseMessage: UIMessage): string {
    // Convert UIMessage to ModelMessage and extract text
    const modelMessages = convertToModelMessages([responseMessage]);
    if (modelMessages.length > 0) {
      return extractTextFromMessage(modelMessages[0]);
    }
    return "";
  }

  /**
   * Load message history from memory and prepend to the current message.
   * Falls back to just the current message if history is disabled or unavailable.
   *
   * @param message - The current user message
   * @param context - Execution context containing chatId
   * @returns Array of ModelMessages including history + current message
   */
  private async loadMessagesWithHistory(
    message: UIMessage,
    context: TContext | undefined,
  ): Promise<ModelMessage[]> {
    // No memory - just convert the message
    if (!this.memory?.history?.enabled || !context) {
      logger.debug("History disabled or no context - using single message only");
      return convertToModelMessages([message]);
    }

    const { chatId } = this.extractMemoryIdentifiers(context);

    if (!chatId) {
      logger.warn("Cannot load history: chatId missing from context");
      return convertToModelMessages([message]);
    }

    // Check if provider exists
    if (!this.memory.provider) {
      logger.warn("No memory provider configured - using single message only");
      return convertToModelMessages([message]);
    }

    try {
      const previousMessages =
        (await this.memory.provider.getMessages?.({
          chatId,
          limit: this.memory.history.limit,
        })) || [];

      logger.debug(`Loading history for chatId=${chatId}`, { 
        chatId, 
        count: previousMessages.length 
      });

      if (previousMessages.length === 0) {
        logger.debug("No previous messages found - starting new conversation");
        return convertToModelMessages([message]);
      }

      // Convert stored messages directly to ModelMessages
      const historyMessages = previousMessages.map((msg: ConversationMessage) => ({
        role: msg.role,
        content: msg.content || "",
      }));

      logger.debug(`Loaded ${historyMessages.length} history messages for context`, { 
        count: historyMessages.length 
      });
      return [...historyMessages, ...convertToModelMessages([message])];
    } catch (err) {
      logger.error(`Load history failed for chatId=${chatId}`, { chatId, error: err });
      return convertToModelMessages([message]);
    }
  }

  /**
   * Update or create a chat session, incrementing message count
   *
   * @param chatId - The chat identifier
   * @param userId - Optional user identifier
   * @param incrementBy - Number to increment message count by (default: 2)
   */
  private async updateChatSession(
    chatId: string,
    userId: string | undefined,
    incrementBy: number = 2,
  ): Promise<void> {
    if (!this.memory?.chats?.enabled) return;

    const existingChat = await this.memory.provider.getChat?.(chatId);

    if (existingChat) {
      // Update existing chat
      await this.memory.provider.saveChat?.({
        ...existingChat,
        messageCount: existingChat.messageCount + incrementBy,
        updatedAt: new Date(),
      });
    } else {
      // Create new chat
      await this.memory.provider.saveChat?.({
        chatId,
        userId,
        messageCount: incrementBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Save user and assistant messages, then update chat session.
   * Messages are saved in parallel for better performance.
   *
   * @param chatId - The chat identifier
   * @param userId - Optional user identifier
   * @param userMessage - The user's message text
   * @param assistantMessage - The assistant's response text
   * @param existingChat - Pre-loaded chat object to avoid duplicate queries
   */
  private async saveConversation(
    chatId: string,
    userId: string | undefined,
    userMessage: string,
    assistantMessage: string,
    existingChat?: any,
  ): Promise<void> {
    if (!this.memory?.provider || !this.memory?.history?.enabled) return;

    logger.debug(`Saving conversation for chatId=${chatId}`, {
      chatId,
      userLength: userMessage.length,
      assistantLength: assistantMessage.length,
    });

    // Save messages and update chat session in parallel for better performance
    try {
      const savePromises = [
        this.memory.provider.saveMessage?.({
          chatId,
          userId,
          role: "user",
          content: userMessage,
          timestamp: new Date(),
        }),
      ];

      // Only save assistant message if it has content
      if (assistantMessage && assistantMessage.length > 0) {
        logger.debug(`Will save assistant message`, { length: assistantMessage.length });
        savePromises.push(
          this.memory.provider.saveMessage?.({
            chatId,
            userId,
            role: "assistant",
            content: assistantMessage,
            timestamp: new Date(),
          })
        );
      } else {
        logger.warn(`Skipping assistant message save - empty or undefined`);
      }

      // Batch chat session update with message saves (using passed existingChat to avoid duplicate query)
      if (this.memory?.chats?.enabled) {
        const messageCount = savePromises.length;
        
        savePromises.push(
          this.memory.provider.saveChat?.({
            ...(existingChat || { chatId, userId, createdAt: new Date() }),
            messageCount: (existingChat?.messageCount || 0) + messageCount,
            updatedAt: new Date(),
          })
        );
      }

      await Promise.all(savePromises);

      logger.debug(`Successfully saved ${savePromises.length} items`, { 
        chatId, 
        count: savePromises.length 
      });
    } catch (error) {
      logger.error(`Failed to save messages for chatId=${chatId}`, { chatId, error });
      throw error; // Re-throw to make save failures visible
    }
  }

  /**
   * Generate a chat title if this is the first message.
   * Runs asynchronously without blocking the response.
   *
   * @param context - Execution context containing chatId
   * @param userMessage - The user's message to generate title from
   * @param writer - Stream writer for sending title update
   * @param existingChat - Pre-loaded chat object to avoid duplicate queries
   */
  private async maybeGenerateChatTitle(
    context: TContext | undefined,
    userMessage: string,
    writer: UIMessageStreamWriter,
    existingChat?: any,
  ): Promise<void> {
    if (
      !this.memory?.chats?.enabled ||
      !this.memory?.chats?.generateTitle ||
      !context
    ) {
      return;
    }

    const { chatId } = this.extractMemoryIdentifiers(context);

    if (!chatId) {
      logger.warn("Cannot generate title: chatId missing from context");
      return;
    }

    // Only generate for first message (using passed existingChat to avoid duplicate query)
    const isFirstMessage = !existingChat || existingChat.messageCount === 0;
    if (isFirstMessage) {
      this.generateChatTitle(chatId, userMessage, writer, context).catch(
        (err) => logger.error("Title generation error", { error: err }),
      );
    }
  }

  /**
   * Build a usage tracking event from generation/stream results.
   * Extracts context, usage, and metadata for tracking.
   * @private
   */
  private buildUsageEvent(options: {
    method: "generate" | "stream";
    result?: AgentGenerateResult;
    event?: any;
    context?: Record<string, unknown>;
    duration?: number;
  }): UsageTrackingEvent {
    const executionContext = options.context || {};

    // For stream events, extract data from the event object
    const usage = options.result?.usage || options.event?.usage;
    const providerMetadata =
      options.result?.providerMetadata || options.event?.providerMetadata;
    const finishReason =
      options.result?.finishReason || options.event?.finishReason;

    // Extract handoff chain from context and include current agent
    const existingChain = (executionContext._handoffChain as string[]) || [];
    const handoffChain =
      existingChain.length > 0 ? [...existingChain, this.name] : undefined;

    return {
      agentName: this.name,
      sessionId: executionContext.sessionId as string | undefined,
      handoffChain,
      usage,
      providerMetadata,
      method: options.method,
      finishReason,
      duration: options.duration,
      context: executionContext,
    };
  }

  /**
   * Invoke the global usage tracker if configured.
   * Handles errors gracefully to prevent tracking from breaking generation.
   * @private
   */
  private async invokeUsageTracker(event: UsageTrackingEvent): Promise<void> {
    const config = getUsageTrackingConfig();
    if (!config) return;

    try {
      await config.onUsage(event);
    } catch (error) {
      if (config.onError) {
        config.onError(error as Error, event);
      } else {
        logger.error("Usage tracking failed", { error, event });
      }
    }
  }

  static create<
    TContext extends Record<string, unknown> = Record<string, unknown>,
  >(config: AgentConfig<TContext>): Agent<TContext> {
    return new Agent<TContext>(config);
  }
}
