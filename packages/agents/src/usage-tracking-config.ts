import type { LanguageModelUsage } from "ai";

/**
 * Event emitted when an agent completes a generation or streaming operation.
 * Contains usage metrics, context, and provider-specific metadata.
 */
export interface UsageTrackingEvent {
  /** Name of the agent that generated the response */
  agentName: string;

  /** Session identifier from execution context (if provided) */
  sessionId?: string;

  /** Chain of agent names in multi-agent handoff scenarios */
  handoffChain?: string[];

  /** Standard AI SDK usage metrics (tokens, etc.) */
  usage?: LanguageModelUsage;

  /** Provider-specific metadata (e.g., OpenRouter cost data) */
  providerMetadata?: unknown;

  /** Method that triggered the tracking event */
  method: "generate" | "stream";

  /** Reason the generation finished (e.g., 'stop', 'length', 'tool-calls') */
  finishReason?: string;

  /** Duration of the generation in milliseconds (only for generate()) */
  duration?: number;

  /** Custom execution context passed to the agent */
  context?: Record<string, unknown>;
}

/**
 * Callback function invoked when usage tracking events occur.
 * Can be synchronous or asynchronous.
 */
export type UsageTrackingHandler = (
  event: UsageTrackingEvent,
) => void | Promise<void>;

/**
 * Configuration for global usage tracking.
 */
export interface UsageTrackingConfig {
  /** Handler invoked for each usage event */
  onUsage: UsageTrackingHandler;

  /** Optional error handler invoked if tracking fails */
  onError?: (error: Error, event: UsageTrackingEvent) => void;
}

/**
 * Global usage tracking configuration storage.
 */
let globalUsageTrackingConfig: UsageTrackingConfig | null = null;

/**
 * Configure global usage tracking for all agents.
 * This allows automatic tracking of usage metrics across all agent operations
 * without needing to manually inject callbacks on every call.
 *
 * @example
 * ```typescript
 * // Simple callback
 * configureUsageTracking((event) => {
 *   console.log(`Agent ${event.agentName} used ${event.usage?.totalTokens} tokens`);
 * });
 *
 * // With error handling
 * configureUsageTracking({
 *   onUsage: async (event) => {
 *     await db.usage.create({
 *       agentName: event.agentName,
 *       tokens: event.usage?.totalTokens,
 *       cost: event.providerMetadata?.openrouter?.usage.cost,
 *     });
 *   },
 *   onError: (error, event) => {
 *     console.error('Failed to track usage:', error);
 *   }
 * });
 * ```
 *
 * @param config - Either a UsageTrackingHandler function or a full UsageTrackingConfig object
 */
export function configureUsageTracking(
  config: UsageTrackingConfig | UsageTrackingHandler,
): void {
  if (typeof config === "function") {
    globalUsageTrackingConfig = { onUsage: config };
  } else {
    globalUsageTrackingConfig = config;
  }
}

/**
 * Reset the global usage tracking configuration.
 * Useful for testing or when you need to disable tracking.
 *
 * @example
 * ```typescript
 * // After tests
 * afterEach(() => {
 *   resetUsageTracking();
 * });
 * ```
 */
export function resetUsageTracking(): void {
  globalUsageTrackingConfig = null;
}

/**
 * Get the current global usage tracking configuration.
 * Internal helper used by the Agent class.
 *
 * @internal
 */
export function getUsageTrackingConfig(): UsageTrackingConfig | null {
  return globalUsageTrackingConfig;
}
