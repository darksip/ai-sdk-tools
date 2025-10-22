# Guide d'intégration : Streaming avec OpenRouter et Cost Tracking

Ce guide montre comment intégrer `@fondation-io/agents` dans une application Next.js avec streaming vers l'interface utilisateur, en utilisant le modèle Claude Sonnet 4.5 d'OpenRouter, et avec suivi automatique des coûts.

## Table des matières

1. [Installation](#installation)
2. [Configuration de base](#configuration-de-base)
3. [Backend : API Route avec Streaming](#backend--api-route-avec-streaming)
4. [Frontend : Composant React avec useChat](#frontend--composant-react-avec-usechat)
5. [Configuration du Cost Tracking](#configuration-du-cost-tracking)
6. [Exemple complet](#exemple-complet)
7. [Multi-agents avec Handoffs](#multi-agents-avec-handoffs)
8. [Troubleshooting](#troubleshooting)

---

## Installation

```bash
# Packages requis
npm install @fondation-io/agents @fondation-io/store
npm install @openrouter/ai-sdk-provider ai

# Pour le cost tracking (optionnel, si persistence DB)
npm install drizzle-orm @libsql/client
```

## Configuration de base

### 1. Variables d'environnement

Créez un fichier `.env.local` :

```bash
# OpenRouter API Key (https://openrouter.ai/keys)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx

# Base de données pour le cost tracking (optionnel)
DATABASE_URL=libsql://your-database.turso.io
DATABASE_AUTH_TOKEN=your-token
```

### 2. Configuration du Cost Tracking Global

Créez `lib/usage-tracking.ts` :

```typescript
import { configureUsageTracking, extractOpenRouterUsage } from '@fondation-io/agents';
import { db } from './db'; // Votre instance Drizzle
import { usageTable } from './schema';

// Configuration une seule fois au démarrage de l'application
export function setupUsageTracking() {
  configureUsageTracking({
    onUsage: async (event) => {
      // Extraire les informations de coût OpenRouter
      const openRouterUsage = extractOpenRouterUsage({
        providerMetadata: event.providerMetadata
      });

      // Persister en base de données
      try {
        await db.insert(usageTable).values({
          agentName: event.agentName,
          sessionId: event.sessionId,
          userId: event.context?.userId as string | undefined,

          // Tokens
          totalTokens: event.usage?.totalTokens || 0,
          promptTokens: event.usage?.promptTokens || 0,
          completionTokens: event.usage?.completionTokens || 0,

          // Coûts OpenRouter
          cost: openRouterUsage?.cost || 0,
          model: openRouterUsage?.model,

          // Métadonnées
          method: event.method,
          finishReason: event.finishReason,
          duration: event.duration,
          handoffChain: event.handoffChain,

          timestamp: new Date(),
        });

        // Log pour monitoring
        console.log(`[Usage] ${event.agentName}: ${event.usage?.totalTokens} tokens, $${openRouterUsage?.cost || 0}`);
      } catch (error) {
        console.error('Failed to save usage:', error);
      }
    },

    onError: (error, event) => {
      console.error('Usage tracking error:', error);
      // Envoi à votre service de monitoring (Sentry, etc.)
    }
  });
}
```

### 3. Schéma de base de données (optionnel)

Créez `lib/schema.ts` pour Drizzle :

```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const usageTable = sqliteTable('usage_tracking', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Context
  agentName: text('agent_name').notNull(),
  sessionId: text('session_id'),
  userId: text('user_id'),

  // Usage
  totalTokens: integer('total_tokens').notNull(),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),

  // Cost (OpenRouter)
  cost: real('cost').notNull(),
  model: text('model'),

  // Metadata
  method: text('method'),
  finishReason: text('finish_reason'),
  duration: integer('duration'),
  handoffChain: text('handoff_chain'), // JSON array

  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});
```

---

## Backend : API Route avec Streaming

### Version Simple (Single Agent)

Créez `app/api/chat/route.ts` :

```typescript
import { Agent } from '@fondation-io/agents';
import { openrouter } from '@openrouter/ai-sdk-provider';

export const runtime = 'edge'; // ou 'nodejs'

// ⚠️ IMPORTANT: usage: { include: true } est REQUIS pour le cost tracking
const agent = new Agent({
  name: 'Assistant',
  model: openrouter('anthropic/claude-sonnet-4.5', {
    usage: { include: true } // ← REQUIS pour obtenir les coûts
  }),
  instructions: 'You are a helpful AI assistant. Be concise and accurate.',
});

export async function POST(req: Request) {
  const { message, id } = await req.json();

  if (!message) {
    return new Response(
      JSON.stringify({ error: 'No message provided' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Stream la réponse avec toUIMessageStream
  return agent.toUIMessageStream({
    message,
    context: {
      chatId: id || 'default',
      sessionId: req.headers.get('x-session-id') || 'default',
      userId: req.headers.get('x-user-id'),
    } as any,
    maxRounds: 5,
    maxSteps: 10,
  });
}
```

### Version Avancée (Avec Tools et Configuration)

```typescript
import { Agent } from '@fondation-io/agents';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import { tool } from 'ai';

// Définir des tools
const weatherTool = tool({
  description: 'Get the current weather for a location',
  parameters: z.object({
    location: z.string().describe('City name'),
  }),
  execute: async ({ location }) => {
    // Appel à une API météo
    return {
      location,
      temperature: 22,
      condition: 'Sunny',
    };
  },
});

const searchTool = tool({
  description: 'Search the web for information',
  parameters: z.object({
    query: z.string().describe('Search query'),
  }),
  execute: async ({ query }) => {
    // Appel à une API de recherche
    return {
      results: ['Result 1', 'Result 2'],
    };
  },
});

// Agent avec tools et configuration avancée
const agent = new Agent({
  name: 'SmartAssistant',
  model: openrouter('anthropic/claude-sonnet-4.5', {
    usage: { include: true },
  }),
  instructions: `You are an intelligent assistant with access to weather and search tools.

When users ask about weather, use the weather tool.
When users need to search for information, use the search tool.
Always be helpful and provide accurate information.`,

  tools: {
    get_weather: weatherTool,
    search_web: searchTool,
  },

  maxTurns: 10, // Limite le nombre de tours pour éviter les boucles infinies
});

export async function POST(req: Request) {
  try {
    const { message, id } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'No message provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extraction de métadonnées du header ou du body
    const sessionId = req.headers.get('x-session-id') || crypto.randomUUID();
    const userId = req.headers.get('x-user-id');

    return agent.toUIMessageStream({
      message,
      context: {
        chatId: id || 'default',
        sessionId,
        userId,
        timestamp: new Date().toISOString(),
      } as any,
      maxRounds: 5,
      maxSteps: 10,
    });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

---

## Frontend : Composant React avec useChat

### Version Simple

```tsx
'use client';

import { useChat } from '@fondation-io/store';

export default function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      {/* Zone de messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-4 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-[80%]'
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <div className="font-semibold mb-1">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        ))}

        {isLoading && (
          <div className="bg-gray-100 p-4 rounded-lg max-w-[80%]">
            <div className="flex items-center space-x-2">
              <div className="animate-pulse">Assistant is typing...</div>
            </div>
          </div>
        )}
      </div>

      {/* Formulaire de saisie */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

### Version Avancée (Avec Tool Calls et Status)

```tsx
'use client';

import { useChat } from '@fondation-io/store';
import { Message } from 'ai';

export default function AdvancedChatInterface() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
  } = useChat({
    api: '/api/chat',
    headers: {
      'x-session-id': getOrCreateSessionId(),
      'x-user-id': getCurrentUserId(),
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Header avec stats */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h1 className="text-2xl font-bold mb-2">AI Assistant</h1>
        <div className="text-sm text-gray-600">
          Messages: {messages.length} |
          Model: Claude Sonnet 4.5 (OpenRouter)
        </div>
      </div>

      {/* Zone de messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="bg-gray-100 p-4 rounded-lg max-w-[80%]">
            <div className="flex items-center space-x-2">
              <LoadingSpinner />
              <span>Assistant is thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 p-4 rounded-lg">
            <p className="text-red-700">Error: {error.message}</p>
            <button
              onClick={() => reload()}
              className="mt-2 text-sm text-red-600 underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Formulaire de saisie */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask me anything..."
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        {isLoading ? (
          <button
            type="button"
            onClick={stop}
            className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}

// Composant pour afficher un message avec support des tool calls
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`p-4 rounded-lg ${
        isUser
          ? 'bg-blue-100 ml-auto max-w-[80%]'
          : 'bg-gray-100 mr-auto max-w-[80%]'
      }`}
    >
      <div className="font-semibold mb-1">
        {isUser ? 'You' : 'Assistant'}
      </div>

      {/* Contenu du message */}
      <div className="whitespace-pre-wrap">{message.content}</div>

      {/* Affichage des tool calls */}
      {message.toolInvocations && message.toolInvocations.length > 0 && (
        <div className="mt-3 space-y-2">
          {message.toolInvocations.map((tool: any, idx: number) => (
            <div key={idx} className="text-sm bg-white p-2 rounded border">
              <div className="font-mono text-xs text-gray-600">
                🔧 {tool.toolName}
              </div>
              {tool.result && (
                <div className="mt-1 text-xs">
                  <pre className="overflow-x-auto">
                    {JSON.stringify(tool.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent" />
  );
}

// Helpers
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('session-id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('session-id', sessionId);
  }
  return sessionId;
}

function getCurrentUserId(): string | undefined {
  // Récupérer depuis votre système d'auth
  return undefined; // ou auth.userId
}
```

---

## Configuration du Cost Tracking

### Initialisation dans votre application

Dans votre fichier `app/layout.tsx` ou point d'entrée serveur :

```typescript
import { setupUsageTracking } from '@/lib/usage-tracking';

// Configurer le tracking une fois au démarrage
if (process.env.NODE_ENV === 'production') {
  setupUsageTracking();
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### Dashboard de monitoring des coûts

Créez `app/admin/usage/page.tsx` :

```typescript
import { db } from '@/lib/db';
import { usageTable } from '@/lib/schema';
import { desc, sum, count } from 'drizzle-orm';

export default async function UsageDashboard() {
  // Statistiques globales
  const stats = await db
    .select({
      totalCost: sum(usageTable.cost),
      totalTokens: sum(usageTable.totalTokens),
      totalRequests: count(),
    })
    .from(usageTable);

  // Dernières 50 requêtes
  const recentUsage = await db
    .select()
    .from(usageTable)
    .orderBy(desc(usageTable.timestamp))
    .limit(50);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Usage Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Total Cost</div>
          <div className="text-3xl font-bold">
            ${stats[0].totalCost?.toFixed(4) || '0.0000'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Total Tokens</div>
          <div className="text-3xl font-bold">
            {stats[0].totalTokens?.toLocaleString() || '0'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Total Requests</div>
          <div className="text-3xl font-bold">
            {stats[0].totalRequests || 0}
          </div>
        </div>
      </div>

      {/* Recent usage table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Agent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Tokens
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Model
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {recentUsage.map((usage) => (
              <tr key={usage.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {new Date(usage.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {usage.agentName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {usage.totalTokens.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                  ${usage.cost.toFixed(6)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {usage.model}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Multi-agents avec Handoffs

### Backend avec système de handoff

```typescript
import { Agent } from '@fondation-io/agents';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import { tool } from 'ai';

// Modèle partagé
const model = openrouter('anthropic/claude-sonnet-4.5', {
  usage: { include: true },
});

// Agent de support technique
const technicalSupport = new Agent({
  name: 'TechnicalSupport',
  model,
  instructions: `You are a technical support specialist.
Help users with technical issues, troubleshooting, and configuration.
If the question is about billing, hand off to the billing agent.`,
  tools: {
    check_system_status: tool({
      description: 'Check if systems are operational',
      parameters: z.object({}),
      execute: async () => ({
        status: 'All systems operational',
      }),
    }),
  },
});

// Agent de facturation
const billingSupport = new Agent({
  name: 'BillingSupport',
  model,
  instructions: `You are a billing specialist.
Help users with invoices, payments, and subscription questions.
If the question is technical, hand off to technical support.`,
  tools: {
    check_invoice: tool({
      description: 'Check invoice status',
      parameters: z.object({
        invoiceId: z.string(),
      }),
      execute: async ({ invoiceId }) => ({
        invoiceId,
        status: 'Paid',
        amount: 99.99,
      }),
    }),
  },
});

// Agent de triage (point d'entrée)
const triageAgent = new Agent({
  name: 'Triage',
  model,
  instructions: `You are a triage agent. Analyze the user's question and route them to:
- TechnicalSupport for technical issues
- BillingSupport for billing questions

Always route on the first message.`,
  handoffs: [technicalSupport, billingSupport],
});

export async function POST(req: Request) {
  const { message, id } = await req.json();

  if (!message) {
    return new Response(
      JSON.stringify({ error: 'No message provided' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return triageAgent.toUIMessageStream({
    message,
    context: {
      chatId: id || 'default',
      sessionId: req.headers.get('x-session-id') || 'default',
    } as any,
    maxRounds: 5,
    maxSteps: 10,
  });
}
```

### Frontend qui affiche les handoffs

```tsx
'use client';

import { useChat } from '@fondation-io/store';

export default function MultiAgentChat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, data } = useChat({
    api: '/api/chat-multi',
  });

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Affichage de l'agent actif */}
      {data && data.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm">
            <span className="font-semibold">Current Agent: </span>
            <span className="text-blue-700">
              {data[data.length - 1]?.agentName || 'Unknown'}
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-4 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-[80%]'
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <div className="font-semibold mb-1">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about technical or billing issues..."
          className="flex-1 p-3 border rounded-lg"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

---

## Troubleshooting

### Coûts affichés à $0

**Problème**: Le cost tracking montre toujours $0.

**Solution**: Vérifiez que vous avez ajouté `usage: { include: true }` :

```typescript
// ❌ Incorrect - pas de coûts
const agent = new Agent({
  model: openrouter('anthropic/claude-sonnet-4.5'),
});

// ✅ Correct - coûts trackés
const agent = new Agent({
  model: openrouter('anthropic/claude-sonnet-4.5', {
    usage: { include: true }
  }),
});
```

### Streaming ne fonctionne pas

**Problème**: Les messages n'apparaissent pas progressivement.

**Solution**:
1. Vérifiez que vous utilisez `agent.stream()` et non `agent.generate()`
2. Vérifiez que vous retournez `result.toDataStreamResponse()`
3. Vérifiez la configuration de votre runtime (`edge` ou `nodejs`)

### Session ID manquant dans le tracking

**Problème**: `event.sessionId` est undefined dans le cost tracking.

**Solution**: Passez le sessionId dans le context :

```typescript
const result = agent.stream({
  messages,
  context: {
    sessionId: 'your-session-id', // ← Important
  } as any,
});
```

### Erreur d'authentification OpenRouter

**Problème**: 401 Unauthorized de OpenRouter.

**Solution**:
1. Vérifiez que `OPENROUTER_API_KEY` est défini dans `.env.local`
2. Vérifiez que la clé commence par `sk-or-v1-`
3. Testez la clé sur https://openrouter.ai/playground

### Tool calls ne fonctionnent pas

**Problème**: Les tools ne sont jamais appelés.

**Solution**:
1. Vérifiez que vos tools sont bien déclarés avec `tool()` d'AI SDK
2. Vérifiez que les descriptions sont claires et précises
3. Testez avec un prompt explicite demandant l'utilisation du tool

---

## Exemples complets

Consultez les exemples complets dans :
- `packages/agents/src/examples/usage-tracking/`
- `docs/guides/openrouter-native-support.md`

## Ressources

- [Documentation @fondation-io/agents](../../packages/agents/README.md)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Guide OpenRouter Cost Tracking](../../packages/agents/src/examples/usage-tracking/OPENROUTER-COST-TRACKING.md)
