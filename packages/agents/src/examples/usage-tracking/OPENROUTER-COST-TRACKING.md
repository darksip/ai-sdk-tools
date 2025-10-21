# OpenRouter Cost Tracking - Important Configuration

## ⚠️ Required Configuration

When using OpenRouter with the global usage tracking system, you **MUST** enable usage accounting on the model to receive cost information:

```typescript
import { openrouter } from '@openrouter/ai-sdk-provider';

const model = openrouter('anthropic/claude-3.5-haiku', {
  usage: { include: true }  // ← REQUIRED for cost tracking
});
```

## Why is this required?

OpenRouter provides cost information in two different ways:

1. **Without `usage: { include: true }`**:
   - Only provides `costDetails.upstreamInferenceCost` (often 0)
   - No `cost` field in metadata
   - ❌ **Cost tracking will show $0**

2. **With `usage: { include: true }`**:
   - Provides accurate `cost` field in metadata
   - ✅ **Cost tracking works correctly**

## Complete Example

```typescript
import { Agent, configureUsageTracking, extractOpenRouterUsage } from '@fondation-io/agents';
import { openrouter } from '@openrouter/ai-sdk-provider';

// Configure global tracking
configureUsageTracking({
  onUsage: async (event) => {
    const usage = extractOpenRouterUsage({
      providerMetadata: event.providerMetadata,
    });

    if (usage) {
      console.log(`Cost: ${usage.cost}`);
      console.log(`Tokens: ${usage.totalTokens}`);
    }
  }
});

// Create agent with OpenRouter model (note the usage flag!)
const agent = new Agent({
  name: 'Assistant',
  model: openrouter('anthropic/claude-3.5-haiku', {
    usage: { include: true }  // ← REQUIRED
  }),
  instructions: 'You are a helpful assistant.',
});

// Usage tracking works automatically
await agent.generate({ prompt: 'Hello!' });
```

## Other Providers

This configuration is **specific to OpenRouter**. Other providers like OpenAI, Anthropic, Google, etc. do not require this flag (though they generally don't provide cost information in metadata either).

## Troubleshooting

If you see `$0.000000` costs in your tracking:

1. ✅ Check you added `usage: { include: true }` to the model config
2. ✅ Verify you're using `openrouter` from `@openrouter/ai-sdk-provider`
3. ✅ Check your OpenRouter API key is valid and has credit
4. ✅ Ensure you imported `openrouter` (not `createOpenRouter`)

## Examples

All examples in this directory demonstrate proper OpenRouter cost tracking:

- ✅ `openrouter-cost-tracking.ts` - Real-time cost monitoring with budget alerts
- ✅ `multi-agent-tracking.ts` - Multi-agent workflows with per-agent cost attribution
- ✅ `database-persistence.ts` - PostgreSQL/MySQL persistence with OpenRouter costs

All examples use `usage: { include: true }` on their OpenRouter models.
