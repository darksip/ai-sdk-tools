# Usage Tracking Configuration Guide

## Overview

Global usage tracking allows you to automatically track token usage, costs, and metadata across all agent operations without manually injecting callbacks on every `generate()` or `stream()` call.

This is essential for production applications that need:
- **Cost monitoring** - Track token usage and costs in real-time
- **Billing** - Attribute costs to specific users or sessions
- **Analytics** - Understand usage patterns for optimization
- **Budget enforcement** - Prevent runaway costs

## Quick Start

Configure tracking once at application startup:

```typescript
import { configureUsageTracking } from '@fondation-io/agents';

configureUsageTracking((event) => {
  console.log(`Agent ${event.agentName} used ${event.usage?.totalTokens} tokens`);
});
```

That's it! All agent operations will now automatically track usage.

## Configuration API

### `configureUsageTracking(config)`

Configures global usage tracking for all agents.

**Parameters:**

- `config` - Either a `UsageTrackingHandler` function or a full `UsageTrackingConfig` object

**Handler Function (Simple):**

```typescript
configureUsageTracking((event: UsageTrackingEvent) => {
  // Your tracking logic here
  console.log(event);
});
```

**Full Configuration (with error handling):**

```typescript
configureUsageTracking({
  onUsage: async (event) => {
    await trackingService.record(event);
  },
  onError: (error, event) => {
    console.error('Tracking failed:', error);
  }
});
```

### `resetUsageTracking()`

Resets the global usage tracking configuration. Useful for testing or when you need to disable tracking.

```typescript
import { resetUsageTracking } from '@fondation-io/agents';

resetUsageTracking();
```

## Usage Tracking Event

The `UsageTrackingEvent` object contains comprehensive information about each agent operation:

```typescript
interface UsageTrackingEvent {
  // Context
  agentName: string;              // Name of the agent that ran
  sessionId?: string;             // Session ID from execution context
  handoffChain?: string[];        // Chain of agents in handoff workflow

  // Metrics
  usage?: LanguageModelUsage;     // Standard AI SDK usage (tokens)
  providerMetadata?: unknown;     // Provider-specific data (e.g., OpenRouter cost)

  // Metadata
  method: 'generate' | 'stream';  // Which method was called
  finishReason?: string;          // Why generation finished
  duration?: number;              // Duration in ms (generate() only)

  // Context
  context?: Record<string, unknown>; // Execution context passed to agent
}
```

### Standard AI SDK Usage Fields

```typescript
event.usage = {
  totalTokens: 150,
  promptTokens: 100,
  completionTokens: 50
}
```

### Provider-Specific Metadata

Different providers include different metadata:

#### OpenRouter
```typescript
import { extractOpenRouterUsage } from '@fondation-io/agents';

configureUsageTracking((event) => {
  const openRouterUsage = extractOpenRouterUsage({
    providerMetadata: event.providerMetadata
  });

  if (openRouterUsage) {
    console.log(`Cost: $${openRouterUsage.cost}`);
    console.log(`Model: ${openRouterUsage.model}`);
  }
});
```

#### Other Providers
```typescript
// For OpenAI, Anthropic, etc., use the standard usage fields
configureUsageTracking((event) => {
  console.log(`Tokens: ${event.usage?.totalTokens}`);
  // Provider metadata structure varies by provider
});
```

## Common Use Cases

### 1. Database Persistence

Save usage metrics to a database for analytics:

```typescript
import { configureUsageTracking, extractOpenRouterUsage } from '@fondation-io/agents';

configureUsageTracking({
  onUsage: async (event) => {
    const openRouterUsage = extractOpenRouterUsage({
      providerMetadata: event.providerMetadata
    });

    await db.usage.create({
      agentName: event.agentName,
      sessionId: event.sessionId,
      userId: event.context?.userId,
      tokens: event.usage?.totalTokens || 0,
      cost: openRouterUsage?.cost || 0,
      timestamp: new Date(),
      method: event.method,
      finishReason: event.finishReason,
    });
  },
  onError: (error, event) => {
    console.error('Failed to save usage:', error);
    // Log to error tracking service
  }
});
```

### 2. Real-Time Cost Monitoring

Track costs in real-time and alert on high usage:

```typescript
let dailyCost = 0;

configureUsageTracking((event) => {
  const usage = extractOpenRouterUsage({
    providerMetadata: event.providerMetadata
  });

  if (usage?.cost) {
    dailyCost += usage.cost;

    if (dailyCost > 100) {
      alertTeam(`Daily cost exceeded $100: currently at $${dailyCost}`);
    }
  }
});
```

### 3. User-Level Budget Enforcement

Track and enforce per-user budgets:

```typescript
const userBudgets = new Map<string, number>();

configureUsageTracking({
  onUsage: async (event) => {
    const userId = event.context?.userId as string;
    if (!userId) return;

    const usage = extractOpenRouterUsage({
      providerMetadata: event.providerMetadata
    });

    if (usage?.cost) {
      const currentUsage = userBudgets.get(userId) || 0;
      userBudgets.set(userId, currentUsage + usage.cost);

      // Check budget
      if (currentUsage + usage.cost > USER_BUDGET_LIMIT) {
        await notifyUser(userId, 'Budget limit reached');
      }
    }
  }
});
```

### 4. Multi-Agent Workflow Analytics

Track which agents are used most frequently in handoff workflows:

```typescript
const agentStats = new Map<string, { calls: number, tokens: number }>();

configureUsageTracking((event) => {
  const stats = agentStats.get(event.agentName) || { calls: 0, tokens: 0 };

  stats.calls += 1;
  stats.tokens += event.usage?.totalTokens || 0;

  agentStats.set(event.agentName, stats);

  // Log handoff chains for workflow analysis
  if (event.handoffChain && event.handoffChain.length > 0) {
    console.log(`Handoff chain: ${event.handoffChain.join(' → ')} → ${event.agentName}`);
  }
});
```

## Session and Context Tracking

Usage events automatically extract `sessionId` from the execution context:

```typescript
const result = await agent.generate({
  prompt: "Hello",
  context: {
    sessionId: "session-123",
    userId: "user-456",
    // ... other context
  } as any
});

// The tracking event will include:
// event.sessionId = "session-123"
// event.context = { sessionId: "session-123", userId: "user-456", ... }
```

## Multi-Agent Handoff Tracking

When agents hand off to each other, each agent is tracked separately with the full handoff chain:

```typescript
const triage = new Agent({
  name: "Triage",
  handoffs: [technicalSupport, billing],
  // ...
});

// When user asks a question:
await triage.generate({ prompt: "How do I reset my password?" });

// Tracking events emitted:
// 1. { agentName: "Triage", handoffChain: [] }
// 2. { agentName: "TechnicalSupport", handoffChain: ["Triage"] }
```

The `handoffChain` field shows which agents were involved before the current agent executed.

## Error Handling

Tracking failures should never break your agent operations. The system handles errors gracefully:

### Default Behavior

By default, tracking errors are logged but don't throw:

```typescript
configureUsageTracking(async (event) => {
  // If this throws, error is logged but generation succeeds
  await flaky Database.save(event);
});
```

### Custom Error Handling

Provide an `onError` callback for custom error handling:

```typescript
configureUsageTracking({
  onUsage: async (event) => {
    await database.save(event);
  },
  onError: (error, event) => {
    // Log to error tracking service
    Sentry.captureException(error, {
      extra: { event }
    });

    // Retry logic
    await retryQueue.add(() => database.save(event));
  }
});
```

## Performance Considerations

### Async Execution

Tracking callbacks are executed asynchronously and don't block agent responses:

```typescript
configureUsageTracking(async (event) => {
  // This runs in the background, doesn't delay response
  await slowDatabase.insert(event);
});
```

### Fire-and-Forget

For `generate()`, tracking happens after the result is returned to the user. For `stream()`, tracking happens in the `onFinish` callback.

## Testing

Reset tracking configuration between tests:

```typescript
import { resetUsageTracking } from '@fondation-io/agents';

describe('Agent tests', () => {
  afterEach(() => {
    resetUsageTracking();
  });

  it('tracks usage', () => {
    const events: UsageTrackingEvent[] = [];

    configureUsageTracking((event) => {
      events.push(event);
    });

    // ... test agent operations

    expect(events).toHaveLength(1);
    expect(events[0].agentName).toBe('TestAgent');
  });
});
```

## Troubleshooting

### No events being tracked

**Check:**
1. Did you call `configureUsageTracking()` before creating agents?
2. Is your callback actually being invoked? Add a console.log to verify.
3. Are you awaiting the agent operations?

### Missing sessionId or context

**Check:**
1. Are you passing `context` to the agent method?
2. Does the context include a `sessionId` field?

```typescript
// ✅ Correct
await agent.generate({
  prompt: "...",
  context: { sessionId: "session-123" } as any
});

// ❌ Missing context
await agent.generate({ prompt: "..." });
```

### Provider metadata is undefined

**Check:**
1. Some providers may not include metadata in all responses
2. Metadata structure varies by provider (check provider docs)
3. For OpenRouter, use `extractOpenRouterUsage()` helper

### Tracking errors breaking generation

**This should never happen!** If it does:
1. Make sure you're using the latest version of `@fondation-io/agents`
2. Report the issue on GitHub

## Examples

See complete examples in the `src/examples/usage-tracking/` directory:

### General Examples
- `basic-tracking.ts` - Simple console logging (OpenAI)

### OpenRouter Examples
- `openrouter-cost-tracking.ts` - Real-time cost monitoring with budget alerts and model comparison
- `database-persistence.ts` - PostgreSQL/MySQL persistence with OpenRouter cost extraction
- `multi-agent-tracking.ts` - Multi-agent handoff workflows with per-agent cost attribution

**Note**: OpenRouter examples demonstrate detailed cost tracking, model usage breakdown, cache savings, and budget monitoring features specific to OpenRouter's rich metadata.

## API Reference

### Types

```typescript
export interface UsageTrackingEvent { /* ... */ }
export type UsageTrackingHandler = (event: UsageTrackingEvent) => void | Promise<void>;
export interface UsageTrackingConfig {
  onUsage: UsageTrackingHandler;
  onError?: (error: Error, event: UsageTrackingEvent) => void;
}
```

### Functions

```typescript
export function configureUsageTracking(
  config: UsageTrackingConfig | UsageTrackingHandler
): void;

export function resetUsageTracking(): void;
```
