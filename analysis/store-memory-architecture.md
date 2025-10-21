# Architecture Store & Memory - AI SDK Tools (@fondation-io)

> **🔱 Fork Notice**
>
> Ce document fait partie du fork [@fondation-io/ai-sdk-tools](https://github.com/darksip/ai-sdk-tools) du projet original [AI SDK Tools](https://github.com/midday-ai/ai-sdk-tools) par Midday.

## Vue d'ensemble

Ce document détaille l'architecture des systèmes de gestion d'état (Store) et de mémoire persistante (Memory) du projet AI SDK Tools, conçus pour des applications d'IA conversationnelle en production.

**Note**: Les références de packages utilisent le scope `@fondation-io` (fork) au lieu de `@ai-sdk-tools` (upstream).

**Objectif**: Fournir les informations architecturales nécessaires pour implémenter un système similaire dans un autre projet.

## ⚠️ Indépendance des packages

**Information critique**: Les packages **@fondation-io/store** et **@fondation-io/memory** sont **totalement indépendants** et utilisables sans le reste de l'écosystème ai-sdk-tools.

### Dépendances externes uniquement

**@fondation-io/store** :
- `ai` ^5.0.68
- `@ai-sdk/react` ≥2.0.0
- `react` ≥18.0.0
- `zustand` ≥5.0.0
- ✅ **Aucune dépendance interne au monorepo**

**@fondation-io/memory** :
- `zod` ^4.1.12
- `@upstash/redis` ^1.34.3 (optionnel)
- `drizzle-orm` ^0.36.0 (optionnel)
- ✅ **Aucune dépendance interne au monorepo**

### Utilisation standalone

Ces packages sont conçus comme des **utilitaires réutilisables** et peuvent être intégrés dans n'importe quelle infrastructure basée sur AI SDK v5, avec ou sans les autres packages (agents, artifacts, cache, devtools).

**Installation minimale** :
```bash
# Store uniquement
npm install @fondation-io/store zustand

# Memory uniquement
npm install @fondation-io/memory

# + provider optionnel
npm install @upstash/redis  # Redis serverless
# ou
npm install drizzle-orm     # SQL (PostgreSQL/MySQL/SQLite)
```

**Compatibilité** : Fonctionne avec n'importe quelle stack utilisant AI SDK v5, Next.js, React, ou autre framework compatible.

## ⚡ Séparation Client/Serveur

**Information critique** : Les packages ont des exigences d'exécution différentes.

### @fondation-io/store → 100% CLIENT

**Environnement** : Browser uniquement

**Raisons techniques** :
- Directive `"use client"` injectée sur tous les fichiers
- Utilise React hooks (useState, useEffect, useContext, useRef)
- Utilise Zustand (state management client)
- Dépend d'APIs browser : `requestAnimationFrame`, `requestIdleCallback`, `window.scheduler`
- Freeze detection utilise `performance.now()`

**Impossible de s'exécuter côté serveur** (Next.js Server Components, Node.js, etc.)

### @fondation-io/memory → 100% SERVER

**Environnement** : Node.js/serveur uniquement

**Raisons techniques** :
- Aucune directive `"use client"`
- Aucune dépendance React
- Providers de persistance serveur (Redis, SQL, in-memory)
- Pas d'API browser
- Conçu pour s'exécuter dans Route Handlers, Server Actions, API routes

**Impossible de s'exécuter côté client** (pas de Redis/SQL dans le browser)

### @fondation-io/artifacts → MIXTE (Architecture intelligente)

**2 points d'entrée séparés** :

```typescript
// tsup.config.ts
entry: ["src/index.ts", "src/client.ts"]
```

**Server-side** (`import from '@fondation-io/artifacts'`) :
- `artifact()` function : Création d'artifacts dans les AI tools
- Pas de `"use client"`
- S'exécute dans les Route Handlers / Server Actions

**Client-side** (`import from '@fondation-io/artifacts/client'`) :
- `useArtifact()` hook : Consommation dans React components
- Directive `"use client"` injectée uniquement sur `client.js`
- S'exécute dans les composants React

### @fondation-io/agents → 100% SERVER

**Environnement** : Node.js/serveur uniquement

**Raisons techniques** :
- Orchestration multi-agents
- Utilise AI SDK core (`generateText`, `streamText`)
- Pas de React, pas de browser APIs
- S'exécute côté serveur pour appeler les LLMs

### Architecture typique d'une application

```
┌─────────────────────────────────────┐
│   BROWSER (Client)                  │
│                                     │
│   @fondation-io/store               │  ← React hooks
│   - useChat()                       │  ← Zustand state
│   - useChatMessages()               │  ← Browser APIs
│                                     │
│   @fondation-io/artifacts/client    │  ← React hooks
│   - useArtifact()                   │
│                                     │
└─────────────┬───────────────────────┘
              │
              │ HTTP / WebSocket / SSE
              │
┌─────────────▼───────────────────────┐
│   SERVER (Node.js)                  │
│                                     │
│   @fondation-io/memory              │  ← Redis/SQL
│   - DrizzleProvider                 │  ← Persistence
│   - UpstashProvider                 │
│                                     │
│   @fondation-io/agents              │  ← AI SDK
│   - Agent.stream()                  │  ← LLM calls
│                                     │
│   @fondation-io/artifacts           │  ← AI tools
│   - artifact()                      │
│                                     │
└─────────────────────────────────────┘
```

### "React suffit" vs "Next.js pas obligatoire"

**"React suffit"** signifie que les packages n'utilisent **aucune API spécifique Next.js** :
- ❌ Pas de Server Actions Next.js
- ❌ Pas de middleware Next.js
- ❌ Pas de `getServerSideProps` / `getStaticProps`
- ✅ Juste React standard + AI SDK

**Architectures compatibles** :

| Stack | Store | Memory | Artifacts | Agents |
|-------|-------|--------|-----------|--------|
| **Next.js App Router** | ✅ Client Components | ✅ Server Components/Actions | ✅ Les deux | ✅ Server Components/Actions |
| **Next.js Pages Router** | ✅ Pages | ✅ API Routes | ✅ Les deux | ✅ API Routes |
| **Vite + React (SPA)** | ✅ Components | ❌ Besoin d'un backend séparé | ✅ Les deux | ❌ Besoin d'un backend séparé |
| **Remix** | ✅ Components | ✅ Loaders/Actions | ✅ Les deux | ✅ Loaders/Actions |
| **Astro + React** | ✅ Islands React | ✅ Endpoints Astro | ✅ Les deux | ✅ Endpoints Astro |
| **Express/Fastify** | ❌ Pas de React | ✅ Routes API | ⚠️ Serveur seulement | ✅ Routes API |

### Exemples d'intégration

**Vite + React + Express (SPA classique)** :
```bash
# Frontend (Vite)
npm install @fondation-io/store zustand

# Backend (Express)
npm install @fondation-io/memory @fondation-io/agents ai
```

**Next.js App Router (Full-stack)** :
```bash
# Tout dans un seul projet
npm install @fondation-io/store @fondation-io/memory zustand

# Store → "use client" components
# Memory → Server Components / Route Handlers
```

**Remix (Full-stack)** :
```bash
npm install @fondation-io/store @fondation-io/memory zustand

# Store → Components React
# Memory → Loaders / Actions
```

### Points d'attention

1. **Store ne peut PAS s'exécuter côté serveur** → Toujours dans `"use client"` components
2. **Memory ne peut PAS s'exécuter côté client** → Jamais dans le browser
3. **Artifacts est séparé** → Importer depuis `/client` pour les hooks React
4. **Next.js n'est pas requis** → Mais facilite l'intégration full-stack
5. **API boundary nécessaire** → Si SPA (Vite), besoin d'un serveur séparé pour Memory/Agents

---

## 1. Package Store (@fondation-io/store)

### 1.1 Informations générales

**Version**: 1.0.0
**Description**: Drop-in replacement pour @ai-sdk/react avec synchronisation automatique vers Zustand
**Philosophie**: Éliminer le prop drilling, optimiser les performances de streaming, maintenir la compatibilité totale avec l'AI SDK

### 1.2 Stack technique

| Dépendance | Version | Type | Rôle |
|------------|---------|------|------|
| react | ≥18.0.0 | peer | Runtime React |
| zustand | ≥5.0.0 | peer | State management |
| @ai-sdk/react | ≥2.0.0 | peer | Hooks AI officiels |
| ai | ^5.0.68 | direct | Core AI SDK |

**Configuration TypeScript**:
- Target: ES2020
- Module: ESNext (bundler resolution)
- Strict mode complet
- JSX: react-jsx

**Build**: tsup (ESM + CJS + types)

### 1.3 Architecture du store

#### 1.3.1 Pattern de base

Le store utilise **Zustand vanilla** avec middlewares:
- `devtools`: Intégration Redux DevTools
- `subscribeWithSelector`: Optimisation des souscriptions

```typescript
// Pattern de création du store
createStore<StoreState>()(
  devtools(
    subscribeWithSelector(createChatStoreCreator(initialMessages)),
    { name: "chat-store" }
  )
)
```

#### 1.3.2 État du store

**Structure de données** (`StoreState`):
- `messages`: Array de UIMessage (état principal)
- `_throttledMessages`: Version throttlée pour le rendering (~60fps)
- `_messageIndex`: Map pour lookups O(1)
- `_memoizedSelectors`: Cache de sélecteurs complexes
- `id`, `status`, `error`: Métadonnées de session
- Actions: Mutations batched et throttlées

**Point d'architecture remarquable**: Séparation entre messages "live" et "throttled"
```typescript
// Messages mis à jour immédiatement
messages: TMessage[]

// Messages throttlés à ~60fps pour éviter re-renders
_throttledMessages: TMessage[] | null

// Index pour accès O(1) par ID
_messageIndex: MessageIndex<TMessage>
```

### 1.4 Optimisations de performance critiques

#### 1.4.1 Batched Updates

**Problème résolu**: Éviter le thrashing de re-renders lors du streaming

**Implémentation**:
- Queue de priorité pour les updates
- Utilise `scheduler.postTask` (si disponible) → `requestAnimationFrame` → `setTimeout`
- Priorité élevée (1) pour les updates de streaming

```typescript
function batchUpdates(callback: () => void, priority = 0) {
  __updateQueue.push({ callback, priority });

  if (!__batchedUpdateScheduled) {
    __batchedUpdateScheduled = true;
    scheduler.postTask(() => {
      // Execute updates by priority
      updates.sort((a, b) => b.priority - a.priority);
      updates.forEach(u => u.callback());
    });
  }
}
```

#### 1.4.2 Throttling avec requestIdleCallback

**Mise à jour des throttledMessages**: 16ms (~60fps)

**Technique spéciale**:
```typescript
enhancedThrottle(func, 16) // avec fallback requestIdleCallback

// Exécute pendant idle time du browser
if (window.requestIdleCallback) {
  requestIdleCallback(execute, { timeout: 50 });
} else {
  execute();
}
```

#### 1.4.3 Freeze Detection (dev uniquement)

**Détection de blocages UI** > 80ms:
```typescript
const tick = (now: number) => {
  const blockedMs = now - expected;
  if (blockedMs > 80) {
    debug.warn(`${blockedMs}ms freeze`, "lastAction=", __lastActionLabel);
  }
  requestAnimationFrame(tick);
};
```

#### 1.4.4 Message Indexing

**Classe MessageIndex**: Évite les scans linéaires

```typescript
class MessageIndex<T> {
  private idToMessage = new Map<string, T>();
  private idToIndex = new Map<string, number>();

  // O(1) au lieu de O(n)
  getById(id: string): T | undefined
  getIndexById(id: string): number | undefined
}
```

### 1.5 Hooks optimisés

#### Pattern useShallow

**Évite les re-renders inutiles** sur objets/arrays:
```typescript
import { useShallow } from 'zustand/shallow';

useChatStore(
  useShallow((state) => state.getThrottledMessages())
);
```

#### Sélecteurs stables

**Important**: Définir les sélecteurs hors composant pour éviter re-création:
```typescript
// ✅ Stable
const statusSelector = (state) => state.status;
export const useChatStatus = () => useChatStore(statusSelector);

// ❌ Re-créé à chaque render
export const useChatStatus = () =>
  useChatStore((state) => state.status);
```

### 1.6 Synchronisation avec useChat

**Hook useChat**: Wrapper de @ai-sdk/react qui synchronise vers le store

**Technique de synchro**:
```typescript
useEffect(() => {
  // Préserve les messages server-side pendant l'hydration
  const shouldSyncMessages = !(
    storeMessages.length > 0 &&
    chatMessages.length === 0
  );

  // Sync avec batching optionnel
  if (enableBatching) {
    requestAnimationFrame(() => syncState(chatState));
  } else {
    syncState(chatState);
  }
}, [chatHelpers.messages, chatHelpers.status, ...]);
```

**Point critique**: Ne pas écraser les messages store si le chat est vide (hydration SSR).

### 1.7 Problèmes de compatibilité

**React 18 vs 19**: Compatible avec les deux
- DevDependencies: React 19.2.0
- PeerDependencies: React ≥18.0.0

**Zustand v4 → v5**:
- API `useShallow` est nouvelle (v5)
- Utiliser `import { shallow } from 'zustand/shallow'` + `useStore(..., shallow)` pour v4

**AI SDK**:
- Nécessite @ai-sdk/react ≥2.0.0
- UIMessage type doit correspondre

---

## 2. Package Memory (@fondation-io/memory)

### 2.1 Informations générales

**Version**: 1.0.0
**Description**: Système de mémoire persistante pour agents IA
**Type**: ESM (module natif)

### 2.2 Stack technique

| Dépendance | Version | Type | Rôle |
|------------|---------|------|------|
| zod | ^4.1.12 | direct | Validation de schémas |
| @upstash/redis | ^1.34.3 | peer (optionnel) | Provider Redis serverless |
| drizzle-orm | ^0.36.0 | peer (optionnel) | Provider SQL |

**Note critique**: Les peer dependencies sont **optionnelles** (`peerDependenciesMeta.optional: true`)

**Versions de développement**:
- @upstash/redis: 1.35.5
- drizzle-orm: 0.44.6

**Problème de compatibilité Drizzle**: Version peer = 0.36, dev = 0.44
→ Risque de breaking changes. Tester avec votre version Drizzle.

### 2.3 Architecture du système

#### 2.3.1 Interface MemoryProvider

**Contrat minimal** (4 méthodes obligatoires):
```typescript
interface MemoryProvider {
  // Working memory (mémoire de travail de l'agent)
  getWorkingMemory(params: {
    chatId?: string;
    userId?: string;
    scope: 'chat' | 'user';
  }): Promise<WorkingMemory | null>;

  updateWorkingMemory(params: {
    chatId?: string;
    userId?: string;
    scope: 'chat' | 'user';
    content: string;
  }): Promise<void>;

  // Optional: Chat history et sessions
  saveMessage?(message: ConversationMessage): Promise<void>;
  getMessages?(params: { chatId: string; limit?: number }): Promise<ConversationMessage[]>;
  saveChat?(chat: ChatSession): Promise<void>;
  getChats?(userId?: string): Promise<ChatSession[]>;
  getChat?(chatId: string): Promise<ChatSession | null>;
  updateChatTitle?(chatId: string, title: string): Promise<void>;
}
```

**Concept clé**: Séparation entre **working memory** (faits appris) et **conversation history** (messages persistés).

#### 2.3.2 Scopes de mémoire

**MemoryScope = 'chat' | 'user'**

- `'chat'`: Mémoire par conversation (recommandé)
- `'user'`: Mémoire globale par utilisateur (optionnel)

**Stratégie de clés**:
```typescript
// Scope chat → chatId est requis
scope: 'chat', chatId: 'conv-123'  // Key: "chat:conv-123"

// Scope user → userId est requis
scope: 'user', userId: 'user-456'  // Key: "user:user-456"
```

### 2.4 Providers implémentés

#### 2.4.1 InMemoryProvider

**Usage**: Développement/tests uniquement

**Implémentation**:
- 3 Maps: `workingMemory`, `messages`, `chats`
- Pas de persistance (RAM seulement)
- Complet (toutes les méthodes optionnelles)

**Clé de mémoire**:
```typescript
private getKey(scope, chatId?, userId?): string {
  const id = scope === 'chat' ? chatId : userId;
  return `${scope}:${id}`;
}
```

#### 2.4.2 UpstashProvider

**Usage**: Production serverless/edge

**Caractéristiques**:
- Utilise Upstash Redis (HTTP-based, edge-compatible)
- TTLs automatiques (user: 30j, chat: 24h, messages: 7j)
- Sorted sets pour indexer les chats par utilisateur
- Keep last 100 messages max (`ltrim`)

**Détails d'implémentation remarquables**:

```typescript
// Working memory avec TTL
await redis.setex(key, ttl, memory);
// TTL: 30 days (user) ou 24h (chat)

// Messages: List Redis + auto-trim
await redis.rpush(key, message);
await redis.ltrim(key, -100, -1);  // Garde 100 derniers

// Chats: Hash + Sorted Set pour index user
await redis.hset(chatKey, chatData);  // Stockage
await redis.zadd(userChatsKey, {     // Index par updatedAt
  score: chat.updatedAt.getTime(),
  member: chat.chatId
});
```

**Gestion des Dates**:
- Redis: Convertir Date → timestamp (number)
- Lecture: Reconvertir timestamp → Date

#### 2.4.3 DrizzleProvider

**Usage**: Production avec SQL (PostgreSQL, MySQL, SQLite)

**Complexité**: Support multi-DB via types génériques

**Interfaces de tables** (generic `any` pour compatibilité):
```typescript
interface WorkingMemoryTable {
  id: any;
  scope: any;
  chatId: any;
  userId: any;
  content: any;
  updatedAt: any;
}
```

**Raison du `any`**: Drizzle a des types différents par DB:
- PostgreSQL: `PgColumn<...>`
- MySQL: `MySqlColumn<...>`
- SQLite: `SQLiteColumn<...>`

**Pattern upsert**:
```typescript
// 1. Chercher l'existant
const existing = await db.select()
  .from(table)
  .where(eq(table.id, id));

if (existing.length > 0) {
  // Update
  await db.update(table).set({...}).where(eq(table.id, id));
} else {
  // Insert
  await db.insert(table).values({...});
}
```

**Schémas fournis**: Helpers pour créer les tables
- PostgreSQL: `createPgWorkingMemorySchema()`, `createPgChatsSchema()`, `createPgMessagesSchema()`
- MySQL: `createMysqlXxxSchema()`
- SQLite: `createSqliteXxxSchema()`

### 2.5 Configuration MemoryConfig

**Structure complète**:
```typescript
interface MemoryConfig {
  provider: MemoryProvider;

  workingMemory?: {
    enabled: boolean;
    scope: 'chat' | 'user';
    template?: string;  // Markdown template
  };

  history?: {
    enabled: boolean;
    limit?: number;  // Max messages à charger
  };

  chats?: {
    enabled: boolean;
    generateTitle?: boolean | GenerateTitleConfig;
  };
}
```

### 2.6 Utilisation avec les agents

**Template par défaut** (Markdown):
```markdown
# Working Memory

## Key Facts
- [Important information goes here]

## Current Focus
- [What the user is working on]

## Preferences
- [User preferences and settings]
```

**Formatage pour le prompt système**:
```typescript
formatWorkingMemory(memory);
// → "\n## Working Memory\n\n{content}\n"

getWorkingMemoryInstructions(template);
// → Instructions pour que l'agent mette à jour la mémoire
```

**Flow typique**:
1. Agent reçoit `updateWorkingMemory` tool
2. Lors d'un apprentissage → appelle le tool
3. Provider persiste le contenu
4. Au prochain message → mémoire chargée et injectée dans le prompt

### 2.7 Problèmes de compatibilité

**Drizzle ORM**:
- Peer dependency: ^0.36.0
- Dev dependency: ^0.44.6
- **Risque**: API Drizzle a changé entre 0.36 et 0.44
- **Mitigation**: Tester avec votre version spécifique

**Upstash Redis**:
- Stable entre 1.34.3 et 1.35.5
- Pas de problèmes connus

**Zod**:
- Version 4.1.12 (nouvelle major)
- Zod v3 non supporté officiellement
- **Migration v3→v4**: Vérifier les breaking changes de Zod

---

## 3. Patterns d'implémentation remarquables

### 3.1 Performance - Batching avec priorité

**Cas d'usage**: Éviter les cascades de re-renders

**Implémentation minimale**:
```typescript
const queue: Array<{callback: () => void, priority: number}> = [];
let scheduled = false;

function batch(cb: () => void, priority = 0) {
  queue.push({ callback: cb, priority });

  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(() => {
      queue.sort((a, b) => b.priority - a.priority);
      queue.splice(0).forEach(u => u.callback());
      scheduled = false;
    });
  }
}

// Utilisation
batch(() => setState({...}), 1);  // Priorité haute
batch(() => logEvent(), 0);       // Priorité normale
```

### 3.2 Throttling intelligent

**Concept**: Utiliser idle time du navigateur

```typescript
function smartThrottle(fn, wait) {
  let timeout = null;
  let pending = null;

  const execute = () => {
    if (pending) {
      fn.apply(null, pending);
      pending = null;
    }
  };

  return (...args) => {
    pending = args;

    if (!timeout) {
      timeout = setTimeout(() => {
        timeout = null;
        if (window.requestIdleCallback) {
          requestIdleCallback(execute, { timeout: 50 });
        } else {
          execute();
        }
      }, wait);
    }
  };
}
```

### 3.3 Index O(1) pour messages

**Pattern Map double**:
```typescript
class MessageIndex<T> {
  private byId = new Map<string, T>();
  private indexById = new Map<string, number>();

  update(messages: T[]) {
    this.byId.clear();
    this.indexById.clear();
    messages.forEach((msg, idx) => {
      this.byId.set(msg.id, msg);
      this.indexById.set(msg.id, idx);
    });
  }

  getById(id: string): T | undefined {
    return this.byId.get(id);
  }

  getIndexById(id: string): number | undefined {
    return this.indexById.get(id);
  }
}
```

### 3.4 Provider pattern avec peer dependencies optionnelles

**Stratégie**:
- Déclarer les providers dans `peerDependencies`
- Marquer comme `optional: true`
- L'utilisateur installe uniquement ce dont il a besoin

**package.json**:
```json
{
  "peerDependencies": {
    "@upstash/redis": "^1.34.3",
    "drizzle-orm": "^0.36.0"
  },
  "peerDependenciesMeta": {
    "@upstash/redis": { "optional": true },
    "drizzle-orm": { "optional": true }
  }
}
```

**Import conditionnel** (si nécessaire):
```typescript
let UpstashProvider;
try {
  UpstashProvider = require('./providers/upstash').UpstashProvider;
} catch {
  // Package not installed
}
```

### 3.5 Hydration SSR avec sync conditionnelle

**Problème**: Ne pas écraser les messages server-side pendant l'hydration

**Solution**:
```typescript
useEffect(() => {
  const storeHasMessages = store.messages.length > 0;
  const chatIsEmpty = chatHelpers.messages.length === 0;

  const shouldSync = !(storeHasMessages && chatIsEmpty);

  if (shouldSync) {
    syncState({ messages: chatHelpers.messages });
  }
}, [chatHelpers.messages]);
```

---

## 4. Checklist d'implémentation

### Pour un Store similaire

- [ ] Zustand ≥5.0.0 avec vanilla store
- [ ] Middleware: `devtools` + `subscribeWithSelector`
- [ ] Batched updates avec queue de priorité
- [ ] Throttling à ~16ms pour les messages
- [ ] Index Map pour O(1) lookups
- [ ] Sélecteurs stables (définir hors composants)
- [ ] `useShallow` pour éviter re-renders sur arrays/objects
- [ ] Freeze detector en dev (optionnel)
- [ ] **Pas de dépendances internes** - reste standalone

### Pour un système Memory similaire

- [ ] Interface `MemoryProvider` avec 4 méthodes de base
- [ ] Scope `'chat'` | `'user'` pour la granularité
- [ ] Au moins 1 provider (InMemory pour dev)
- [ ] Template Markdown pour working memory
- [ ] Fonction de formatage pour injection dans prompt
- [ ] TTLs automatiques si Redis/cache (30j user, 24h chat)
- [ ] Gestion des Dates (conversion timestamp si nécessaire)
- [ ] Peer dependencies optionnelles pour providers
- [ ] **Pas de dépendances internes** - reste standalone

### Pour intégration dans votre projet AI SDK v5

- [ ] Installer uniquement le(s) package(s) nécessaire(s)
- [ ] Vérifier compatibilité versions (React ≥18, Zustand ≥5, AI SDK ≥5)
- [ ] Pas besoin d'installer agents, artifacts, cache ou devtools
- [ ] Les packages fonctionnent indépendamment de Next.js (React suffit)
- [ ] Possibilité de mixer avec vos propres outils

---

## 5. Décisions architecturales à reproduire

### Store

1. **Séparation messages live / throttled**: Permet streaming fluide sans sacrifier la réactivité
2. **Batching prioritaire**: Les updates de streaming ont la priorité sur les logs/analytics
3. **Index séparé**: Maintenance explicite mais gain O(n) → O(1)
4. **Memoization des sélecteurs**: Cache au niveau du store, pas uniquement React
5. **Sync bidirectionnelle**: Store ↔ useChat avec protection hydration

### Memory

1. **Provider pattern**: Abstraction simple (4 méthodes) pour flexibilité backend
2. **Working memory ≠ History**: Faits appris vs messages bruts
3. **Scopes flexibles**: Chat-local par défaut, user-global optionnel
4. **Peer deps optionnelles**: Pas forcer Redis ou Drizzle
5. **Templates Markdown**: Format humain + machine pour le LLM

---

## 6. Métriques et performance

### Store

- **Throttle messages**: 16ms (~60fps)
- **Freeze detection**: > 80ms déclenche warning
- **Batching delay**: requestAnimationFrame (~16ms)
- **Idle callback timeout**: 50ms max

### Memory

- **TTL Upstash**:
  - Working memory user: 30 jours
  - Working memory chat: 24 heures
  - Messages: 7 jours
  - Chats: 30 jours
- **Message limit**: 100 derniers (auto-trim Redis)
- **History limit**: 10 messages par défaut (configurable)

---

## 7. Points d'attention

### Versions critiques

- **Zustand**: v5 requis pour `useShallow` moderne
- **Drizzle**: Décalage 0.36 (peer) vs 0.44 (dev) → tester
- **Zod**: v4 uniquement (v3 incompatible)
- **React**: 18+ supporté, testé avec 19

### Gotchas

1. **Store**: Ne jamais définir sélecteurs inline dans composant
2. **Store**: Utiliser `useShallow` pour arrays/objects seulement
3. **Memory**: Convertir Dates en timestamps pour Redis
4. **Memory**: Vérifier compatibilité Drizzle avec votre DB
5. **Sync**: Toujours vérifier l'hydration SSR (messages vides)

---

## Conclusion

Ces deux packages forment une architecture solide pour des applications d'IA conversationnelle:

- **Store**: Performances optimales pour le streaming en temps réel
- **Memory**: Persistance flexible avec support multi-backend

### Points clés à retenir

1. **Indépendance totale** : Aucune dépendance entre Store, Memory, et les autres packages du monorepo
2. **Compatibilité universelle** : Fonctionne avec n'importe quelle stack AI SDK v5
3. **Installation à la carte** : Installer uniquement ce dont vous avez besoin
4. **Patterns réutilisables** : Les optimisations (batching, throttling, indexing) sont applicables à tout système de chat React
5. **Production-ready** : Conçus pour la production avec gestion des performances et de la scalabilité

### Utilisation recommandée

- **Projet existant AI SDK v5** : Ajouter Store et/ou Memory sans modifier votre infrastructure
- **Nouveau projet** : Utiliser comme fondation pour state management et persistance
- **Inspiration architecturale** : Reproduire les patterns sans utiliser les packages npm

Les packages peuvent être utilisés ensemble ou séparément, avec ou sans les autres outils du monorepo (agents, artifacts, cache, devtools).
