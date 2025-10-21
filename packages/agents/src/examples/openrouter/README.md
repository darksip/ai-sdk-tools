# OpenRouter Integration Examples

This directory contains examples demonstrating how to use OpenRouter with `@fondation-io/agents`.

## Prerequisites

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Configure environment variables**:

   Create a `.env` file in this directory (if not already present):
   ```bash
   cd packages/agents/src/examples/openrouter
   cp .env.example .env
   ```

   Then edit `.env` and add your OpenRouter API key:
   ```
   OPENROUTER_API_KEY=sk-or-v1-...
   ```

   Get your API key from [openrouter.ai](https://openrouter.ai)

   **Note**: All examples automatically load the `.env` file from this directory, so you can run them directly without manually exporting environment variables.

## Examples

### 1. Basic Agent (`basic-agent.ts`)

Simple example showing how to create an agent with an OpenRouter model and extract usage metrics.

```bash
bun run packages/agents/src/examples/openrouter/basic-agent.ts
```

**Demonstrates**:
- Creating an agent with `openrouter('model-id')`
- Extracting usage metrics with `extractOpenRouterUsage()`
- Formatting costs and tokens

### 2. Usage Tracking (`usage-tracking.ts`)

Shows different methods for tracking and formatting usage metrics.

```bash
bun run packages/agents/src/examples/openrouter/usage-tracking.ts
```

**Demonstrates**:
- `extractOpenRouterUsage()` with null checks
- `extractOpenRouterUsageWithDefaults()` for safe extraction
- `summarizeUsage()` for human-readable summaries
- Detailed summaries with token breakdowns

### 3. Streaming Usage (`streaming-usage.ts`)

How to capture usage metrics when using streaming text generation with `streamText()`.

```bash
bun run packages/agents/src/examples/openrouter/streaming-usage.ts
```

**Demonstrates**:
- ✅ CORRECT: Using `onFinish` callback to capture usage
- ❌ WRONG: Trying to access usage directly on result (doesn't work with streaming)

### 4. Agent Streaming Usage (`agent-streaming-usage.ts`)

Shows how to capture usage metrics when using `agent.stream()` method.

```bash
bun run packages/agents/src/examples/openrouter/agent-streaming-usage.ts
```

**Demonstrates**:
- Using `agent.stream()` with `onFinish` callback
- Extracting usage metrics from streaming agent responses
- Real-time cost tracking for agent interactions

### 5. Multi-Model Fallback (`multi-model-fallback.ts`)

Demonstrates OpenRouter's automatic fallback routing across multiple models.

```bash
bun run packages/agents/src/examples/openrouter/multi-model-fallback.ts
```

**Demonstrates**:
- `providerOptions.openrouter.route: 'fallback'`
- Specifying fallback models array
- Automatic model switching on failure

### 6. Prompt Caching (`prompt-caching.ts`)

Shows how to use Anthropic prompt caching via OpenRouter to reduce costs.

```bash
bun run packages/agents/src/examples/openrouter/prompt-caching.ts
```

**Demonstrates**:
- Setting `cacheControl: { type: 'ephemeral' }` on message content
- Accessing `cachedTokens` in usage metadata
- Cost savings from cache hits (~90% reduction)

### 7. Budget Monitoring (`budget-monitoring.ts`)

Tracks cumulative costs across multiple requests with budget enforcement.

```bash
bun run packages/agents/src/examples/openrouter/budget-monitoring.ts
```

**Demonstrates**:
- Creating `UsageAccumulator` with budget limit
- Automatic budget violation detection
- Warning callbacks at 90% budget threshold
- Cumulative usage summaries

## Documentation

For more information, see:

- **Integration Guide**: `/docs/guides/openrouter-native-support.md`
- **Comprehensive Docs**: `/docs/openrouter-integration.md`
- **OpenRouter Docs**: https://openrouter.ai/docs
- **Provider Package**: https://github.com/OpenRouterTeam/ai-sdk-provider

## Common Patterns

### Type-Safe providerOptions

```typescript
import type { OpenRouterProviderOptions } from '@fondation-io/agents';

const options: { openrouter: OpenRouterProviderOptions } = {
  openrouter: {
    route: 'fallback',
    models: ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet'],
    reasoning: { max_tokens: 10 }
  }
};
```

### Extracting Usage

```typescript
// From generateText
const result = await generateText({ model, prompt });
const usage = extractOpenRouterUsage(result);

// From streamText
streamText({
  model,
  prompt,
  onFinish: (event) => {
    const usage = extractOpenRouterUsage(event);
  }
});
```

### Cost Monitoring

```typescript
const accumulator = new UsageAccumulator({ maxCost: 1.00 });

// After each request
accumulator.add(usage);

// Get totals
const total = accumulator.getTotal();
console.log(accumulator.summarize({ detailed: true }));
```

## Model Recommendations

**Cost-effective**:
- `openai/gpt-4o-mini` - Best quality/price ratio
- `openai/gpt-3.5-turbo` - Cheap for simple tasks

**High-quality**:
- `anthropic/claude-3-5-sonnet` - Excellent for code/analysis
- `openai/gpt-4o` - Latest OpenAI model

**Long context**:
- `google/gemini-pro-1.5` - 2M token context window

See full model list: https://openrouter.ai/models
