# Usage Tracking Examples

This directory contains comprehensive examples demonstrating global usage tracking configuration for automatic cost and token monitoring across all agent operations.

## Examples Overview

### 1. Basic Tracking (`basic-tracking.ts`)
**Provider**: OpenAI
**Focus**: Simple console logging

Demonstrates the fundamentals of global usage tracking with minimal setup. Shows how to configure tracking once and have it automatically apply to all `agent.generate()` and `agent.stream()` calls.

**Key Features**:
- Simple callback configuration
- Token usage display
- Duration tracking
- Basic event structure

**Run**:
```bash
bun run src/examples/usage-tracking/basic-tracking.ts
```

---

### 2. OpenRouter Cost Tracking (`openrouter-cost-tracking.ts`)
**Provider**: OpenRouter
**Focus**: Real-time cost monitoring with budget alerts

Advanced example showing OpenRouter-specific cost tracking with budget management. Demonstrates how to extract detailed cost information, track cache savings, and implement budget warnings.

**Key Features**:
- Real-time cost calculation
- Budget monitoring with alerts
- Cost breakdown by agent
- Cache token tracking (Anthropic models)
- Reasoning token tracking (O1 models)
- Formatted cost and token display
- Budget threshold warnings (80%, 100%)

**Run**:
```bash
bun run src/examples/usage-tracking/openrouter-cost-tracking.ts
```

**Sample Output**:
```
📊 OPENROUTER USAGE TRACKING
============================================================

🤖 Agent: FastAgent
📋 Method: generate

💰 Cost Breakdown:
   Current Request: $0.000015
   Session Total: $0.000015
   Budget Used: 0.2%
   Remaining: $9.999985

📈 Tokens:
   Total: 150
   Prompt: 100
   Completion: 50

📝 Summary: Used 150 tokens ($0.000015)
============================================================
```

---

### 3. Database Persistence (`database-persistence.ts`)
**Provider**: OpenRouter
**Focus**: PostgreSQL/MySQL persistence with cost extraction

Production-ready example showing how to persist usage metrics to a database. Demonstrates async tracking, error handling, and integration with OpenRouter cost extraction.

**Key Features**:
- Async database persistence (simulated)
- OpenRouter cost extraction
- Session and user context tracking
- Custom error handling
- Production-ready patterns

**Use Cases**:
- Cost attribution to users
- Historical usage analytics
- Billing data collection
- Audit trail creation

**Run**:
```bash
bun run src/examples/usage-tracking/database-persistence.ts
```

---

### 4. Multi-Agent Tracking (`multi-agent-tracking.ts`)
**Provider**: OpenRouter
**Focus**: Multi-agent handoff workflows with cost attribution

Comprehensive example showing usage tracking in multi-agent orchestration scenarios. Demonstrates how each agent in a handoff chain is tracked separately with full cost attribution.

**Key Features**:
- Per-agent cost tracking
- Handoff chain visualization
- Cost breakdown by agent
- Total workflow cost calculation
- Different models for different agents (cost optimization)

**Agent Setup**:
- **Triage Agent**: GPT-3.5 (cheap, fast routing)
- **TechnicalSupport**: GPT-4 (expensive, capable)
- **Billing**: GPT-3.5 (sufficient for simple queries)

**Run**:
```bash
bun run src/examples/usage-tracking/multi-agent-tracking.ts
```

**Sample Output**:
```
📊 USAGE EVENT
==================================================

🤖 Agent: TechnicalSupport
🔄 Handoff Chain: Triage → TechnicalSupport
📋 Method: generate

📈 Tokens: 250
💰 Cost: $0.000125

💵 Session Total: $0.000140
==================================================

📊 FINAL COST SUMMARY
==================================================

💰 Total Workflow Cost: $0.000140

💵 Cost by Agent:
   Triage: $0.000015 (10.7%)
   TechnicalSupport: $0.000125 (89.3%)

✅ Multi-agent workflow complete!
   Each agent tracked separately with full handoff chain context.
   Costs attributed to each agent for accurate billing.
```

---

## Common Patterns

### Extract OpenRouter Costs
```typescript
import { extractOpenRouterUsage, formatCost } from '@fondation-io/agents';

configureUsageTracking((event) => {
  const openRouterUsage = extractOpenRouterUsage({
    providerMetadata: event.providerMetadata
  });

  if (openRouterUsage) {
    console.log(`Cost: ${formatCost(openRouterUsage.cost)}`);
  }
});
```

### Budget Monitoring
```typescript
let totalCost = 0;
const DAILY_BUDGET = 10.0;

configureUsageTracking((event) => {
  const usage = extractOpenRouterUsage({ providerMetadata: event.providerMetadata });
  if (usage) {
    totalCost += usage.cost;

    if (totalCost >= DAILY_BUDGET) {
      console.error('🚨 BUDGET EXCEEDED!');
    }
  }
});
```

### Per-Agent Cost Attribution
```typescript
const agentCosts = new Map<string, number>();

configureUsageTracking((event) => {
  const usage = extractOpenRouterUsage({ providerMetadata: event.providerMetadata });
  if (usage) {
    const current = agentCosts.get(event.agentName) || 0;
    agentCosts.set(event.agentName, current + usage.cost);
  }
});
```

### Session-Based Tracking
```typescript
const sessionCosts = new Map<string, number>();

configureUsageTracking((event) => {
  const sessionId = event.sessionId || 'default';
  const usage = extractOpenRouterUsage({ providerMetadata: event.providerMetadata });

  if (usage) {
    const current = sessionCosts.get(sessionId) || 0;
    sessionCosts.set(sessionId, current + usage.cost);
  }
});
```

## Requirements

### 1. Install Dependencies

All examples require the AI SDK and provider packages:

```bash
# For OpenAI examples
npm install @ai-sdk/openai

# For OpenRouter examples
npm install @openrouter/ai-sdk-provider
```

### 2. Configure Environment Variables

Create a `.env` file in this directory (if not already present):

```bash
cd packages/agents/src/examples/usage-tracking
cp .env.example .env
```

Then edit `.env` and add your API keys:

```
OPENAI_API_KEY=sk-your-openai-key-here
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key-here
```

Get your API keys from:
- OpenAI: https://platform.openai.com/api-keys
- OpenRouter: https://openrouter.ai/keys

**Note**: All examples automatically load the `.env` file from this directory, so you can run them directly without manually exporting environment variables.

## See Also

- **Complete Guide**: `/packages/agents/docs/guides/usage-tracking-configuration.md`
- **API Reference**: `/packages/agents/README.md#usage-tracking`
- **CHANGELOG**: `/packages/agents/CHANGELOG.md`
