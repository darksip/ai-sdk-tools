# Intégration OpenRouter avec AI SDK v5

> **📚 Guide d'intégration**
>
> Ce document explique comment utiliser le provider OpenRouter avec AI SDK v5 dans vos applications, y compris avec les packages [@fondation-io/ai-sdk-tools](https://github.com/darksip/ai-sdk-tools).

> **🆕 Native Support Update**
>
> `@fondation-io/agents` now includes native OpenRouter utilities for type-safe usage tracking and budget monitoring!
> See the [Native Support Guide](/docs/guides/openrouter-native-support.md) for the simplified API.

## Vue d'ensemble

OpenRouter est un provider qui donne accès à **plus de 300 modèles de langage** via une API unifiée compatible avec AI SDK v5. Il permet d'utiliser des modèles de différents fournisseurs (OpenAI, Anthropic, Google, Meta, etc.) avec une seule clé API.

**Avantages**:
- ✅ Accès à 300+ modèles via une seule API
- ✅ Fallback automatique entre modèles
- ✅ Tarification transparente et compétitive
- ✅ Support complet d'AI SDK v5
- ✅ Prompt caching (Anthropic)
- ✅ Usage tracking intégré
- ✅ **Type-safe utilities in @fondation-io/agents**

**Repository**: https://github.com/OpenRouterTeam/ai-sdk-provider
**NPM**: `@openrouter/ai-sdk-provider`
**License**: Apache-2.0

**Native Support**: See `/docs/guides/openrouter-native-support.md` for type-safe utilities and examples.

---

## Installation

### AI SDK v5 (version actuelle)

```bash
# npm
npm install @openrouter/ai-sdk-provider

# pnpm
pnpm add @openrouter/ai-sdk-provider

# yarn
yarn add @openrouter/ai-sdk-provider

# bun
bun add @openrouter/ai-sdk-provider
```

### AI SDK v4 (legacy)

Si vous utilisez encore AI SDK v4:

```bash
npm install @openrouter/ai-sdk-provider@ai-sdk-v4
```

---

## Configuration

### 1. Obtenir une clé API

1. Créer un compte sur [openrouter.ai](https://openrouter.ai)
2. Générer une clé API dans les settings
3. Ajouter à vos variables d'environnement

```bash
# .env.local
OPENROUTER_API_KEY=sk-or-v1-...
```

### 2. Import et setup de base

```typescript
import { openrouter } from '@openrouter/ai-sdk-provider'
```

Le provider utilise automatiquement `process.env.OPENROUTER_API_KEY` si défini.

### 3. Configuration personnalisée (optionnel)

```typescript
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

const openrouter = createOpenRouter({
  apiKey: 'your-api-key', // Override env var
  baseURL: 'https://openrouter.ai/api/v1', // Custom endpoint
  headers: {
    'HTTP-Referer': 'https://yourapp.com',
    'X-Title': 'Your App Name'
  }
})
```

---

## Usage de base

### Génération de texte simple

```typescript
import { openrouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'

const { text } = await generateText({
  model: openrouter('openai/gpt-4o'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.'
})

console.log(text)
```

### Streaming de texte

```typescript
import { openrouter } from '@openrouter/ai-sdk-provider'
import { streamText } from 'ai'

const result = streamText({
  model: openrouter('anthropic/claude-3-5-sonnet'),
  prompt: 'Explain quantum computing in simple terms.'
})

for await (const chunk of result.textStream) {
  process.stdout.write(chunk)
}
```

### Génération d'objets structurés

```typescript
import { openrouter } from '@openrouter/ai-sdk-provider'
import { generateObject } from 'ai'
import { z } from 'zod'

const { object } = await generateObject({
  model: openrouter('openai/gpt-4o'),
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(z.string()),
      steps: z.array(z.string())
    })
  }),
  prompt: 'Generate a recipe for chocolate chip cookies.'
})

console.log(object.recipe)
```

---

## Modèles disponibles

OpenRouter donne accès à des centaines de modèles. Voici les plus populaires:

### OpenAI

```typescript
openrouter('openai/gpt-4o')              // GPT-4 Omni
openrouter('openai/gpt-4o-mini')         // GPT-4 Omni Mini
openrouter('openai/gpt-4-turbo')         // GPT-4 Turbo
openrouter('openai/gpt-3.5-turbo')       // GPT-3.5 Turbo
openrouter('openai/o1-preview')          // O1 Preview
openrouter('openai/o1-mini')             // O1 Mini
```

### Anthropic

```typescript
openrouter('anthropic/claude-3-5-sonnet')        // Claude 3.5 Sonnet
openrouter('anthropic/claude-3-opus')            // Claude 3 Opus
openrouter('anthropic/claude-3-sonnet')          // Claude 3 Sonnet
openrouter('anthropic/claude-3-haiku')           // Claude 3 Haiku
```

### Google

```typescript
openrouter('google/gemini-pro-1.5')              // Gemini 1.5 Pro
openrouter('google/gemini-flash-1.5')            // Gemini 1.5 Flash
openrouter('google/gemini-2.0-flash-exp')        // Gemini 2.0 Flash (experimental)
```

### Meta

```typescript
openrouter('meta-llama/llama-3.3-70b-instruct')  // Llama 3.3 70B
openrouter('meta-llama/llama-3.1-405b-instruct') // Llama 3.1 405B
openrouter('meta-llama/llama-3.1-70b-instruct')  // Llama 3.1 70B
```

### Mistral

```typescript
openrouter('mistralai/mistral-large')            // Mistral Large
openrouter('mistralai/mistral-medium')           // Mistral Medium
openrouter('mistralai/mixtral-8x7b-instruct')    // Mixtral 8x7B
```

### Liste complète

Voir tous les modèles disponibles sur: https://openrouter.ai/models

Filtrer les modèles supportant les tools: https://openrouter.ai/models?supports=tools

---

## Paramètres avancés

### Méthode 1: Provider Options (par requête)

Passer des paramètres spécifiques OpenRouter pour une requête donnée:

```typescript
import { streamText } from 'ai'

const result = await streamText({
  model: openrouter('openai/gpt-4o'),
  messages: [
    { role: 'user', content: 'Explain relativity' }
  ],
  providerOptions: {
    openrouter: {
      // Paramètres spécifiques OpenRouter
      reasoning: { max_tokens: 10 },
      transforms: ['middle-out'],
      route: 'fallback',
      models: [
        'openai/gpt-4o',
        'anthropic/claude-3-5-sonnet'
      ]
    }
  }
})
```

**Options disponibles**:
- `reasoning`: Configuration du raisonnement (pour modèles O1)
- `transforms`: Transformations de requête
- `route`: Stratégie de routage (`fallback` pour essayer plusieurs modèles)
- `models`: Liste de modèles en fallback

### Méthode 2: Model Settings (au niveau modèle)

Configurer le modèle avec des paramètres permanents:

```typescript
const model = openrouter('openai/gpt-4o', {
  extraBody: {
    reasoning: { max_tokens: 10 },
    transforms: ['middle-out']
  }
})

// Tous les appels avec ce modèle utiliseront ces params
const result = await generateText({
  model,
  prompt: 'Hello'
})
```

### Méthode 3: Factory Configuration (globale)

Configurer le provider avec des valeurs par défaut:

```typescript
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  extraBody: {
    reasoning: { max_tokens: 10 }
  },
  headers: {
    'HTTP-Referer': 'https://yourapp.com',
    'X-Title': 'Your App'
  }
})

// Tous les modèles créés avec cette factory héritent de la config
const model = openrouter('openai/gpt-4o')
```

---

## Anthropic Prompt Caching

OpenRouter supporte le prompt caching d'Anthropic pour réduire les coûts et la latence sur les prompts répétés.

### Activation du cache

```typescript
import { generateText } from 'ai'

const largeSystemPrompt = `
  [Votre long prompt système ici - ex: documentation complète]
  ${/* ... 10000+ tokens ... */}
`

const result = await generateText({
  model: openrouter('anthropic/claude-3-5-sonnet'),
  messages: [
    {
      role: 'system',
      content: [
        {
          type: 'text',
          text: largeSystemPrompt,
          providerOptions: {
            openrouter: {
              cacheControl: { type: 'ephemeral' }
            }
          }
        }
      ]
    },
    {
      role: 'user',
      content: 'Answer based on the documentation above'
    }
  ]
})
```

**Avantages**:
- ✅ Réduction des coûts (cache hits ~90% moins chers)
- ✅ Latence réduite (pas de retraitement du prompt)
- ✅ TTL automatique (5 minutes par défaut)

**Use cases**:
- Documentation technique longue
- Context de RAG important
- Exemples few-shot volumineux
- System prompts complexes

---

## Usage Tracking

**🎉 Bonne nouvelle** : OpenRouter fournit **TOUJOURS** des métriques détaillées sur l'utilisation et les coûts, que vous l'ayez explicitement demandé ou non.

### Accès aux métriques (generateText)

```typescript
const model = openrouter('openai/gpt-3.5-turbo')
// Pas besoin de { usage: { include: true } }

const result = await generateText({
  model,
  prompt: 'Write a haiku about AI'
})

// Accès aux métriques - TOUJOURS disponibles
const usage = result.providerMetadata?.openrouter?.usage

console.log('Tokens utilisés:', usage.totalTokens)
console.log('Coût total:', usage.cost)
console.log('Prompt tokens:', usage.promptTokens)
console.log('Completion tokens:', usage.completionTokens)
```

### Accès aux métriques (streamText) - IMPORTANT

**⚠️ Avec streaming, utilisez le callback `onFinish`** :

```typescript
const model = openrouter('openai/gpt-3.5-turbo')

// Variable pour capturer les métriques
let usage: any = null

const result = streamText({
  model,
  prompt: 'Write a haiku about AI',
  onFinish: (event) => {
    // ✅ Les métriques sont disponibles ici
    usage = event.providerMetadata?.openrouter?.usage
  }
})

// Consommer le stream
for await (const chunk of result.textStream) {
  process.stdout.write(chunk)
}

// Utiliser les métriques après le stream
console.log('Coût:', usage?.cost)
console.log('Tokens:', usage?.totalTokens)
```

### Structure des métriques

```typescript
interface OpenRouterUsage {
  totalTokens: number              // Total tokens utilisés
  promptTokens: number             // Tokens du prompt
  completionTokens: number         // Tokens générés
  cost: number                     // Coût total en USD

  // Détails supplémentaires
  promptTokensDetails: {
    cachedTokens: number           // Tokens en cache (Anthropic)
  }
  completionTokensDetails: {
    reasoningTokens: number        // Tokens de raisonnement (O1)
  }
}
```

**Note** : Toutes ces métriques sont **automatiquement incluses** dans chaque réponse OpenRouter.

### Monitoring des coûts en temps réel

```typescript
async function generateWithBudget(prompt: string, maxCost: number) {
  const model = openrouter('openai/gpt-4o')

  const result = await generateText({ model, prompt })

  const cost = result.providerMetadata?.openrouter?.usage?.cost || 0

  if (cost > maxCost) {
    throw new Error(`Cost ${cost} exceeds budget ${maxCost}`)
  }

  return { result, cost }
}
```

### Monitoring avec streaming

```typescript
class StreamCostMonitor {
  private totalCost = 0
  private totalTokens = 0

  async streamWithTracking(model: any, prompt: string) {
    const result = streamText({
      model,
      prompt,
      onFinish: (event) => {
        const usage = event.providerMetadata?.openrouter?.usage
        if (usage) {
          this.totalCost += usage.cost || 0
          this.totalTokens += usage.totalTokens || 0
          console.log(`Request: ${usage.cost}$ (${usage.totalTokens} tokens)`)
          console.log(`Total: ${this.totalCost}$ (${this.totalTokens} tokens)`)
        }
      }
    })

    for await (const chunk of result.textStream) {
      process.stdout.write(chunk)
    }
  }

  getStats() {
    return {
      totalCost: this.totalCost,
      totalTokens: this.totalTokens
    }
  }
}
```

---

## Intégration avec @fondation-io/ai-sdk-tools

### Avec @fondation-io/agents

```typescript
import { Agent } from '@fondation-io/agents'
import { openrouter } from '@openrouter/ai-sdk-provider'

// Agent financier avec Claude
const financialAgent = new Agent({
  name: 'Financial Advisor',
  model: openrouter('anthropic/claude-3-5-sonnet'),
  instructions: 'You are a financial advisor',
  tools: {
    analyzeBurnRate: /* ... */,
    calculateROI: /* ... */
  }
})

// Agent technique avec GPT-4
const technicalAgent = new Agent({
  name: 'Technical Support',
  model: openrouter('openai/gpt-4o'),
  instructions: 'You are a technical expert',
  tools: {
    debugCode: /* ... */,
    reviewPR: /* ... */
  },
  handoffs: [financialAgent]
})

// Utilisation
const result = await technicalAgent.generate({
  prompt: 'Analyze our burn rate and suggest optimizations'
})
```

### Avec @fondation-io/cache

```typescript
import { cached } from '@fondation-io/cache'
import { openrouter } from '@openrouter/ai-sdk-provider'
import { tool } from 'ai'

// Tool caché avec OpenRouter
const weatherTool = cached(tool({
  description: 'Get weather information',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => {
    const { text } = await generateText({
      model: openrouter('openai/gpt-3.5-turbo'),
      prompt: `What's the weather in ${city}?`
    })
    return text
  }
}), {
  ttl: 30 * 60 * 1000 // Cache 30 minutes
})
```

### Avec @fondation-io/artifacts

```typescript
import { artifact } from '@fondation-io/artifacts'
import { openrouter } from '@openrouter/ai-sdk-provider'
import { tool } from 'ai'
import { z } from 'zod'

// Artifact pour charts
const chartArtifact = artifact('chart', z.object({
  title: z.string(),
  data: z.array(z.object({
    label: z.string(),
    value: z.number()
  }))
}))

// Tool qui génère un chart
const analysisTool = tool({
  description: 'Analyze financial data',
  parameters: z.object({ metric: z.string() }),
  execute: async function* ({ metric }) {
    const chart = chartArtifact.stream({
      title: `Analysis: ${metric}`,
      data: []
    })

    // Génération avec Gemini (bon pour l'analyse)
    const { text } = await generateText({
      model: openrouter('google/gemini-pro-1.5'),
      prompt: `Analyze ${metric} and provide data points`
    })

    // Parser et compléter l'artifact
    await chart.complete({
      title: `Analysis: ${metric}`,
      data: parseDataPoints(text)
    })

    yield { text: 'Analysis complete', forceStop: true }
  }
})
```

### Avec @fondation-io/memory

```typescript
import { Agent } from '@fondation-io/agents'
import { UpstashProvider } from '@fondation-io/memory'
import { openrouter } from '@openrouter/ai-sdk-provider'
import { Redis } from '@upstash/redis'

const agent = new Agent({
  name: 'Assistant',
  model: openrouter('anthropic/claude-3-5-sonnet'),
  instructions: 'You are a helpful assistant with long-term memory',
  memory: {
    provider: new UpstashProvider({
      redis: Redis.fromEnv()
    }),
    workingMemory: {
      enabled: true,
      scope: 'user'
    },
    history: {
      enabled: true
    }
  }
})
```

---

## Stratégies de fallback

OpenRouter permet de configurer des fallbacks automatiques entre modèles.

### Fallback simple

```typescript
const result = await generateText({
  model: openrouter('openai/gpt-4o'),
  prompt: 'Hello',
  providerOptions: {
    openrouter: {
      route: 'fallback',
      models: [
        'openai/gpt-4o',           // Essayer d'abord
        'anthropic/claude-3-5-sonnet', // Fallback 1
        'google/gemini-pro-1.5'    // Fallback 2
      ]
    }
  }
})
```

### Fallback avec budget

```typescript
const budget = {
  cheap: ['openai/gpt-3.5-turbo', 'meta-llama/llama-3.1-70b'],
  medium: ['openai/gpt-4o-mini', 'google/gemini-flash-1.5'],
  expensive: ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet']
}

async function generateWithBudget(prompt: string, tier: keyof typeof budget) {
  return await generateText({
    model: openrouter(budget[tier][0]),
    prompt,
    providerOptions: {
      openrouter: {
        route: 'fallback',
        models: budget[tier]
      }
    }
  })
}
```

---

## Exemples d'architecture Next.js

### Route API avec OpenRouter

```typescript
// app/api/chat/route.ts
import { openrouter } from '@openrouter/ai-sdk-provider'
import { streamText } from 'ai'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: openrouter('anthropic/claude-3-5-sonnet'),
    messages,
    temperature: 0.7,
    maxTokens: 2000
  })

  return result.toDataStreamResponse()
}
```

### Server Action avec usage tracking

```typescript
// app/actions/generate.ts
'use server'

import { openrouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'

export async function generateRecipe(ingredients: string[]) {
  const model = openrouter('openai/gpt-4o', {
    usage: { include: true }
  })

  const result = await generateText({
    model,
    prompt: `Create a recipe using: ${ingredients.join(', ')}`
  })

  return {
    recipe: result.text,
    cost: result.providerMetadata?.openrouter?.usage?.cost || 0,
    tokens: result.providerMetadata?.openrouter?.usage?.total_tokens || 0
  }
}
```

### Streaming avec prompt caching

```typescript
// app/api/chat-with-docs/route.ts
import { openrouter } from '@openrouter/ai-sdk-provider'
import { streamText } from 'ai'

const DOCUMENTATION = `
  [Your large documentation here - 50k+ tokens]
`

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: openrouter('anthropic/claude-3-5-sonnet'),
    messages: [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: DOCUMENTATION,
            providerOptions: {
              openrouter: {
                cacheControl: { type: 'ephemeral' }
              }
            }
          }
        ]
      },
      ...messages
    ]
  })

  return result.toDataStreamResponse()
}
```

---

## Patterns avancés

### Multi-model routing

```typescript
import { openrouter } from '@openrouter/ai-sdk-provider'

async function routeToModel(task: string, complexity: 'low' | 'medium' | 'high') {
  const models = {
    low: openrouter('openai/gpt-3.5-turbo'),
    medium: openrouter('openai/gpt-4o-mini'),
    high: openrouter('anthropic/claude-3-5-sonnet')
  }

  const result = await generateText({
    model: models[complexity],
    prompt: task
  })

  return result
}
```

### Cost optimization

```typescript
import { openrouter } from '@openrouter/ai-sdk-provider'

class CostOptimizedGeneration {
  private budget: number
  private spent: number = 0

  constructor(budgetUSD: number) {
    this.budget = budgetUSD
  }

  async generate(prompt: string, preferredModel: string) {
    if (this.spent >= this.budget) {
      throw new Error('Budget exceeded')
    }

    const model = openrouter(preferredModel, {
      usage: { include: true }
    })

    const result = await generateText({ model, prompt })

    const cost = result.providerMetadata?.openrouter?.usage?.cost || 0
    this.spent += cost

    console.log(`Spent: $${this.spent.toFixed(4)} / $${this.budget}`)

    return result
  }

  getRemainingBudget() {
    return this.budget - this.spent
  }
}

// Usage
const generator = new CostOptimizedGeneration(1.00) // $1 budget
await generator.generate('Task 1', 'openai/gpt-4o')
await generator.generate('Task 2', 'openai/gpt-3.5-turbo')
```

### Smart model selection

```typescript
async function smartModelSelection(prompt: string) {
  const promptLength = prompt.length
  const estimatedTokens = Math.ceil(promptLength / 4)

  let modelId: string

  if (estimatedTokens < 500) {
    modelId = 'openai/gpt-3.5-turbo' // Cheap for short prompts
  } else if (estimatedTokens < 2000) {
    modelId = 'openai/gpt-4o-mini' // Medium for medium prompts
  } else {
    modelId = 'google/gemini-pro-1.5' // Long context window
  }

  console.log(`Selected ${modelId} for ${estimatedTokens} estimated tokens`)

  return await generateText({
    model: openrouter(modelId),
    prompt
  })
}
```

---

## Comparaison des modèles

### Performance vs Coût (résultats tests réels)

**💡 Résultats de tests réels** (haiku TypeScript, ~30 tokens moyens) :

| Modèle | Coût/requête | Performance | Use case idéal |
|--------|--------------|-------------|----------------|
| `openai/gpt-4o-mini` | **$0.000013** ⭐ | ⭐⭐⭐⭐ | Meilleur rapport qualité/prix |
| `anthropic/claude-3-haiku` | $0.000030 | ⭐⭐⭐⭐ | Rapide, précis |
| `openai/gpt-3.5-turbo` | $0.000032 | ⭐⭐⭐ | Chat basique |
| `google/gemini-flash-1.5` | ~$0.000035 | ⭐⭐⭐⭐ | Long context, multimodal |
| `openai/gpt-4o` | ~$0.000150 | ⭐⭐⭐⭐⭐ | Production critique |
| `anthropic/claude-3-5-sonnet` | ~$0.000300 | ⭐⭐⭐⭐⭐ | Analyse complexe, code |

**🏆 Recommandation** : Pour la plupart des cas d'usage, `openai/gpt-4o-mini` offre le meilleur rapport qualité/prix.

### Capacités spéciales

| Modèle | Tools | Vision | Long Context | Streaming |
|--------|-------|--------|--------------|-----------|
| `openai/gpt-4o` | ✅ | ✅ | 128k | ✅ |
| `anthropic/claude-3-5-sonnet` | ✅ | ✅ | 200k | ✅ |
| `google/gemini-pro-1.5` | ✅ | ✅ | 2M | ✅ |
| `openai/o1-preview` | ❌ | ❌ | 128k | ✅ |
| `meta-llama/llama-3.3-70b` | ✅ | ❌ | 128k | ✅ |

---

## Debugging et monitoring

### Logs détaillés

```typescript
import { openrouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'

const result = await generateText({
  model: openrouter('openai/gpt-4o', {
    usage: { include: true }
  }),
  prompt: 'Hello',
  onFinish: ({ text, usage, finishReason }) => {
    console.log('Generated:', text)
    console.log('Finish reason:', finishReason)
    console.log('Usage:', usage)
  }
})

// Provider metadata
console.log('OpenRouter metadata:', result.providerMetadata?.openrouter)
```

### Error handling

```typescript
import { openrouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'

try {
  const result = await generateText({
    model: openrouter('openai/gpt-4o'),
    prompt: 'Hello'
  })
} catch (error) {
  if (error.message?.includes('rate limit')) {
    console.error('Rate limit exceeded, retry with exponential backoff')
  } else if (error.message?.includes('insufficient credits')) {
    console.error('Insufficient credits, add funds to OpenRouter')
  } else {
    console.error('Unknown error:', error)
  }
}
```

### Request monitoring

```typescript
class RequestMonitor {
  private requests: Array<{
    timestamp: Date
    model: string
    tokens: number
    cost: number
  }> = []

  async track(modelId: string, prompt: string) {
    const model = openrouter(modelId, {
      usage: { include: true }
    })

    const result = await generateText({ model, prompt })

    const usage = result.providerMetadata?.openrouter?.usage

    this.requests.push({
      timestamp: new Date(),
      model: modelId,
      tokens: usage?.total_tokens || 0,
      cost: usage?.cost || 0
    })

    return result
  }

  getStats() {
    const totalCost = this.requests.reduce((sum, r) => sum + r.cost, 0)
    const totalTokens = this.requests.reduce((sum, r) => sum + r.tokens, 0)

    return {
      requestCount: this.requests.length,
      totalCost,
      totalTokens,
      averageCostPerRequest: totalCost / this.requests.length,
      requests: this.requests
    }
  }
}
```

---

## Best Practices

### 1. Sécurité

```typescript
// ✅ GOOD: Utiliser variables d'environnement
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
})

// ❌ BAD: Hardcoder la clé
const openrouter = createOpenRouter({
  apiKey: 'sk-or-v1-abc123...' // NEVER DO THIS
})
```

### 2. Error handling

```typescript
// ✅ GOOD: Gérer les erreurs spécifiquement
try {
  const result = await generateText({ model, prompt })
} catch (error) {
  if (isRateLimitError(error)) {
    await retryWithBackoff()
  } else if (isInsufficientCreditsError(error)) {
    await notifyAdmin()
  }
  throw error
}

// ❌ BAD: Ignorer les erreurs
const result = await generateText({ model, prompt }).catch(() => null)
```

### 3. Cost monitoring (streaming)

```typescript
// ✅ GOOD: Utiliser onFinish pour capturer les métriques
const result = streamText({
  model: openrouter('openai/gpt-4o'),
  prompt: '...',
  onFinish: (event) => {
    const cost = event.providerMetadata?.openrouter?.usage?.cost
    console.log(`Coût: $${cost}`)
    analytics.track('llm_cost', { cost })
  }
})

// ❌ BAD: Essayer d'accéder directement après le stream
const result = streamText({ model, prompt })
for await (const chunk of result.textStream) {}
const cost = result.providerMetadata?.openrouter?.usage?.cost // undefined!
```

### 4. Model selection

```typescript
// ✅ GOOD: Choisir le bon modèle pour la tâche
const simpleTask = openrouter('openai/gpt-3.5-turbo')
const complexTask = openrouter('anthropic/claude-3-5-sonnet')

// ❌ BAD: Utiliser GPT-4o pour tout
const model = openrouter('openai/gpt-4o')
```

### 5. Accès aux métriques en streaming

```typescript
// ✅ GOOD: Toujours capturer via onFinish
let usage: any = null

const result = streamText({
  model,
  prompt: '...',
  onFinish: (event) => {
    usage = event.providerMetadata?.openrouter?.usage
  }
})

for await (const chunk of result.textStream) {
  process.stdout.write(chunk)
}

console.log('Coût final:', usage?.cost)

// ❌ BAD: Essayer d'accéder directement
const result = streamText({ model, prompt })
for await (const chunk of result.textStream) {}
// result.providerMetadata est undefined en streaming
```

---

## Ressources

### Documentation
- **OpenRouter**: https://openrouter.ai/docs
- **AI SDK v5**: https://sdk.vercel.ai/docs
- **Provider GitHub**: https://github.com/OpenRouterTeam/ai-sdk-provider

### Outils
- **Liste des modèles**: https://openrouter.ai/models
- **Pricing**: https://openrouter.ai/models (voir colonne prix)
- **Playground**: https://openrouter.ai/playground

### Support
- **Discord OpenRouter**: https://discord.gg/openrouter
- **Issues GitHub**: https://github.com/OpenRouterTeam/ai-sdk-provider/issues

---

## Changelog et versions

### v5.x (AI SDK v5)
- ✅ Support complet AI SDK v5
- ✅ Prompt caching Anthropic
- ✅ Usage tracking détaillé
- ✅ Provider options
- ✅ Fallback routes

### v4.x (AI SDK v4 - legacy)
- Support AI SDK v4
- Installation via `@ai-sdk-v4` tag

---

**Dernière mise à jour**: Document basé sur @openrouter/ai-sdk-provider pour AI SDK v5 (décembre 2024)

---

## Découvertes importantes (tests réels)

### 1. Les métriques sont TOUJOURS disponibles

Contrairement à ce que suggère la documentation, **OpenRouter retourne automatiquement les métriques d'usage** pour chaque requête, sans configuration spéciale.

```typescript
// ❌ PAS NÉCESSAIRE
const model = openrouter('...', { usage: { include: true } })

// ✅ SUFFISANT - Les métriques sont toujours là
const model = openrouter('...')
```

### 2. Streaming : utilisez onFinish

En mode streaming, `providerMetadata` n'est **pas accessible** directement sur l'objet result. Vous **devez** utiliser le callback `onFinish`.

```typescript
// ✅ CORRECT
const result = streamText({
  model,
  prompt: '...',
  onFinish: (event) => {
    const usage = event.providerMetadata?.openrouter?.usage
    console.log('Tokens:', usage?.totalTokens)
    console.log('Coût:', usage?.cost)
  }
})

for await (const chunk of result.textStream) {
  // Stream le texte
}
```

### 3. GPT-4o-mini est le plus économique

D'après nos tests réels (haiku TypeScript, ~30 tokens) :

```
openai/gpt-4o-mini        : $0.000013 (le moins cher)
anthropic/claude-3-haiku  : $0.000030 (2.3x plus cher)
openai/gpt-3.5-turbo      : $0.000032 (2.5x plus cher)
```

Pour la plupart des cas d'usage, GPT-4o-mini offre le meilleur rapport qualité/prix.

### 4. Métriques détaillées incluses

OpenRouter retourne des métriques avancées :

```typescript
{
  promptTokens: 13,
  completionTokens: 14,
  totalTokens: 27,
  cost: 0.000028,
  
  promptTokensDetails: {
    cachedTokens: 0           // Anthropic caching
  },
  completionTokensDetails: {
    reasoningTokens: 0        // O1 reasoning tokens
  }
}
```

### 5. Script de test disponible

Testez vous-même le tracking d'usage :

```bash
export OPENROUTER_API_KEY=sk-or-v1-...
bun run docs/test-openrouter-streaming-usage.ts
```

Le script exécute 4 tests :
1. ✅ Streaming avec tracking
2. ✅ Streaming sans tracking (métriques quand même présentes !)
3. ✅ Comparaison de coûts entre modèles
4. ✅ Monitoring des coûts sur plusieurs appels

