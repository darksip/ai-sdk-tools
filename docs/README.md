# Documentation @fondation-io/ai-sdk-tools

> **🔱 Fork Notice**
>
> Cette documentation fait partie du fork [@fondation-io/ai-sdk-tools](https://github.com/darksip/ai-sdk-tools) du projet original [AI SDK Tools](https://github.com/midday-ai/ai-sdk-tools) par Midday.

Bienvenue dans la documentation de l'écosystème AI SDK Tools adapté pour `@fondation-io`.

## 📚 Guides d'intégration

### Streaming et Cost Tracking

- **[Streaming Integration with Cost Tracking](./guides/streaming-integration-with-cost-tracking.md)** ⭐

  Guide complet pour intégrer les agents dans une application Next.js avec :
  - Streaming vers l'interface utilisateur
  - Modèle Claude Sonnet 4.5 d'OpenRouter
  - Suivi automatique des coûts et tokens
  - Persistence en base de données
  - Dashboard de monitoring
  - Multi-agents avec handoffs

### OpenRouter

- **[OpenRouter Native Support](./guides/openrouter-native-support.md)**

  Documentation du support natif d'OpenRouter dans `@fondation-io/agents` :
  - Configuration des modèles
  - Extraction des métadonnées de coût
  - Exemples d'utilisation
  - Best practices

- **[OpenRouter Integration](./openrouter-integration.md)**

  Guide original d'intégration OpenRouter avec analyse détaillée.

## 📦 Documentation des packages

### Packages serveur

- **[@fondation-io/agents](../packages/agents/README.md)**
  - Orchestration multi-agents
  - Handoffs automatiques
  - Guardrails et permissions
  - Global usage tracking
  - [Usage Tracking Guide](../packages/agents/docs/guides/usage-tracking-configuration.md)
  - [OpenRouter Cost Tracking](../packages/agents/src/examples/usage-tracking/OPENROUTER-COST-TRACKING.md)

- **[@fondation-io/memory](../packages/memory/README.md)**
  - Mémoire persistante pour agents
  - Providers : In-Memory, Redis, Drizzle
  - Working memory et chat history

- **[@fondation-io/cache](../packages/cache/README.md)**
  - Cache LRU pour tool calls
  - Support Redis et in-memory
  - Déduplication automatique

### Packages client

- **[@fondation-io/store](../packages/store/README.md)**
  - Drop-in replacement pour `@ai-sdk/react`
  - État global avec Zustand
  - Performance optimizations

- **[@fondation-io/artifacts](../packages/artifacts/README.md)**
  - Streaming d'objets structurés
  - Type-safety avec Zod
  - Progressive updates

- **[@fondation-io/devtools](../packages/devtools/README.md)**
  - Interface de debugging React
  - Visualisation des agents
  - Inspection des tool calls

### Package unifié

- **[@fondation-io/ai-sdk-tools](../packages/ai-sdk-tools/README.md)**
  - Package qui réexporte tous les autres
  - Imports server et client séparés

## 🎯 Cas d'usage par package

### Vous voulez...

**...tracker les coûts et l'utilisation** → `@fondation-io/agents` + Usage Tracking

- Guide : [Streaming Integration with Cost Tracking](./guides/streaming-integration-with-cost-tracking.md)
- Exemple : [packages/agents/src/examples/usage-tracking/](../packages/agents/src/examples/usage-tracking/)

**...orchestrer plusieurs agents spécialisés** → `@fondation-io/agents`

- README : [packages/agents/README.md](../packages/agents/README.md)
- Architecture : [analysis/agents-architecture.md](../analysis/agents-architecture.md)

**...gérer l'état côté client sans prop drilling** → `@fondation-io/store`

- README : [packages/store/README.md](../packages/store/README.md)
- Architecture : [analysis/store-memory-architecture.md](../analysis/store-memory-architecture.md)

**...ajouter de la mémoire persistante** → `@fondation-io/memory`

- README : [packages/memory/README.md](../packages/memory/README.md)

**...cacher des appels de tools coûteux** → `@fondation-io/cache`

- README : [packages/cache/README.md](../packages/cache/README.md)

**...streamer des objets structurés (charts, code)** → `@fondation-io/artifacts`

- README : [packages/artifacts/README.md](../packages/artifacts/README.md)

**...debugger vos agents en dev** → `@fondation-io/devtools`

- README : [packages/devtools/README.md](../packages/devtools/README.md)

## 📊 Analyses architecturales

Documentation approfondie de l'architecture du projet :

- **[Agents Architecture](../analysis/agents-architecture.md)**
  - Architecture détaillée du système d'agents
  - Patterns et décisions de design
  - Flow d'exécution complet
  - Global usage tracking system

- **[Store & Memory Architecture](../analysis/store-memory-architecture.md)**
  - Architecture du state management
  - Système de mémoire persistante
  - Intégration Zustand + AI SDK

- **[Next.js Integration Guide](../analysis/ai-sdk-tools-nextjs-integration-guide.md)**
  - Analyse de chaque package dans le contexte Next.js
  - Quand utiliser quoi
  - Exemples d'intégration

## 🚀 Quick Start

### Installation

```bash
# Package unifié (recommandé)
npm install @fondation-io/ai-sdk-tools

# Ou packages individuels
npm install @fondation-io/agents @fondation-io/store
```

### Exemple minimal avec streaming et cost tracking

**Backend** (`app/api/chat/route.ts`):

```typescript
import { Agent } from '@fondation-io/agents';
import { openrouter } from '@openrouter/ai-sdk-provider';

const agent = new Agent({
  name: 'Assistant',
  model: openrouter('anthropic/claude-sonnet-4.5', {
    usage: { include: true } // ← REQUIS pour cost tracking
  }),
  instructions: 'You are helpful.',
});

export async function POST(req: Request) {
  const { message, id } = await req.json();
  return agent.toUIMessageStream({
    message,
    context: { chatId: id || 'default' } as any,
    maxRounds: 5,
  });
}
```

**Frontend** (composant React):

```typescript
'use client';

import { useChat } from '@fondation-io/store';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
```

**Cost Tracking** (point d'entrée app):

```typescript
import { configureUsageTracking, extractOpenRouterUsage } from '@fondation-io/agents';

configureUsageTracking((event) => {
  const usage = extractOpenRouterUsage({ providerMetadata: event.providerMetadata });
  console.log(`Cost: $${usage?.cost}, Tokens: ${event.usage?.totalTokens}`);
});
```

Voir le [guide complet](./guides/streaming-integration-with-cost-tracking.md) pour plus de détails.

## ⚠️ Important : OpenRouter Cost Tracking

Pour tracker les coûts avec OpenRouter, vous **devez** activer `usage: { include: true }` :

```typescript
// ❌ Incorrect - pas de coûts
openrouter('anthropic/claude-sonnet-4.5')

// ✅ Correct - coûts trackés
openrouter('anthropic/claude-sonnet-4.5', {
  usage: { include: true }
})
```

Sans ce flag, `extractOpenRouterUsage()` retournera `cost: 0`.

Voir : [OpenRouter Cost Tracking Guide](../packages/agents/src/examples/usage-tracking/OPENROUTER-COST-TRACKING.md)

## 🔗 Liens utiles

- **Repository**: https://github.com/darksip/ai-sdk-tools
- **npm**: https://www.npmjs.com/org/fondation-io
- **Upstream**: https://github.com/midday-ai/ai-sdk-tools
- **OpenRouter**: https://openrouter.ai/docs
- **AI SDK**: https://sdk.vercel.ai/docs

## 📝 Versions

Versions actuelles des packages :

- `@fondation-io/agents`: **1.1.0**
- `@fondation-io/ai-sdk-tools`: **1.0.1**
- `@fondation-io/store`: **1.0.0**
- `@fondation-io/memory`: **1.0.0**
- `@fondation-io/cache`: **1.0.0**
- `@fondation-io/artifacts`: **1.0.0**
- `@fondation-io/devtools`: **1.0.0**
- `@fondation-io/debug`: **1.0.0**

## 🙏 Crédits

Ce projet est un fork de [AI SDK Tools](https://github.com/midday-ai/ai-sdk-tools) par l'équipe [Midday](https://midday.ai). Tous les crédits pour l'architecture originale reviennent aux auteurs originaux.

Modifications du fork :
- Scope npm : `@fondation-io` (au lieu de `@ai-sdk-tools`)
- Package `@fondation-io/debug` pour utilitaires partagés
- Global usage tracking system (v1.1.0)
- Documentation francophone étendue
- Support natif OpenRouter avec cost tracking

---

**Dernière mise à jour**: Octobre 2025 • Version: 1.1.0
