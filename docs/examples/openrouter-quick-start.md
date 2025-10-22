# OpenRouter Quick Start - Example Validé

Ce guide montre comment configurer une application multi-agents avec OpenRouter, basé sur l'exemple fonctionnel dans `apps/example`.

## ✅ Configuration Validée

Cette configuration a été testée et validée avec :
- **Provider**: `@openrouter/ai-sdk-provider@1.2.0`
- **Modèle**: `anthropic/claude-haiku-4.5`
- **Framework**: Next.js 15 + React 19
- **Packages**: `@fondation-io/agents`, `@fondation-io/store`, `@fondation-io/memory`

## Installation

```bash
# 1. Installer les packages nécessaires
bun add @openrouter/ai-sdk-provider @fondation-io/agents @fondation-io/store

# 2. Optionnel : mémoire persistante
bun add @upstash/redis @fondation-io/memory
```

## Configuration

### 1. Variables d'environnement

`.env.local` :
```bash
# OpenRouter API Key (requis)
OPENROUTER_API_KEY=sk-or-v1-...

# Mémoire persistante (optionnel - utilise in-memory par défaut)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### 2. Configuration des Agents

`src/ai/agents/shared.ts` :
```typescript
import { openrouter } from "@openrouter/ai-sdk-provider";
import { Agent } from "@fondation-io/agents";
import { UpstashProvider } from "@fondation-io/memory";
import { Redis } from "@upstash/redis";
import type { AgentConfig } from "@fondation-io/agents";

// ✅ Configuration du provider OpenRouter
export const defaultModel = openrouter("anthropic/claude-haiku-4.5");

// ✅ Configuration de la mémoire (optionnel)
export const memoryProvider = new UpstashProvider(
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
);

// ✅ Helper pour créer des agents
export interface AppContext {
  userId: string;
  chatId: string;
  currentDateTime: string;
  [key: string]: unknown;
}

export const createAgent = (config: AgentConfig<AppContext>) => {
  return new Agent<AppContext>({
    modelSettings: {
      parallel_tool_calls: true,
    },
    ...config,
    memory: {
      provider: memoryProvider,
      history: {
        enabled: true,
        limit: 10,
      },
      workingMemory: {
        enabled: true,
        scope: "user",
      },
      chats: {
        enabled: true,
        generateTitle: {
          model: openrouter("anthropic/claude-haiku-4.5"),
          instructions: "Generate a short title (max 50 chars). Plain text only."
        },
        generateSuggestions: {
          enabled: true,
          model: openrouter("anthropic/claude-haiku-4.5"),
          limit: 5,
        },
      },
    }
  });
};
```

### 3. Créer des Agents Spécialisés

`src/ai/agents/support.ts` :
```typescript
import { createAgent, defaultModel, type AppContext } from "./shared";
import { supportTools } from "../tools/support";

export const supportAgent = createAgent({
  name: "support",
  model: defaultModel,
  instructions: (ctx: AppContext) => `You are a support specialist.

Current context:
- Date: ${ctx.currentDateTime}
- User: ${ctx.userId}

Provide helpful support with available tools.`,
  tools: supportTools,
  maxTurns: 5,
});
```

`src/ai/agents/triage.ts` :
```typescript
import { createAgent, defaultModel, type AppContext } from "./shared";
import { supportAgent } from "./support";

export const triageAgent = createAgent({
  name: "triage",
  model: defaultModel,
  modelSettings: {
    toolChoice: "required",
    activeTools: ["handoff_to_agent"],
  },
  instructions: (ctx: AppContext) => `You are a routing specialist.

ROUTING RULES:
- Support questions → **support** agent
- General questions → answer directly

Current context:
- Date: ${ctx.currentDateTime}`,
  handoffs: [supportAgent],
  maxTurns: 1,
});
```

### 4. API Route

`app/api/chat/route.ts` :
```typescript
import { smoothStream } from "ai";
import type { NextRequest } from "next/server";
import { triageAgent } from "@/ai/agents/triage";

export async function POST(request: NextRequest) {
  const { message, id } = await request.json();

  if (!message) {
    return new Response(JSON.stringify({ error: "No message provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ✅ Construire le contexte dynamiquement
  const appContext = {
    userId: "user-123", // Récupérer depuis votre système d'auth
    chatId: id,
    currentDateTime: new Date().toISOString(),
  };

  // ✅ Streamer la réponse vers l'UI
  return triageAgent.toUIMessageStream({
    message,
    strategy: "auto",
    maxRounds: 5,
    maxSteps: 20,
    context: appContext,
    experimental_transform: smoothStream({ chunking: "word" }),
  });
}
```

### 5. Frontend avec useChat

`app/page.tsx` :
```typescript
"use client";

import { useChat } from "@fondation-io/store";

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "bg-blue-100 p-4 rounded-lg ml-auto max-w-[80%]"
                : "bg-gray-100 p-4 rounded-lg mr-auto max-w-[80%]"
            }
          >
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="bg-gray-100 p-4 rounded-lg animate-pulse">
            Assistant is typing...
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          className="flex-1 p-3 border rounded-lg"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

## Modèles OpenRouter Recommandés

| Modèle | Usage | Prix (approx.) |
|--------|-------|----------------|
| `anthropic/claude-haiku-4.5` | **Recommandé** - Rapide et économique | Très bas |
| `anthropic/claude-3.5-sonnet` | Tâches complexes, haute qualité | Moyen |
| `openai/gpt-4o-mini` | Alternative économique | Bas |
| `openai/gpt-4o` | Tâches complexes | Élevé |
| `google/gemini-pro-1.5` | Long contexte (2M tokens) | Moyen |

Voir tous les modèles : https://openrouter.ai/models

## Fonctionnalités Automatiques

✅ **Handoffs entre agents** - Le triage route automatiquement vers les agents spécialisés
✅ **Historique de conversation** - Chargement automatique des 10 derniers messages
✅ **Working Memory** - Mémorisation des informations utilisateur
✅ **Génération de titres** - Titres de chat automatiques
✅ **Suggestions** - 5 suggestions de suivi générées automatiquement
✅ **Streaming** - Affichage progressif des réponses

## Architecture de l'Exemple

```
User Input
    ↓
Frontend (useChat)
    ↓
POST /api/chat
    ↓
Triage Agent (Claude Haiku 4.5)
    ├─ Analyse le message
    ├─ Charge l'historique (memory)
    └─ Décide routing
        ↓
Support Agent (Claude Haiku 4.5)
    ├─ Execute tools si nécessaire
    └─ Génère réponse
        ↓
Stream Response → Frontend
```

## Différences avec OpenAI

### Avec OpenAI (ancien)
```typescript
import { openai } from "@ai-sdk/openai";

const model = openai("gpt-4o-mini");
```

### Avec OpenRouter (nouveau ✅)
```typescript
import { openrouter } from "@openrouter/ai-sdk-provider";

const model = openrouter("anthropic/claude-haiku-4.5");
```

**Avantages d'OpenRouter** :
- 300+ modèles (Claude, GPT, Gemini, Llama, etc.)
- Souvent moins cher que les APIs directes
- Une seule API key pour tous les providers
- Fallback automatique entre modèles
- Dashboard de monitoring inclus

## Troubleshooting

### Le stream se termine sans réponse

**Problème** : Mauvais nom de modèle ou provider mal configuré

**Solution** :
```typescript
// ❌ Mauvais - utilisation de createOpenAI
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  // ...
});

// ✅ Bon - utilisation du provider officiel
import { openrouter } from "@openrouter/ai-sdk-provider";
const model = openrouter("anthropic/claude-haiku-4.5");
```

### Erreur "model not found"

Vérifiez le nom exact du modèle sur https://openrouter.ai/models

### Mémoire ne fonctionne pas

Vérifiez :
1. Les variables d'environnement UPSTASH sont définies
2. Le provider est bien passé à `createAgent`
3. Le `chatId` est unique et cohérent dans le contexte

## Voir Aussi

- [Guide complet OpenRouter](../guides/openrouter-native-support.md)
- [Exemple minimal 2 agents](./minimal-two-agent-handoff.md)
- [Streaming avec cost tracking](../guides/streaming-integration-with-cost-tracking.md)
- [Code source de l'exemple](../../apps/example/)
