# Exemple minimal : 2 agents avec handoff et streaming

Cet exemple montre comment créer un système minimal avec 2 agents :
- Un agent de **triage** qui route les demandes
- Un agent **spécialisé** (support technique)

## Architecture

```
User → Triage Agent → Technical Support Agent → Stream Response
```

L'agent de triage :
1. **Récupère l'historique** de la conversation depuis la mémoire
2. **Analyse** le message utilisateur
3. **Décide** du handoff vers l'agent spécialisé
4. **Stream** la réponse vers l'interface

## Code complet

### Backend : `/app/api/chat/route.ts`

```typescript
import { Agent } from '@fondation-io/agents';
import { openrouter } from '@openrouter/ai-sdk-provider';

// ========================================
// AGENT SPÉCIALISÉ : Support Technique
// ========================================

const technicalAgent = new Agent({
  name: 'TechnicalSupport',
  model: openrouter('anthropic/claude-sonnet-4.5', {
    usage: { include: true }, // ← REQUIS pour cost tracking
  }),
  instructions: `You are a technical support specialist.

Help users with:
- Password resets
- Login issues
- Account configuration
- Technical troubleshooting

Be concise and provide step-by-step solutions.`,
});

// ========================================
// AGENT DE TRIAGE (Point d'entrée)
// ========================================

const triageAgent = new Agent({
  name: 'Triage',
  model: openrouter('anthropic/claude-sonnet-4.5', {
    usage: { include: true },
  }),
  instructions: `You are a routing specialist. Analyze the user's request and route it to the appropriate agent.

ROUTING RULES:
- For technical issues (password, login, errors) → hand off to TechnicalSupport
- For greetings or general questions → answer directly

Your ONLY job is to route. Do NOT try to solve technical problems yourself.`,

  // Configuration du handoff
  handoffs: [technicalAgent],

  // Limite à 1 tour pour forcer le handoff immédiat
  maxTurns: 1,
});

// ========================================
// API ROUTE HANDLER
// ========================================

export async function POST(req: Request) {
  const { message, id } = await req.json();

  if (!message) {
    return new Response(
      JSON.stringify({ error: 'No message provided' }),
      { status: 400 }
    );
  }

  // Contexte utilisateur (pour la mémoire)
  const context = {
    chatId: id || 'default',
    userId: 'user-123', // Récupérer depuis votre auth
  };

  // ⚠️ IMPORTANT : Utiliser toUIMessageStream, pas stream()
  return triageAgent.toUIMessageStream({
    message,           // ← Un seul message, pas un array
    context: context as any,
    maxRounds: 5,      // Nombre max de rounds agent → agent
    maxSteps: 10,      // Nombre max d'étapes par agent
    strategy: 'auto',  // Stratégie de routing
  });
}
```

### Frontend : `/app/page.tsx`

```typescript
'use client';

import { useChat } from '@fondation-io/store';
import { useState } from 'react';

export default function ChatPage() {
  const [input, setInput] = useState('');

  const { messages, sendMessage, status } = useChat({
    api: '/api/chat',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    sendMessage({ text: input });
    setInput('');
  };

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

        {status === 'streaming' && (
          <div className="bg-gray-100 p-4 rounded-lg max-w-[80%] animate-pulse">
            Assistant is typing...
          </div>
        )}
      </div>

      {/* Formulaire de saisie */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for technical help..."
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={status === 'streaming'}
        />
        <button
          type="submit"
          disabled={status === 'streaming' || !input.trim()}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

## Comment ça fonctionne

### 1. Récupération de la conversation

L'agent récupère automatiquement l'historique via la **mémoire** :

- Le `chatId` dans le contexte identifie la conversation
- L'agent charge les derniers messages de cette conversation
- L'historique est passé automatiquement au LLM

**Note** : Pour activer la mémoire, ajoutez la configuration :

```typescript
const triageAgent = new Agent({
  name: 'Triage',
  // ... autres configs
  memory: {
    provider: memoryProvider, // Votre provider Redis/InMemory
    history: {
      enabled: true,
      limit: 10, // Derniers 10 messages
    },
  },
});
```

### 2. Décision de handoff

Le triage agent analyse le message et décide :

1. **Message technique** (password, login, error) :
   - Appelle automatiquement le tool `handoff_to_agent`
   - Avec `{ agent: "TechnicalSupport" }`
   - Le système transfert vers `technicalAgent`

2. **Message général** (hello, thanks) :
   - Répond directement
   - Pas de handoff

**Comment le LLM décide ?**
- Les instructions du triage incluent les règles de routing
- Le LLM a accès à un tool `handoff_to_agent` généré automatiquement
- Le LLM choisit d'appeler ce tool quand nécessaire

### 3. Stream vers l'interface

```typescript
// Backend
return triageAgent.toUIMessageStream({
  message,
  context,
  // ...
});
```

Cette méthode :
1. Exécute l'agent (potentiellement avec handoffs)
2. Stream progressivement les tokens générés
3. Retourne une Response compatible AI SDK
4. Le frontend reçoit les chunks progressivement via `useChat`

**Flow détaillé** :

```
Backend:
  toUIMessageStream()
    → execute agent
    → detect handoff tool call
    → transfer to technicalAgent
    → stream technicalAgent response
    → return Response

Frontend:
  useChat hook
    → POST /api/chat
    → receive stream chunks
    → update messages state
    → trigger re-render
```

## Test de l'exemple

### Scénario 1 : Question technique (avec handoff)

**User** : "I forgot my password"

**Flow** :
1. Triage agent reçoit le message
2. Charge les 10 derniers messages de la conversation
3. Analyse : "password" → problème technique
4. Décide : handoff vers TechnicalSupport
5. TechnicalSupport génère la réponse
6. Stream vers l'interface

**Résultat** : Guide de reset de password

### Scénario 2 : Salutation (pas de handoff)

**User** : "Hello!"

**Flow** :
1. Triage agent reçoit le message
2. Charge l'historique
3. Analyse : salutation simple
4. Décide : répondre directement
5. Stream vers l'interface

**Résultat** : Réponse de bienvenue

## Différences importantes avec le guide précédent

### ❌ Erreur dans le guide original

```typescript
// ❌ INCORRECT - Cette API n'existe pas
const result = agent.stream({
  messages,  // ← messages est un array
});
return result.toDataStreamResponse();
```

### ✅ API correcte

```typescript
// ✅ CORRECT - API réelle
return agent.toUIMessageStream({
  message,   // ← message est un objet unique
  context,
  maxRounds: 5,
});
```

### Différences clés

| Aspect | Guide original (❌ incorrect) | API réelle (✅ correct) |
|--------|------------------------------|------------------------|
| Méthode | `agent.stream()` | `agent.toUIMessageStream()` |
| Input | `messages: Message[]` | `message: Message` |
| Retour | `result.toDataStreamResponse()` | `Response` directement |
| Messages | Array de tous les messages | Dernier message seulement |
| Historique | Passé manuellement | Chargé automatiquement via memory |

## Configuration de la mémoire (optionnel)

Pour activer l'historique de conversation :

```typescript
import { MemoryProvider } from '@fondation-io/memory';

// Provider in-memory (dev)
const memoryProvider = new MemoryProvider();

// Ou Redis (production)
import { UpstashProvider } from '@fondation-io/memory';
import { Redis } from '@upstash/redis';

const memoryProvider = new UpstashProvider(
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
);

// Configurer sur l'agent
const triageAgent = new Agent({
  // ...
  memory: {
    provider: memoryProvider,
    history: {
      enabled: true,
      limit: 10,
    },
  },
});
```

## Cost tracking

Pour tracker les coûts, configurez le tracking global :

```typescript
// lib/usage-tracking.ts
import { configureUsageTracking, extractOpenRouterUsage } from '@fondation-io/agents';

export function setupUsageTracking() {
  configureUsageTracking((event) => {
    const usage = extractOpenRouterUsage({
      providerMetadata: event.providerMetadata
    });

    console.log(`[${event.agentName}] Tokens: ${event.usage?.totalTokens}, Cost: $${usage?.cost || 0}`);

    // Persister en DB si besoin
  });
}
```

Appelez `setupUsageTracking()` au démarrage de l'app :

```typescript
// app/layout.tsx
import { setupUsageTracking } from '@/lib/usage-tracking';

setupUsageTracking();

export default function RootLayout({ children }) {
  return <html><body>{children}</body></html>;
}
```

## Résumé

Ce qui est **automatique** :
- ✅ Récupération de l'historique (via memory config)
- ✅ Création du tool de handoff
- ✅ Transfert entre agents
- ✅ Streaming progressif
- ✅ Cost tracking (si configuré globalement)

Ce que vous **devez** faire :
- ✅ Définir les agents avec handoffs
- ✅ Fournir un `chatId` unique dans le context
- ✅ Utiliser `toUIMessageStream()` (pas `stream()`)
- ✅ Ajouter `usage: { include: true }` pour OpenRouter

## Voir aussi

- [Documentation complète des agents](../../packages/agents/README.md)
- [Configuration de la mémoire](../../packages/memory/README.md)
- [Usage tracking guide](../../packages/agents/docs/guides/usage-tracking-configuration.md)
