# Design Document: Global Usage Tracking

## Context

The OpenRouter native support (recently implemented) provides excellent utilities for extracting and formatting usage metrics, but requires manual invocation after every generation/streaming call. For production applications needing systematic tracking (cost monitoring, billing, analytics), this creates repetitive boilerplate.

This change adds a **global configuration system** that automatically invokes a user-provided callback for all usage events across all agents.

## Goals

1. **Zero-Configuration Tracking**: Set up once, track everywhere
2. **Provider Agnostic**: Work with any AI provider's metadata structure
3. **Context Preservation**: Include agent name, handoff chain, session info
4. **Non-Breaking**: Fully backward compatible, opt-in feature

## Non-Goals

- **Not** implementing specific persistence backends (DB, Redis, etc.)
- **Not** adding analytics or visualization
- **Not** replacing manual tracking (coexist with existing approaches)
- **Not** enforcing specific provider usage (OpenRouter-specific logic stays in user code)

## Decisions

### Decision 1: Global Singleton vs Instance-Based Configuration

**Choice**: Global singleton with module-level configuration function

**Rationale**:
- User explicitly requested "global configuration" not per-agent
- Simplifies setup: configure once at app startup
- Natural for server applications with single tracking destination
- Matches common patterns (logging libraries, telemetry SDKs)

**Alternatives Considered**:
- Agent-level config → Rejected: Requires repetition across instances
- Context-based injection → Rejected: Requires passing config through all calls

**Implementation**:
```typescript
// Global state in module
let globalUsageTracker: UsageTrackingHandler | null = null;

export function configureUsageTracking(config: UsageTrackingConfig) {
  globalUsageTracker = config.onUsage;
}

export function resetUsageTracking() {
  globalUsageTracker = null;
}

// Internal helper
export function getUsageTracker(): UsageTrackingHandler | null {
  return globalUsageTracker;
}
```

### Decision 2: Callback Signature - Flat vs Structured Event

**Choice**: Structured event object with clear categories

**Rationale**:
- Extensible: Can add fields without breaking signature
- Self-documenting: Clear what data is available
- Type-safe: Single interface to maintain
- Standard pattern: Matches AI SDK event structures

```typescript
interface UsageTrackingEvent {
  // Context identifiers
  agentName: string;
  sessionId?: string;
  handoffChain?: string[];

  // Usage metrics
  usage: LanguageModelUsage;
  providerMetadata?: unknown;

  // Generation metadata
  method: 'generate' | 'stream';
  finishReason?: string;
  duration?: number;

  // User context
  context?: Record<string, unknown>;
}

type UsageTrackingHandler = (event: UsageTrackingEvent) => void | Promise<void>;
```

**Alternatives Considered**:
- Flat parameters → Rejected: Hard to extend, long parameter lists
- Minimal (only usage) → Rejected: Insufficient context for real-world use

### Decision 3: Integration Points

**Choice**: Inject tracking at three strategic points

**Integration Points**:
1. **Agent.generate()**: After successful generation, before returning result
2. **Agent.stream()**: Compose with user's `onFinish` callback
3. **Handoffs**: Track each agent individually in multi-agent flows

**Rationale**:
- User explicitly requested all three timing points
- Natural breakpoints where usage is finalized
- Preserves full context (agent name, handoff chain)

**Implementation Strategy**:

```typescript
// In Agent.generate()
async generate(options: AgentGenerateOptions): Promise<AgentGenerateResult> {
  const startTime = Date.now();
  const result = await this.aiAgent.generate(...);

  // Track usage if configured
  const tracker = getUsageTracker();
  if (tracker) {
    await this.invokeUsageTracker(tracker, {
      method: 'generate',
      result,
      duration: Date.now() - startTime,
      options,
    });
  }

  return result;
}

// In Agent.stream()
stream(options: AgentStreamOptions): AgentStreamResult {
  const tracker = getUsageTracker();
  const userOnFinish = options.onFinish;

  // Compose tracking with user's onFinish
  const composedOnFinish = tracker
    ? async (event) => {
        await Promise.all([
          userOnFinish?.(event),
          this.invokeUsageTracker(tracker, { method: 'stream', event, options }),
        ]);
      }
    : userOnFinish;

  return this.aiAgent.stream({
    ...options,
    onFinish: composedOnFinish,
  });
}
```

### Decision 4: Error Handling - Throw vs Silent

**Choice**: Silent error logging with optional error callback

**Rationale**:
- Tracking failures should NOT break AI generation
- User can opt into error visibility
- Matches telemetry best practices (observability shouldn't crash app)

```typescript
interface UsageTrackingConfig {
  onUsage: UsageTrackingHandler;
  onError?: (error: Error, event: UsageTrackingEvent) => void;
}

// In agent
private async invokeUsageTracker(event: UsageTrackingEvent) {
  const config = getUsageTrackingConfig();
  if (!config) return;

  try {
    await config.onUsage(event);
  } catch (error) {
    if (config.onError) {
      config.onError(error as Error, event);
    } else {
      logger.error('Usage tracking failed', error);
    }
  }
}
```

### Decision 5: Multi-Agent Handoff Tracking

**Choice**: Track each agent individually with handoffChain context

**Rationale**:
- User explicitly requested per-agent tracking in handoffs
- Important for cost attribution in multi-agent workflows
- Preserves full visibility into agent orchestration

```typescript
// In handoff logic
handoffChain.push(currentAgent.name);

// Each agent gets tracked with full chain
{
  agentName: 'technicalSupport',
  handoffChain: ['triage', 'technicalSupport'],
  usage: { ... },
}
```

### Decision 6: Session/Context Propagation

**Choice**: Extract sessionId from executionContext if present

**Rationale**:
- Many apps already pass session identifiers via context
- Automatic extraction reduces boilerplate
- Falls back gracefully if not present

```typescript
private buildUsageEvent(options: {
  method: 'generate' | 'stream';
  result?: AgentGenerateResult;
  event?: unknown;
  context?: Record<string, unknown>;
}): UsageTrackingEvent {
  const executionContext = options.context || {};

  return {
    agentName: this.name,
    sessionId: executionContext.sessionId as string | undefined,
    handoffChain: executionContext._handoffChain as string[] | undefined,
    method: options.method,
    usage: options.result?.usage || (options.event as any)?.usage,
    providerMetadata: options.result?.providerMetadata || (options.event as any)?.providerMetadata,
    finishReason: options.result?.finishReason || (options.event as any)?.finishReason,
    context: executionContext,
  };
}
```

## Type Structure

### Core Types

```typescript
export interface UsageTrackingEvent {
  agentName: string;
  sessionId?: string;
  handoffChain?: string[];
  usage?: LanguageModelUsage;
  providerMetadata?: unknown;
  method: 'generate' | 'stream';
  finishReason?: string;
  duration?: number;
  context?: Record<string, unknown>;
}

export type UsageTrackingHandler = (
  event: UsageTrackingEvent
) => void | Promise<void>;

export interface UsageTrackingConfig {
  onUsage: UsageTrackingHandler;
  onError?: (error: Error, event: UsageTrackingEvent) => void;
}
```

### Configuration API

```typescript
export function configureUsageTracking(
  config: UsageTrackingConfig | UsageTrackingHandler
): void;

export function resetUsageTracking(): void;

export function getUsageTrackingConfig(): UsageTrackingConfig | null;
```

## Risks / Trade-offs

### Risk: Performance Overhead

**Mitigation**:
- Async tracking doesn't block generation
- Check `if (tracker)` early, minimal cost when disabled
- User controls persistence performance

### Risk: Memory Leaks in Long-Running Processes

**Mitigation**:
- Document proper cleanup with `resetUsageTracking()`
- No event buffers or queues (fire-and-forget)
- User responsible for their callback's memory

### Risk: Complex Debugging When Tracking Fails

**Mitigation**:
- Provide `onError` callback for custom error handling
- Default to silent logging with clear error messages
- Document troubleshooting in guide

### Trade-off: Global State vs Pure Functions

**Decision**: Accept global state for DX benefit

**Rationale**:
- Dramatically simplifies user code
- Standard pattern in telemetry/logging libraries
- Easy to test (reset between tests)
- Acceptable for application-level configuration

## Migration Plan

### For New Users

```typescript
// At application startup
configureUsageTracking({
  onUsage: async (event) => {
    await trackingService.recordUsage(event);
  }
});

// Use agents normally
const agent = new Agent({ name: 'Assistant', model, instructions: '...' });
const result = await agent.generate({ prompt: '...' }); // Automatically tracked
```

### For Existing Users

**Backward Compatible**: Existing code works unchanged

**Opt-In Migration**:
```typescript
// Before: Manual tracking
const stream = agent.stream({
  prompt: '...',
  onFinish: async (event) => {
    const usage = extractOpenRouterUsage(event);
    if (usage) {
      await db.usage.create({ cost: usage.cost });
    }
  }
} as any);

// After: Global tracking
configureUsageTracking({
  onUsage: async (event) => {
    const usage = extractOpenRouterUsage({ providerMetadata: event.providerMetadata });
    if (usage) {
      await db.usage.create({ cost: usage.cost });
    }
  }
});

// Then just
const stream = agent.stream({ prompt: '...' }); // Tracked automatically
```

### Rollout Plan

1. **Phase 1**: Implement core tracking infrastructure (this change)
2. **Phase 2**: Add documentation and examples
3. **Phase 3**: Gather feedback, add enhancements (e.g., multi-handler support)
4. **Phase 4**: Consider built-in integrations (Postgres, Redis, etc.) if demanded

## Open Questions

1. **Should we support multiple handlers (array)?**
   - Answer: Start with single, add if users request it

2. **Should we track tool calls separately?**
   - Answer: Not in v1, revisit based on feedback

3. **Should we provide duration tracking?**
   - Answer: Yes, simple Date.now() before/after

4. **Should handoffChain include current agent?**
   - Answer: Yes, for clarity (e.g., ['triage', 'technical'] when technical agent tracks)
