# OpenRouter Native Support Guide

This guide explains how to use OpenRouter with `@fondation-io/agents` using the native support utilities added in v1.0.0.

## Overview

OpenRouter provides access to 300+ AI models through a single API. The `@fondation-io/agents` package includes type-safe utilities for:

- **Type definitions** for OpenRouter metadata and provider options
- **Usage extraction** helpers for cost and token tracking
- **Usage accumulation** for budget monitoring across requests
- **Formatting utilities** for human-readable output

## Quick Start

### Installation

OpenRouter support is included in `@fondation-io/agents`. Just install the OpenRouter provider:

```bash
bun add @openrouter/ai-sdk-provider
```

### Set API Key

```bash
export OPENROUTER_API_KEY=sk-or-v1-...
```

Get your key from [openrouter.ai](https://openrouter.ai)

### Basic Usage

```typescript
import { openrouter } from '@openrouter/ai-sdk-provider';
import { Agent, extractOpenRouterUsage, formatCost } from '@fondation-io/agents';

const agent = new Agent({
  name: 'Assistant',
  model: openrouter('openai/gpt-4o-mini'),
  instructions: 'You are a helpful assistant.'
});

const result = await agent.generate({
  prompt: 'Explain TypeScript in one sentence.'
});

const usage = extractOpenRouterUsage(result);
if (usage) {
  console.log('Cost:', formatCost(usage.cost));
  console.log('Tokens:', usage.totalTokens);
}
```

## Type Definitions

### OpenRouterUsage

Full usage metrics from OpenRouter API:

```typescript
interface OpenRouterUsage {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  cost: number; // USD
  promptTokensDetails?: {
    cachedTokens?: number; // Anthropic caching
  };
  completionTokensDetails?: {
    reasoningTokens?: number; // O1 models
  };
}
```

### OpenRouterProviderOptions

Type-safe options for `providerOptions.openrouter`:

```typescript
interface OpenRouterProviderOptions {
  reasoning?: { max_tokens: number };  // O1 models
  transforms?: string[];               // Request transforms
  route?: 'fallback';                  // Enable fallback routing
  models?: string[];                   // Fallback model list
  cacheControl?: { type: 'ephemeral' }; // Anthropic caching
}
```

Usage:

```typescript
import type { OpenRouterProviderOptions } from '@fondation-io/agents';

const options: { openrouter: OpenRouterProviderOptions } = {
  openrouter: {
    route: 'fallback',
    models: ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet']
  }
};
```

### Type Guard

Check if metadata contains OpenRouter usage:

```typescript
import { hasOpenRouterUsage } from '@fondation-io/agents';

if (hasOpenRouterUsage(result.providerMetadata)) {
  // TypeScript knows the shape
  console.log(result.providerMetadata.openrouter.usage.cost);
}
```

## Usage Extraction

### extractOpenRouterUsage

Safely extract usage from generation results:

```typescript
import { extractOpenRouterUsage } from '@fondation-io/agents';

// Returns OpenRouterUsage | null
const usage = extractOpenRouterUsage(result);

if (usage) {
  console.log('Cost:', usage.cost);
}
```

Works with both `generateText` and streaming `onFinish` events.

### extractOpenRouterUsageWithDefaults

Extract with fallback values instead of null:

```typescript
import { extractOpenRouterUsageWithDefaults } from '@fondation-io/agents';

const usage = extractOpenRouterUsageWithDefaults(result);

console.log('Present:', usage.present); // boolean
console.log('Cost:', usage.cost);       // 0 if not present
```

## Streaming Usage Tracking

**IMPORTANT**: With streaming, usage is only available in the `onFinish` callback.

### Correct Pattern

```typescript
import { streamText } from 'ai';
import { extractOpenRouterUsage } from '@fondation-io/agents';

let capturedUsage = null;

const result = streamText({
  model: openrouter('openai/gpt-4o'),
  prompt: 'Hello',
  onFinish: (event) => {
    // ✅ Extract usage here
    capturedUsage = extractOpenRouterUsage(event);
  }
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

// ✅ Use captured usage after stream completes
if (capturedUsage) {
  console.log('Cost:', capturedUsage.cost);
}
```

### Wrong Pattern

```typescript
const result = streamText({ model, prompt });

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

// ❌ This is undefined in streaming mode
const usage = extractOpenRouterUsage(result);
```

## Formatting Utilities

### formatCost

Format USD cost values:

```typescript
import { formatCost } from '@fondation-io/agents';

formatCost(0.000123); // "$0.000123"
formatCost(0);        // "$0.000000"
```

### formatTokens

Format token counts with commas:

```typescript
import { formatTokens } from '@fondation-io/agents';

formatTokens(1234);  // "1,234"
formatTokens(0);     // "0"
```

### summarizeUsage

Create human-readable summaries:

```typescript
import { summarizeUsage } from '@fondation-io/agents';

// Simple summary
summarizeUsage(usage);
// "27 tokens ($0.000028)"

// Detailed summary
summarizeUsage(usage, { detailed: true });
// "27 tokens (13 prompt + 14 completion) ($0.000028)"
```

## Budget Monitoring

### UsageAccumulator

Track costs across multiple requests with automatic budget enforcement:

```typescript
import { UsageAccumulator, extractOpenRouterUsage } from '@fondation-io/agents';

const accumulator = new UsageAccumulator({
  maxCost: 1.00, // $1 budget limit
  onBudgetWarning: (remaining) => {
    console.log(`Warning: ${remaining}$ remaining`);
  }
});

for (const prompt of prompts) {
  const result = await streamText({
    model,
    prompt,
    onFinish: (event) => {
      const usage = extractOpenRouterUsage(event);
      if (usage) {
        accumulator.add(usage); // Throws if budget exceeded
      }
    }
  });

  for await (const chunk of result.textStream) {
    // ... consume stream
  }
}

// Get totals
const total = accumulator.getTotal();
console.log('Total cost:', total.cost);
console.log('Requests:', total.requestCount);

// Formatted summary
console.log(accumulator.summarize({ detailed: true }));
```

### Methods

- `add(usage)` - Add usage, throws if budget exceeded
- `getTotal()` - Get cumulative metrics
- `getRemainingBudget()` - Get remaining USD
- `reset()` - Reset all counters
- `summarize(options?)` - Get formatted summary

## Advanced Features

### Multi-Model Fallback

Automatically try multiple models if primary fails:

```typescript
import type { OpenRouterProviderOptions } from '@fondation-io/agents';

const options: { openrouter: OpenRouterProviderOptions } = {
  openrouter: {
    route: 'fallback',
    models: [
      'openai/gpt-4o',
      'anthropic/claude-3-5-sonnet',
      'google/gemini-pro-1.5'
    ]
  }
};

const result = await generateText({
  model: openrouter('openai/gpt-4o'),
  prompt: 'Hello',
  providerOptions: options
});
```

### Prompt Caching

Use Anthropic prompt caching to reduce costs:

```typescript
const messages = [
  {
    role: 'system',
    content: [
      {
        type: 'text',
        text: largeDocumentation,
        experimental_providerMetadata: {
          openrouter: {
            cacheControl: { type: 'ephemeral' }
          }
        }
      }
    ]
  },
  { role: 'user', content: 'Question based on docs' }
];

const result = await generateText({
  model: openrouter('anthropic/claude-3-5-sonnet'),
  messages
});

const usage = extractOpenRouterUsage(result);
if (usage?.promptTokensDetails?.cachedTokens) {
  console.log('Cached tokens:', usage.promptTokensDetails.cachedTokens);
  // Cache hits save ~90% on prompt costs
}
```

## Examples

See working examples in `packages/agents/src/examples/openrouter/`:

- `basic-agent.ts` - Simple agent with usage tracking
- `usage-tracking.ts` - Different extraction methods
- `streaming-usage.ts` - Streaming with onFinish callback
- `multi-model-fallback.ts` - Fallback routing
- `prompt-caching.ts` - Anthropic caching
- `budget-monitoring.ts` - UsageAccumulator

Run examples:

```bash
export OPENROUTER_API_KEY=sk-or-v1-...
bun run packages/agents/src/examples/openrouter/basic-agent.ts
```

## Best Practices

### 1. Always Extract Usage in onFinish for Streaming

```typescript
// ✅ CORRECT
streamText({
  model,
  prompt,
  onFinish: (event) => {
    const usage = extractOpenRouterUsage(event);
  }
});

// ❌ WRONG
const result = streamText({ model, prompt });
const usage = extractOpenRouterUsage(result); // undefined!
```

### 2. Use Type-Safe providerOptions

```typescript
// ✅ Type-safe
import type { OpenRouterProviderOptions } from '@fondation-io/agents';

const options: { openrouter: OpenRouterProviderOptions } = {
  openrouter: { route: 'fallback', models: [...] }
};

// ❌ Untyped (no autocomplete, typos possible)
const options = {
  openrouter: { rout: 'fallback' } // typo!
};
```

### 3. Monitor Budgets for Production

```typescript
const accumulator = new UsageAccumulator({
  maxCost: dailyBudget,
  onBudgetWarning: (remaining) => {
    notifyAdmin(`Budget warning: ${remaining}$ remaining`);
  }
});
```

### 4. Choose Cost-Effective Models

```typescript
// For simple tasks
const cheapModel = openrouter('openai/gpt-4o-mini'); // $0.000013/request

// For complex analysis
const powerfulModel = openrouter('anthropic/claude-3-5-sonnet');
```

## Related Documentation

- **Comprehensive OpenRouter Guide**: `/docs/openrouter-integration.md`
- **OpenRouter API Docs**: https://openrouter.ai/docs
- **Provider Package**: https://github.com/OpenRouterTeam/ai-sdk-provider
- **Available Models**: https://openrouter.ai/models

## Migration from Direct Provider Usage

If you're currently using `@openrouter/ai-sdk-provider` directly without these utilities:

**Before**:
```typescript
const usage = result.providerMetadata?.openrouter?.usage as any;
console.log('Cost:', usage?.cost || 0);
```

**After**:
```typescript
const usage = extractOpenRouterUsage(result);
if (usage) {
  console.log('Cost:', formatCost(usage.cost));
}
```

The utilities are **optional** - your existing code continues to work. Add them incrementally where they provide value.

## FAQ

### Q: Do I need to install anything extra?

A: Just `@openrouter/ai-sdk-provider`. The utilities are included in `@fondation-io/agents`.

### Q: Will this work with other providers?

A: No, these utilities are OpenRouter-specific. Other providers have different metadata structures.

### Q: What if OpenRouter metadata is missing?

A: `extractOpenRouterUsage()` returns `null`. Use `extractOpenRouterUsageWithDefaults()` for fallback values.

### Q: Can I use this with the standard AI SDK?

A: Yes! The utilities work with both `generateText`/`streamText` and `Agent.generate()`.

### Q: What models should I use?

A: For most tasks, `openai/gpt-4o-mini` offers the best quality/cost ratio. See [model recommendations](https://openrouter.ai/models).
