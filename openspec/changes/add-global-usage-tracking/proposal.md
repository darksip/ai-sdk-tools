# Proposal: Global Usage Tracking Configuration

## Summary

Add a global configuration system for automatic usage tracking across all agents, eliminating the need to inject tracking callbacks on every agent instance or generation call.

## Why

Production AI applications require systematic usage tracking for:
- **Cost Monitoring**: Track token usage and costs across all agents in real-time
- **Billing**: Attribute costs to specific users, sessions, or workflows
- **Analytics**: Understand usage patterns for optimization
- **Budget Enforcement**: Prevent runaway costs in production

Currently, implementing this requires repetitive boilerplate code on every single `agent.generate()` and `agent.stream()` call. This creates:
- **Maintenance burden**: Changes to tracking logic must be replicated everywhere
- **Error-prone code**: Easy to forget tracking in new agent implementations
- **Inconsistent tracking**: Different agents may track differently
- **Poor DX**: Significant code duplication and setup friction

This change solves the problem by allowing developers to configure tracking once at application startup, then have it automatically apply to all agent operations. This matches patterns from logging, telemetry, and monitoring libraries where global configuration is standard.

## Problem

Currently, tracking usage metrics (tokens, costs) with agents requires:
1. Manual `onFinish` callback injection on every `agent.stream()` call
2. Manual usage extraction after every `agent.generate()` call
3. Repetitive code for persisting or logging usage metrics
4. No automatic tracking in multi-agent handoff scenarios

This creates friction for production applications that need systematic usage tracking for cost monitoring, analytics, or billing.

## Proposed Solution

Introduce a **global usage tracking configuration** that:
- Accepts a generic callback function receiving usage metadata
- Automatically invokes the callback after `agent.generate()` and in `agent.stream()` onFinish
- Tracks usage across multi-agent handoffs
- Works with any AI provider (not just OpenRouter)
- Provides provider metadata + contextual information (agent name, session ID, etc.)

## Goals

1. **Eliminate Repetition**: Configure usage tracking once, apply everywhere
2. **Provider Agnostic**: Work with OpenRouter, OpenAI, Anthropic, or any provider
3. **Contextual**: Include agent name, handoff chain, and custom context in tracking
4. **Non-Invasive**: Optional feature that doesn't change existing APIs
5. **Composable**: Allow multiple tracking handlers (logging + persistence + monitoring)

## Non-Goals

- **Not** replacing manual usage tracking (should coexist)
- **Not** enforcing a specific persistence mechanism (DB, Redis, etc.)
- **Not** adding built-in analytics or dashboards
- **Not** modifying AI SDK's core streaming/generation behavior

## Approach

### Configuration API

```typescript
import { configureUsageTracking } from '@fondation-io/agents';

// Global configuration
configureUsageTracking({
  onUsage: async (event: UsageTrackingEvent) => {
    // Save to database
    await db.usage.create({
      agentName: event.agentName,
      sessionId: event.sessionId,
      tokens: event.usage.totalTokens,
      cost: event.providerMetadata?.openrouter?.usage.cost,
      timestamp: new Date(),
    });
  }
});
```

### Usage Tracking Event

```typescript
interface UsageTrackingEvent {
  // Context
  agentName: string;
  sessionId?: string;
  handoffChain?: string[]; // For multi-agent tracking

  // Metrics
  usage: LanguageModelUsage; // Standard AI SDK usage
  providerMetadata?: unknown; // Provider-specific data

  // Generation details
  method: 'generate' | 'stream';
  finishReason?: string;
  duration?: number;

  // Custom context (if provided)
  context?: Record<string, unknown>;
}
```

### Integration Points

1. **Agent.generate()**: Invoke callback after successful generation
2. **Agent.stream()**: Inject into `onFinish` callback automatically
3. **Handoffs**: Track each agent in handoff chain separately

## User Impact

### Before (repetitive)

```typescript
const agent = new Agent({ name: 'Assistant', model, instructions: '...' });

// Have to do this on every call
const result = await agent.generate({ prompt: '...' });
const usage = extractOpenRouterUsage(result);
if (usage) {
  await db.usage.create({ agentName: agent.name, cost: usage.cost });
}

// And this for streaming
const stream = agent.stream({
  prompt: '...',
  onFinish: async (event) => {
    const usage = extractOpenRouterUsage(event);
    if (usage) {
      await db.usage.create({ agentName: agent.name, cost: usage.cost });
    }
  }
} as any);
```

### After (configured once)

```typescript
// Configure once at app startup
configureUsageTracking({
  onUsage: async (event) => {
    await db.usage.create({
      agentName: event.agentName,
      cost: event.providerMetadata?.openrouter?.usage.cost,
    });
  }
});

// Then just use agents normally
const result = await agent.generate({ prompt: '...' }); // Tracked automatically
const stream = agent.stream({ prompt: '...' }); // Tracked automatically
```

## Success Criteria

1. ✅ Zero-config tracking after global setup
2. ✅ Works with all AI providers
3. ✅ Tracks multi-agent handoffs
4. ✅ Backward compatible (existing code unaffected)
5. ✅ Type-safe tracking event structure
6. ✅ Async callback support for DB/API calls
7. ✅ Error isolation (tracking failures don't break generation)

## Risks & Mitigations

### Risk: Performance Impact
**Mitigation**: Make tracking async and non-blocking; add opt-out mechanism

### Risk: Memory Leaks
**Mitigation**: Document proper cleanup; provide helper to reset global config

### Risk: Complex Multi-Handler Logic
**Mitigation**: Start with single handler; add array support if demanded

## Alternatives Considered

### Alternative 1: Agent-Level Configuration
**Rejected**: Requires repetition across all agent instances

### Alternative 2: Middleware Pattern
**Rejected**: More complex API; harder to configure globally

### Alternative 3: Event Emitter System
**Considered**: Could support multiple listeners naturally, but adds complexity upfront

## Open Questions

1. Should we support multiple concurrent tracking handlers?
   - **Answer**: Start with single handler, add array support if needed

2. Should tracking failures throw or silently log?
   - **Answer**: Silent logging with optional error callback

3. Should we track tool calls separately?
   - **Answer**: Not in v1; add later if demanded
