# Guide d'intégration AI SDK Tools dans Next.js + AI SDK v5

## 🎯 Vue d'ensemble

Ce document analyse l'intérêt de chaque bibliothèque AI SDK Tools dans le contexte d'un projet **Next.js utilisant déjà AI SDK v5 avec des agents implémentés**.

### Contexte de départ assumé

- **Framework**: Next.js 14/15 (App Router ou Pages Router)
- **AI SDK**: v5.x déjà installé et configuré
- **Agents**: Implémentations existantes basées sur `generateText` / `streamText`
- **Stack typique**: API routes + React components
- **Infrastructure**: Serveur Node.js ou edge runtime

---

## 📦 Analyse par package

### 1. @ai-sdk-tools/store

**Version**: 0.8.2
**Type**: 100% CLIENT (React hooks)
**Dépendances**: `react ^18.0`, `zustand ^5.0`, `@ai-sdk/react ^2.0`

#### ❓ Quel problème résout-il ?

Le hook `useChat` vanilla d'AI SDK v5 (`@ai-sdk/react`) présente des limitations en production:

| Problème vanilla AI SDK | Solution avec @ai-sdk-tools/store |
|-------------------------|-----------------------------------|
| Re-renders massifs sur chaque message stream | Batched updates + throttling (16ms) |
| Pas d'indexation des messages | MessageIndex O(1) lookups |
| État volatil (perdu au refresh) | Hydration depuis sessionStorage/localStorage |
| Pas de DevTools | Middleware Zustand DevTools intégré |
| Détection de freeze UI difficile | Freeze detection automatique (>80ms warning) |
| Sélecteurs non optimisés | useShallow pour éviter re-renders inutiles |

#### 🎯 Cas d'usage dans votre projet Next.js

**Scénario 1: Chat avec historique persistant**
```tsx
// Avant (vanilla AI SDK v5)
'use client'
import { useChat } from '@ai-sdk/react'

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat()
  // ❌ État perdu au refresh
  // ❌ Re-renders sur chaque token streamé
  // ❌ Pas d'accès à l'état dans d'autres composants
}

// Après (avec store)
'use client'
import { useChat, Provider } from '@ai-sdk-tools/store'

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    id: 'main-chat' // État persistant lié à cet ID
  })
  // ✅ État persisté automatiquement
  // ✅ Performance optimisée
  // ✅ Accessible globalement via hooks
}
```

**Scénario 2: Dashboard avec affichage message dans plusieurs composants**
```tsx
// Sans store: prop drilling ou context lourd
<ChatMessages messages={messages} />
<MessageStats messages={messages} />
<LastMessage message={messages[messages.length - 1]} />

// Avec store: accès direct depuis n'importe quel composant
'use client'
import { useChatMessages, useMessageCount } from '@ai-sdk-tools/store'

function ChatMessages() {
  const messages = useChatMessages() // Auto-subscribed
}

function MessageStats() {
  const count = useMessageCount() // Pas de re-render si messages changent
}
```

#### ⚖️ Intérêt vs vanilla AI SDK v5

**Adoptez store si:**
- ✅ Vous avez plus de 50+ messages dans une conversation (performance)
- ✅ Vous affichez les messages dans plusieurs composants
- ✅ Vous voulez persister l'historique entre refreshes
- ✅ Vous devez gérer plusieurs conversations simultanées
- ✅ Vous souhaitez debugger l'état facilement

**Restez vanilla AI SDK si:**
- ❌ Chat simple, éphémère, < 20 messages
- ❌ Pas besoin de persistence
- ❌ Pas de contraintes de performance
- ❌ Vous voulez éviter une dépendance supplémentaire

#### 🔧 Migration depuis vanilla AI SDK

**Drop-in replacement** - API 100% compatible:

```tsx
// Il suffit de changer l'import
- import { useChat } from '@ai-sdk/react'
+ import { useChat } from '@ai-sdk-tools/store'

// API identique, fonctionnalités en plus
const chat = useChat({
  api: '/api/chat',
  id: 'my-chat' // Nouveau: persist avec cet ID
})
```

#### ⚠️ Points d'attention

1. **Hydration SSR**: Store est client-only, wrapper avec `<Provider>`
2. **Storage quota**: sessionStorage limité (~5MB), prévoir cleanup
3. **Zustand peer dep**: Doit être installé explicitement (`zustand ^5.0`)

---

### 2. @ai-sdk-tools/memory

**Version**: 0.1.2
**Type**: 100% SERVER (providers Redis/SQL)
**Dépendances**: `zod ^4.1`
**Peer deps optionnelles**: `@upstash/redis ^1.34`, `drizzle-orm ^0.36`

#### ❓ Quel problème résout-il ?

AI SDK v5 vanilla **ne fournit pas** de système de mémoire persistante. Vos agents oublient tout entre les requêtes.

| Sans memory | Avec @ai-sdk-tools/memory |
|-------------|---------------------------|
| Agents stateless | Working memory + chat history |
| Contexte perdu entre sessions | Persistence Redis/PostgreSQL/MySQL/SQLite |
| Pas de rappel de préférences utilisateur | Mémoire scopée par user/chat |
| Re-fetching à chaque requête | Cache de contexte |

#### 🎯 Cas d'usage dans votre projet Next.js

**Scénario 1: Agent avec mémoire de conversation**

```typescript
// app/api/chat/route.ts
import { InMemoryProvider } from '@ai-sdk-tools/memory'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

const memory = new InMemoryProvider()

export async function POST(req: Request) {
  const { messages, userId, sessionId } = await req.json()

  // Récupérer l'historique de conversation
  const history = await memory.getConversationHistory({
    sessionId,
    userId,
    limit: 50
  })

  const result = streamText({
    model: openai('gpt-4o'),
    messages: [
      { role: 'system', content: 'Tu es un assistant qui se souvient des conversations' },
      ...history.messages, // Contexte des conversations précédentes
      ...messages
    ]
  })

  // Sauvegarder après génération
  const { text } = await result.value
  await memory.saveMessage({
    sessionId,
    userId,
    message: { role: 'assistant', content: text }
  })

  return result.toDataStreamResponse()
}
```

**Scénario 2: Working memory cross-requests**

```typescript
// Agent financier qui accumule des insights
const workingMemory = await memory.getWorkingMemory({
  scope: 'user',
  id: userId,
  agentName: 'financial-advisor'
})

// Structure: { insights: string[], preferences: {...} }
const insights = workingMemory?.insights || []

// Ajouter un nouveau insight
await memory.saveWorkingMemory({
  scope: 'user',
  id: userId,
  agentName: 'financial-advisor',
  memory: {
    insights: [...insights, 'User prefers conservative investments'],
    preferences: { riskTolerance: 'low' }
  }
})
```

**Scénario 3: Production avec Upstash Redis**

```typescript
// lib/memory.ts
import { UpstashMemoryProvider } from '@ai-sdk-tools/memory'
import { Redis } from '@upstash/redis'

export const memory = new UpstashMemoryProvider({
  redis: Redis.fromEnv() // UPSTASH_REDIS_REST_URL + TOKEN
})

// TTL automatique:
// - Chat scope: 24h
// - User scope: 30 jours
// - Auto-trim des messages (dernier 100)
```

#### ⚖️ Intérêt vs implémentation custom

**Adoptez memory si:**
- ✅ Vous devez persister des conversations multi-sessions
- ✅ Vos agents ont besoin de contexte utilisateur entre requêtes
- ✅ Vous voulez une abstraction propre (3 providers ready-to-use)
- ✅ Vous gérez plusieurs agents avec mémoires isolées

**Implémentez vous-même si:**
- ❌ Vous avez déjà un système de persistence custom bien établi
- ❌ Besoin de logique de mémoire très spécifique (RAG, vector search)
- ❌ Projet simple sans besoin de mémoire cross-sessions

#### 🔧 Intégration avec vos agents existants

```typescript
// Avant: agent stateless
export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: openai('gpt-4o'),
    messages // Pas de contexte au-delà de cette requête
  })
}

// Après: agent avec mémoire
import { memory } from '@/lib/memory'

export async function POST(req: Request) {
  const { messages, sessionId, userId } = await req.json()

  // Charger mémoire working + historique
  const [workingMem, history] = await Promise.all([
    memory.getWorkingMemory({ scope: 'user', id: userId, agentName: 'assistant' }),
    memory.getConversationHistory({ sessionId, userId, limit: 20 })
  ])

  const systemContext = `
    Préférences utilisateur: ${JSON.stringify(workingMem)}
    Historique: ${history.messages.length} messages
  `

  const result = streamText({
    model: openai('gpt-4o'),
    messages: [
      { role: 'system', content: systemContext },
      ...messages
    ]
  })

  // Persister après génération
  const { text } = await result.value
  await memory.saveMessage({
    sessionId, userId,
    message: { role: 'assistant', content: text }
  })
}
```

#### ⚠️ Points d'attention

1. **Drizzle version**: Dev utilise 0.44.6, peer dep déclare 0.36.0 (incompatibilité possible)
2. **Schemas séparés**: Utiliser helpers `drizzle-schema.ts` pour PostgreSQL/MySQL/SQLite
3. **TTL Redis**: Messages auto-expirés, prévoir archivage long-terme si besoin
4. **Coûts**: Upstash Redis facturé au volume, InMemory OK pour dev uniquement

---

### 3. @ai-sdk-tools/cache

**Version**: 0.7.2
**Type**: 100% SERVER (wrapper de tools)
**Dépendances**: Aucune (peer: `ai ^5.0`)
**Backends**: LRU in-memory, Redis (Upstash, ioredis, redis)

#### ❓ Quel problème résout-il ?

AI SDK v5 **n'a pas de cache natif** pour les tools. Chaque appel coûte temps + argent, même si les paramètres sont identiques.

| Sans cache | Avec @ai-sdk-tools/cache |
|------------|-------------------------|
| Appel API à chaque fois | Cache intelligent avec TTL |
| Coûts 10x+ pour requêtes répétées | Réduction ~80% des coûts |
| Latence élevée | Réponse instantanée (cache hit) |
| Pas de support streaming tools | Streaming tools + artifacts cachés |
| Gestion manuelle du cache | Clés déterministes auto-générées |

#### 🎯 Cas d'usage dans votre projet Next.js

**Scénario 1: Tool API externe (météo, traduction, taux de change)**

```typescript
// Avant: appel API à chaque fois
import { tool } from 'ai'
import { z } from 'zod'

const weatherTool = tool({
  description: 'Get weather for a city',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => {
    const res = await fetch(`https://api.weather.com/${city}`) // ❌ Coûteux
    return res.json()
  }
})

// Après: cache Redis
import { createCached } from '@ai-sdk-tools/cache'
import { Redis } from '@upstash/redis'

const cached = createCached({
  cache: Redis.fromEnv(),
  ttl: 30 * 60 * 1000 // 30 min
})

const weatherTool = cached(tool({
  description: 'Get weather for a city',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => {
    const res = await fetch(`https://api.weather.com/${city}`)
    return res.json() // ✅ Résultat caché 30min
  }
}))

// 1er appel: hit API
// Appels suivants (même city): cache instantané
```

**Scénario 2: Cache avec contexte multi-tenant**

```typescript
// Votre app a des teams isolées
const burnRateTool = tool({
  description: 'Analyze burn rate',
  parameters: z.object({ from: z.string(), to: z.string() }),
  execute: async ({ from, to }) => {
    const currentUser = getCurrentUser()
    return db.getBurnRate({
      teamId: currentUser.teamId, // ⚠️ Problème: cache partagé entre teams!
      from, to
    })
  }
})

// Solution: context-aware caching
import { cached } from '@ai-sdk-tools/cache'

const cachedBurnRate = cached(burnRateTool, {
  cacheKey: () => {
    const user = getCurrentUser()
    return `team:${user.teamId}:user:${user.id}` // ✅ Isolation par team
  },
  ttl: 30 * 60 * 1000
})
```

**Scénario 3: Streaming tools avec artifacts**

```typescript
// Cache fonctionne même avec streaming + artifacts!
const analysisArtifact = artifact('analysis', schema)

const analysisTool = tool({
  description: 'Generate analysis',
  parameters: z.object({ companyId: z.string() }),
  execute: async function* ({ companyId }) {
    const report = analysisArtifact.stream({ stage: 'loading' })

    yield { text: 'Starting...' }
    await report.update({ stage: 'processing', data: [...] })
    yield { text: 'Complete', forceStop: true }
  }
})

const cachedAnalysis = cached(analysisTool)

// 1ère exécution: streaming complet + artifact créé
// Exécutions suivantes: artifact restauré instantanément + replay streaming
```

**Scénario 4: Cache multiple tools**

```typescript
import { cacheTools } from '@ai-sdk-tools/cache'

const { weather, translation, exchange } = cacheTools({
  weather: weatherTool,
  translation: translationTool,
  exchange: exchangeRateTool
}, {
  ttl: 5 * 60 * 1000, // 5min pour tous
  debug: process.env.NODE_ENV === 'development'
})
```

#### ⚖️ Intérêt vs implémentation custom

**Adoptez cache si:**
- ✅ Vous avez des tools avec API externes coûteuses
- ✅ Agents appellent les mêmes tools avec mêmes paramètres
- ✅ Vous voulez support streaming + artifacts out-of-the-box
- ✅ Besoin de cache multi-tenant avec isolation

**Implémentez vous-même si:**
- ❌ Logique de cache très spécifique (invalidation custom, warmup)
- ❌ Vous utilisez déjà un cache centralisé (ex: Redis avec structure custom)
- ❌ Tools toujours avec paramètres différents (pas de répétition)

#### 🔧 Monitoring et debugging

```typescript
const cachedTool = cached(originalTool, {
  onHit: (key) => {
    console.log(`✨ Cache HIT: ${key}`)
    analytics.track('tool_cache_hit', { key })
  },
  onMiss: (key) => {
    console.log(`💫 Cache MISS: ${key}`)
    analytics.track('tool_cache_miss', { key })
  },
  debug: true // Logs détaillés
})

// Stats
console.log(cachedTool.getStats())
// { hits: 42, misses: 8, hitRate: 0.84, size: 50, maxSize: 1000 }

// Clear programmatiquement
cachedTool.clearCache() // Tout
cachedTool.clearCache('specific-key') // Clé précise
```

#### ⚠️ Points d'attention

1. **Sérialisation clés**: Déterministe (ordre clés trié) comme React Query
2. **TTL par défaut**: 10min LRU, 30min Redis (configurable)
3. **Artifacts**: Nécessite `@ai-sdk-tools/artifacts` en peer dep optionnelle
4. **Streaming**: Seul le dernier chunk stocké (texte complet), pas tous les deltas

---

### 4. @ai-sdk-tools/artifacts

**Version**: 0.8.2
**Type**: MIXTE (server pour `artifact()`, client pour `useArtifact`)
**Dépendances**: `@ai-sdk-tools/store` (client), `zod`, `ai ^5.0`

#### ❓ Quel problème résout-il ?

AI SDK v5 supporte les **data parts** mais sans:
- Type safety via Zod
- État de streaming (pending/streaming/complete/error)
- Progress tracking
- Hook React optimisé pour consommation

| Vanilla AI SDK data parts | @ai-sdk-tools/artifacts |
|---------------------------|------------------------|
| Pas de validation schéma | Zod schema strict |
| Statut manual tracking | Status automatique |
| Pas de progress API | `artifact.progress = 0.5` |
| Parsing manuel React | `useArtifact(schema)` optimisé |
| Pas d'isolation multi-types | `useArtifacts()` pour tous types |

#### 🎯 Cas d'usage dans votre projet Next.js

**Scénario 1: Dashboard financier avec données structurées**

```typescript
// 1. Définir artifact (partagé client/serveur)
// lib/artifacts.ts
import { artifact } from '@ai-sdk-tools/artifacts'
import { z } from 'zod'

export const burnRateArtifact = artifact('burn-rate', z.object({
  title: z.string(),
  stage: z.enum(['loading', 'processing', 'complete']),
  monthlyBurn: z.number(),
  runway: z.number(),
  chart: z.object({
    months: z.array(z.string()),
    values: z.array(z.number())
  }).optional()
}))

// 2. Tool server-side
// app/api/chat/route.ts
import { tool } from 'ai'
import { burnRateArtifact } from '@/lib/artifacts'

const analyzeBurnRate = tool({
  description: 'Analyze company burn rate',
  parameters: z.object({ companyId: z.string() }),
  execute: async function* ({ companyId }) {
    // Créer artifact avec état initial
    const analysis = burnRateArtifact.stream({
      title: `Analysis for ${companyId}`,
      stage: 'loading',
      monthlyBurn: 0,
      runway: 0
    })

    yield { text: 'Starting analysis...' }

    // Simuler étapes
    analysis.progress = 0.3
    const data = await fetchBurnRateData(companyId)

    await analysis.update({
      stage: 'processing',
      monthlyBurn: data.burn
    })

    yield { text: 'Calculating runway...' }
    analysis.progress = 0.7

    // Finaliser
    await analysis.complete({
      stage: 'complete',
      monthlyBurn: data.burn,
      runway: data.runway,
      chart: { months: [...], values: [...] }
    })

    yield { text: 'Analysis complete!', forceStop: true }
  }
})

// 3. Composant React
// components/BurnRateChart.tsx
'use client'
import { useArtifact } from '@ai-sdk-tools/artifacts/client'
import { burnRateArtifact } from '@/lib/artifacts'

export function BurnRateChart() {
  const { data, status, progress, error } = useArtifact(burnRateArtifact, {
    onComplete: (data) => {
      console.log('Analysis done!', data)
      analytics.track('burn_rate_complete')
    },
    onProgress: (p) => console.log(`Progress: ${p * 100}%`)
  })

  if (!data) return null
  if (error) return <Error message={error} />

  return (
    <div>
      <h2>{data.title}</h2>
      <p>Stage: {data.stage}</p>
      {progress && <ProgressBar value={progress} />}

      {status === 'streaming' && <Spinner />}

      {data.chart && (
        <LineChart
          months={data.chart.months}
          values={data.chart.values}
        />
      )}

      <div>
        Monthly Burn: ${data.monthlyBurn.toLocaleString()}
        Runway: {data.runway} months
      </div>
    </div>
  )
}
```

**Scénario 2: Multiple artifact types (Canvas pattern)**

```typescript
// Plusieurs types d'artifacts
const chartArtifact = artifact('chart', chartSchema)
const tableArtifact = artifact('table', tableSchema)
const reportArtifact = artifact('report', reportSchema)

// Composant qui switch sur le type
'use client'
import { useArtifacts } from '@ai-sdk-tools/artifacts/client'

function Canvas() {
  const { current, latest } = useArtifacts({
    onData: (type, data) => {
      console.log(`New ${type}:`, data)
    }
  })

  // Afficher le dernier artifact reçu
  switch (current?.type) {
    case 'chart':
      return <ChartRenderer data={current.data} />
    case 'table':
      return <TableRenderer data={current.data} />
    case 'report':
      return <ReportRenderer data={current.data} />
    default:
      return <EmptyState />
  }
}
```

#### ⚖️ Intérêt vs vanilla data parts

**Adoptez artifacts si:**
- ✅ Vous envoyez des données structurées complexes (tableaux, charts, objets)
- ✅ Besoin de type safety strict (éviter erreurs de parsing)
- ✅ Vous voulez status + progress tracking automatique
- ✅ Plusieurs types d'artifacts dans même chat

**Utilisez vanilla data parts si:**
- ❌ Données simples (texte, nombres)
- ❌ Pas besoin de validation Zod
- ❌ Vous gérez le state manuellement
- ❌ Un seul type de donnée structurée

#### 🔧 Intégration avec agents existants

```typescript
// Avant: tool retourne JSON brut
const tool = tool({
  description: 'Generate chart',
  parameters: z.object({ metric: z.string() }),
  execute: async ({ metric }) => {
    const data = await getChartData(metric)
    return {
      type: 'chart', // ❌ Pas de validation
      data: data     // ❌ Pas de type safety
    }
  }
})

// Après: artifact typé
import { artifact } from '@ai-sdk-tools/artifacts'

const chartArtifact = artifact('chart', z.object({
  title: z.string(),
  series: z.array(z.object({
    name: z.string(),
    data: z.array(z.number())
  }))
}))

const tool = tool({
  description: 'Generate chart',
  parameters: z.object({ metric: z.string() }),
  execute: async function* ({ metric }) {
    const chart = chartArtifact.stream({
      title: metric,
      series: []
    })

    const data = await getChartData(metric)

    await chart.complete({
      title: metric,
      series: data // ✅ Validé par Zod
    })

    yield { text: 'Chart ready', forceStop: true }
  }
})
```

#### ⚠️ Points d'attention

1. **Store requis**: Artifacts dépend de `@ai-sdk-tools/store` pour message management
2. **Provider React**: Wrapper app avec `<Provider>` du store
3. **Schemas partagés**: Importer artifact dans client ET serveur (monorepo friendly)
4. **Progress manual**: `artifact.progress = 0.5` doit être set explicitement

---

### 5. @ai-sdk-tools/devtools

**Version**: 0.8.2
**Type**: 100% CLIENT (React component)
**Dépendances**: `react ^18`, `@mui/material ^7`, `@xyflow/react ^12`, `@ai-sdk-tools/store` (optionnel)

#### ❓ Quel problème résout-il ?

AI SDK v5 **n'a pas de UI de debugging intégrée**. Debugger les streams, tools, agents nécessite `console.log` manuels.

| Sans devtools | Avec @ai-sdk-tools/devtools |
|---------------|----------------------------|
| console.log partout | UI dédiée avec filtres |
| Pas de vue d'ensemble events | Timeline complète des events |
| Debugging tool calls difficile | Inspection paramètres + résultats |
| Pas de metrics temps réel | Tokens/sec, chars/sec |
| État Zustand invisible | Explorateur JSON du store |

#### 🎯 Cas d'usage dans votre projet Next.js

**Scénario 1: Debug chat Next.js en dev**

```tsx
// app/layout.tsx ou app/chat/page.tsx
'use client'
import { AIDevtools } from '@ai-sdk-tools/devtools'

export default function ChatPage() {
  return (
    <div>
      <ChatInterface />

      {/* Uniquement en dev */}
      {process.env.NODE_ENV === 'development' && (
        <AIDevtools
          maxEvents={1000}
          config={{
            position: 'bottom', // ou 'right', 'overlay'
            height: 400,
            streamCapture: {
              enabled: true,
              endpoint: '/api/chat',
              autoConnect: true
            }
          }}
        />
      )}
    </div>
  )
}
```

**Scénario 2: Monitor tool calls**

```tsx
// DevTools capture automatiquement:
// - tool-call-start: nom, paramètres, timestamp
// - tool-call-result: résultat, durée
// - tool-call-error: erreur, stack trace

// Filtrage dans l'UI:
// - Par type d'event
// - Par nom de tool
// - Search dans les données
```

**Scénario 3: Debug multi-agents**

```tsx
// Avec intégration agent
const agent = new Agent({
  name: 'Financial Advisor',
  model: openai('gpt-4o'),
  onEvent: (event) => {
    // Events envoyés automatiquement au DevTools
    console.log('[Agent]', event)
  }
})

// DevTools affiche:
// - agent-start
// - agent-handoff (si multi-agents)
// - agent-step (tool calls)
// - agent-finish
```

**Scénario 4: Monitor performance**

```tsx
<AIDevtools
  modelId="gpt-4o" // Pour calcul context window
  config={{
    throttle: {
      enabled: true,
      interval: 100, // Throttle text-delta à 100ms
      includeTypes: ['text-delta']
    }
  }}
/>

// Metrics visibles:
// - Tokens/seconde
// - Chars/seconde
// - Context window utilization
// - Event timing
```

#### ⚖️ Intérêt vs console.log

**Adoptez devtools si:**
- ✅ Développement actif avec debugging fréquent
- ✅ Multi-agents / tools complexes
- ✅ Vous utilisez déjà `@ai-sdk-tools/store` (intégration bonus)
- ✅ Équipe qui debug ensemble (UI > logs)

**Restez console.log si:**
- ❌ Projet simple, peu de tools
- ❌ Vous ne voulez pas Material-UI (bundle lourd: 65KB CSS)
- ❌ Debugging occasionnel
- ❌ Edge runtime strict (devtools client-only)

#### 🔧 Intégration manuelle

```tsx
import { useAIDevtools } from '@ai-sdk-tools/devtools'

function CustomDebugPanel() {
  const {
    events,
    clearEvents,
    toggleCapturing,
    filterEvents,
    getEventStats
  } = useAIDevtools({
    maxEvents: 500,
    onEvent: (event) => {
      // Custom handling
      if (event.type === 'error') {
        Sentry.captureException(event.error)
      }
    }
  })

  const stats = getEventStats()
  const errors = filterEvents(['error'])

  return (
    <div>
      <p>Total events: {stats.total}</p>
      <p>Errors: {errors.length}</p>
      <button onClick={clearEvents}>Clear</button>
    </div>
  )
}
```

#### ⚠️ Points d'attention

1. **Bundle size**: Material-UI + Xyflow = ~200KB (uniquement charger en dev)
2. **Production**: TOUJOURS wrapper avec `process.env.NODE_ENV === 'development'`
3. **Store optionnel**: Fonctionne sans, mais pas de State tab
4. **Auto-capture**: Intercepte les streams AI SDK automatiquement

---

### 6. @ai-sdk-tools/agents

**Version**: 0.2.2
**Type**: 100% SERVER (orchestration)
**Dépendances**: `@ai-sdk-tools/memory` (workspace), `ai ^5.0`, `zod ^3.25|^4.1`

#### ❓ Quel problème résout-il ?

AI SDK v5 vanilla n'a **pas de système multi-agents natif**. Vous devez implémenter manuellement:
- Routing entre agents
- Handoffs avec contexte
- Orchestration de workflows
- Tool permissions
- Guardrails

| Vanilla AI SDK agents | @ai-sdk-tools/agents |
|-----------------------|---------------------|
| Pas d'abstraction agent | Classe `Agent` avec config |
| Routing manuel | `matchOn` patterns + LLM routing |
| Handoffs custom | `handoffs: [agent1, agent2]` |
| Context passing manuel | Generic `<TContext>` typé |
| Pas de guardrails | Input/output validation intégrée |
| Pas de permissions tools | `permissions: { allowed: [...] }` |
| Pas de mémoire intégrée | Memory provider optionnel |

#### 🎯 Cas d'usage dans votre projet Next.js

**⚠️ Question clé**: Vous avez déjà des agents AI SDK v5. **Devez-vous migrer vers @ai-sdk-tools/agents ?**

**Scénario 1: Vous avez déjà des agents simples (1-2 agents max)**

```typescript
// Votre implémentation actuelle
export async function POST(req: Request) {
  const { messages, mode } = await req.json()

  let systemPrompt = ''
  let tools = {}

  if (mode === 'financial') {
    systemPrompt = 'You are a financial advisor'
    tools = { analyzeBurnRate, calculateROI }
  } else if (mode === 'technical') {
    systemPrompt = 'You are a technical expert'
    tools = { debugCode, reviewPR }
  }

  return streamText({
    model: openai('gpt-4o'),
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    tools
  }).toDataStreamResponse()
}
```

**✅ Restez vanilla AI SDK** - Votre code est simple et fonctionne. Pas besoin de la complexité d'@ai-sdk-tools/agents.

**Scénario 2: Vous avez des workflows multi-étapes avec handoffs**

```typescript
// Votre implémentation actuelle (complexe!)
export async function POST(req: Request) {
  const { messages } = await req.json()

  // 1. Triage agent décide du routage
  const triageResult = await generateText({
    model: openai('gpt-4o-mini'),
    messages,
    tools: {
      routeTo: tool({
        description: 'Route to specialist',
        parameters: z.object({ agent: z.enum(['technical', 'billing']) }),
        execute: async ({ agent }) => agent
      })
    }
  })

  const targetAgent = triageResult.toolCalls[0]?.args.agent

  // 2. Appeler agent spécialisé
  let specialistPrompt = ''
  let specialistTools = {}

  if (targetAgent === 'technical') {
    specialistPrompt = 'Technical support'
    specialistTools = technicalTools
  } else if (targetAgent === 'billing') {
    specialistPrompt = 'Billing support'
    specialistTools = billingTools
  }

  // 3. Exécuter agent spécialisé
  const result = await streamText({
    model: openai('gpt-4o'),
    messages: [
      { role: 'system', content: specialistPrompt },
      ...messages,
      { role: 'assistant', content: `Routing to ${targetAgent}` }
    ],
    tools: specialistTools
  })

  return result.toDataStreamResponse()
}
```

**❌ Code verbeux, fragile, pas de type safety**

**✅ Avec @ai-sdk-tools/agents:**

```typescript
import { Agent } from '@ai-sdk-tools/agents'
import { openai } from '@ai-sdk/openai'

// Définir agents spécialisés
const technicalAgent = new Agent({
  name: 'Technical Support',
  model: openai('gpt-4o'),
  instructions: 'Handle technical issues',
  tools: technicalTools,
  matchOn: ['error', 'bug', 'crash', /technical/i] // Auto-routing
})

const billingAgent = new Agent({
  name: 'Billing Support',
  model: openai('gpt-4o'),
  instructions: 'Handle billing questions',
  tools: billingTools,
  matchOn: ['payment', 'invoice', 'subscription', /billing/i]
})

// Orchestrator
const triageAgent = new Agent({
  name: 'Triage',
  model: openai('gpt-4o-mini'), // Cheap model pour routing
  instructions: 'Route to appropriate specialist',
  handoffs: [technicalAgent, billingAgent] // Auto-créé handoff tools
})

// Route handler simplifié
export async function POST(req: Request) {
  const { messages } = await req.json()

  return triageAgent.toUIMessageStream({
    messages,
    maxRounds: 5, // Max 5 handoffs
    onEvent: (event) => {
      if (event.type === 'agent-handoff') {
        console.log(`Handoff: ${event.from} → ${event.to}`)
      }
    }
  })
}
```

**Avantages:**
- ✅ Code déclaratif
- ✅ Auto-routing via `matchOn` patterns
- ✅ Type safety sur handoffs
- ✅ Event tracking intégré
- ✅ Max rounds pour éviter boucles infinies

**Scénario 3: Context typé cross-agents**

```typescript
// Votre usecase: agents ont besoin du contexte team/user
interface TeamContext {
  teamId: string
  userId: string
  permissions: string[]
  preferences: Record<string, any>
}

const dataAgent = new Agent<TeamContext>({
  name: 'Data Analyst',
  model: openai('gpt-4o'),
  instructions: (context) => `
    Analyzing for team ${context.teamId}.
    User: ${context.userId}
    Permissions: ${context.permissions.join(', ')}
  `,
  tools: (context) => ({
    // Tools peuvent aussi être dynamiques!
    queryData: context.permissions.includes('read') ? readTool : null
  })
})

// Route avec context
export async function POST(req: Request) {
  const { messages } = await req.json()
  const session = await getSession(req)

  return dataAgent.toUIMessageStream({
    messages,
    context: {
      teamId: session.teamId,
      userId: session.userId,
      permissions: session.permissions,
      preferences: session.preferences
    }
  })
}
```

**Scénario 4: Guardrails et permissions**

```typescript
const restrictedAgent = new Agent({
  name: 'Restricted Bot',
  model: openai('gpt-4o'),
  instructions: 'Help users',
  tools: {
    readData: readTool,
    writeData: writeTool,
    deleteData: deleteTool
  },
  permissions: {
    allowed: ['readData', 'writeData'], // deleteData bloqué
    maxCallsPerTool: {
      writeData: 5 // Max 5 writes
    }
  },
  inputGuardrails: [
    async (input) => {
      if (containsProfanity(input)) {
        return {
          pass: false,
          action: 'block',
          message: 'Input violates policy'
        }
      }
      return { pass: true }
    }
  ],
  outputGuardrails: [
    async (output) => {
      if (containsPII(output)) {
        return {
          pass: false,
          action: 'modify',
          modifiedOutput: redactPII(output)
        }
      }
      return { pass: true }
    }
  ]
})
```

#### ⚖️ Intérêt vs vanilla multi-agents

**Adoptez @ai-sdk-tools/agents si:**
- ✅ Workflows multi-agents complexes (3+ agents)
- ✅ Handoffs fréquents entre agents
- ✅ Besoin de context typé cross-agents
- ✅ Guardrails / permissions tools nécessaires
- ✅ Vous voulez intégrer memory (working memory + history)

**Restez vanilla AI SDK si:**
- ❌ 1-2 agents simples sans handoffs
- ❌ Logique de routing très custom (pas pattern matching)
- ❌ Vous préférez contrôle total bas-niveau
- ❌ Projet legacy avec orchestration custom bien établie

#### 🔧 Migration progressive

```typescript
// Étape 1: Wrapper agents existants sans changer logique
const existingAgent = new Agent({
  name: 'Legacy Agent',
  model: openai('gpt-4o'),
  instructions: yourExistingPrompt,
  tools: yourExistingTools
})

// Utilisation identique
const result = await existingAgent.generate({ prompt: 'Hello' })

// Étape 2: Ajouter handoffs progressivement
const newSpecialist = new Agent({ ... })
existingAgent.handoffs = [newSpecialist]

// Étape 3: Migrer vers context typé
existingAgent.instructions = (context) => buildPrompt(context)
```

#### ⚠️ Points d'attention

1. **Memory dépendance**: Agents dépend de `@ai-sdk-tools/memory` (workspace:*)
2. **Overhead**: Orchestration ajoute latence vs direct `streamText`
3. **Max turns**: Défaut 10, configurer selon vos besoins
4. **Streaming UI**: `toUIMessageStream` pour Next.js, `stream()` pour autre usage

---

## 🏗️ Architecture recommandée Next.js

### Stack complète

```
Next.js App
├── app/
│   ├── api/chat/route.ts       → Agents (server)
│   └── chat/page.tsx           → useChat + Artifacts (client)
├── lib/
│   ├── agents.ts               → Agent definitions (server)
│   ├── artifacts.ts            → Artifact schemas (shared)
│   ├── tools.ts                → Tool definitions avec cache (server)
│   └── memory.ts               → Memory provider config (server)
└── components/
    ├── Chat.tsx                → useChat from store (client)
    ├── BurnRateChart.tsx       → useArtifact (client)
    └── DevTools.tsx            → AIDevtools (client, dev only)
```

### Exemple complet d'intégration

```typescript
// lib/memory.ts (server)
import { UpstashMemoryProvider } from '@ai-sdk-tools/memory'
import { Redis } from '@upstash/redis'

export const memory = new UpstashMemoryProvider({
  redis: Redis.fromEnv()
})

// lib/tools.ts (server)
import { tool } from 'ai'
import { createCached } from '@ai-sdk-tools/cache'
import { Redis } from '@upstash/redis'

const cached = createCached({ cache: Redis.fromEnv() })

export const weatherTool = cached(tool({
  description: 'Get weather',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => {
    const res = await fetch(`https://api.weather/${city}`)
    return res.json()
  }
}))

// lib/artifacts.ts (shared)
import { artifact } from '@ai-sdk-tools/artifacts'

export const reportArtifact = artifact('report', z.object({
  title: z.string(),
  content: z.string(),
  stage: z.enum(['pending', 'complete'])
}))

// lib/agents.ts (server)
import { Agent } from '@ai-sdk-tools/agents'
import { openai } from '@ai-sdk/openai'
import { weatherTool } from './tools'
import { memory } from './memory'

export const weatherAgent = new Agent({
  name: 'Weather Expert',
  model: openai('gpt-4o'),
  instructions: 'Provide weather information',
  tools: { weather: weatherTool },
  matchOn: ['weather', 'forecast', 'temperature']
})

// app/api/chat/route.ts (server)
import { weatherAgent } from '@/lib/agents'
import { memory } from '@/lib/memory'

export async function POST(req: Request) {
  const { messages, sessionId, userId } = await req.json()

  // Charger historique
  const history = await memory.getConversationHistory({
    sessionId, userId, limit: 20
  })

  const result = await weatherAgent.toUIMessageStream({
    messages: [...history.messages, ...messages],
    maxRounds: 3,
    onEvent: (event) => {
      console.log('[Agent Event]', event)
    }
  })

  // Sauvegarder après (TODO: hook dans agent)
  return result
}

// app/chat/page.tsx (client)
'use client'
import { useChat } from '@ai-sdk-tools/store'
import { useArtifact } from '@ai-sdk-tools/artifacts/client'
import { AIDevtools } from '@ai-sdk-tools/devtools'
import { reportArtifact } from '@/lib/artifacts'

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    id: 'weather-chat'
  })

  const { data: report, status } = useArtifact(reportArtifact)

  return (
    <div>
      <div>
        {messages.map(m => (
          <div key={m.id}>{m.content}</div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>

      {report && (
        <div>
          <h2>{report.title}</h2>
          <p>{report.content}</p>
          {status === 'streaming' && <Spinner />}
        </div>
      )}

      {process.env.NODE_ENV === 'development' && <AIDevtools />}
    </div>
  )
}
```

---

## 📊 Tableau de décision

| Package | Adoptez si... | Évitez si... |
|---------|---------------|--------------|
| **store** | Conversations longues, multi-composants, persistence | Chat simple < 20 msgs, pas de persistence |
| **memory** | Contexte cross-sessions, working memory agents | Agents stateless, pas de sessions utilisateurs |
| **cache** | Tools API externes, requêtes répétées | Tools toujours différents, latence non critique |
| **artifacts** | Données structurées complexes, progress tracking | Données simples texte/nombres |
| **devtools** | Dev actif, multi-agents complexes | Projet simple, bundle size critique |
| **agents** | 3+ agents, handoffs, workflows complexes | 1-2 agents simples, orchestration custom |

---

## ⚠️ Limitations et considérations

### Performance

- **store**: Batching optimisé, mais storage quota limité (~5MB sessionStorage)
- **memory**: Redis calls ajoutent latence (prévoir caching applicatif)
- **cache**: LRU in-memory limité par RAM serveur
- **artifacts**: Overhead validation Zod sur chaque update
- **devtools**: Material-UI bundle (200KB), uniquement dev
- **agents**: Orchestration ajoute latence vs direct streamText

### Coûts

- **memory (Upstash)**: Facturé au volume Redis (watch out auto-trim)
- **cache (Redis)**: Stockage + requests facturés
- **agents**: LLM routing coûte tokens (utiliser gpt-4o-mini)

### Compatibilité

- **store**: Client-only, SSR nécessite Provider
- **memory**: Drizzle peer dep 0.36 vs dev 0.44 (breaking?)
- **cache**: Nécessite artifacts en peer optionnelle pour streaming tools
- **artifacts**: Dépend obligatoirement de store
- **devtools**: React 18+, pas compatible edge runtime
- **agents**: Dépend de memory (workspace), Zod v3 ou v4

### Vendor lock-in

Tous les packages sont **MIT** et peuvent être remplacés/forkés. Cependant:

- **store**: Abstraitement Zustand, migration vers autre state manager = réécriture
- **memory**: Interface propre, facile à réimplémenter custom provider
- **cache**: Wrapper léger, facile à remplacer
- **artifacts**: Couplé à store, migration = réécriture
- **agents**: Classe Agent custom, migration vers framework tiers = réécriture

---

## 🎓 Recommandations finales

### Adoption progressive conseillée

**Phase 1 - Quick wins (semaine 1)**
1. **cache** sur tools API externes → ROI immédiat (coûts ↓, latence ↓)
2. **devtools** en dev → Debug amélioré sans refactor

**Phase 2 - Foundations (semaine 2-3)**
3. **store** pour chat principal → Performance + persistence
4. **memory** pour historique conversations → Contexte utilisateur

**Phase 3 - Advanced (mois 1+)**
5. **artifacts** pour dashboards/visualisations → UX améliorée
6. **agents** pour workflows multi-agents → Orchestration propre

### Packages standalone vs stack complète

**Utilisez packages isolément:**
- Cache seul pour optimiser tools existants
- Store seul pour améliorer chat UI
- Memory seul pour contexte agents

**Utilisez stack complète si:**
- Nouveau projet from scratch
- Refactor complet d'app existante
- Équipe dédiée AI/LLM avec best practices

### Alternative: Package unifié `ai-sdk-tools`

```bash
npm install ai-sdk-tools
```

```typescript
// Server-side
import { Agent, artifact, cached } from 'ai-sdk-tools'

// Client-side
import { useChat, useArtifact, AIDevtools } from 'ai-sdk-tools/client'
```

**Avantage**: Un seul package, versions synchro
**Inconvénient**: Bundle size si vous n'utilisez pas tout

---

## 📚 Ressources

- **Documentation**: README de chaque package (`packages/*/README.md`)
- **Exemples**: `/apps/example/src/ai/` (Next.js 15 real-world examples)
- **GitHub**: https://github.com/midday-ai/ai-sdk-tools
- **Issues**: https://github.com/midday-ai/ai-sdk-tools/issues

---

**Dernière mise à jour**: Document basé sur versions décembre 2024
