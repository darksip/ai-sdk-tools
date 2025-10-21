# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI SDK Tools is a professional TypeScript monorepo providing essential utilities for building production-ready AI applications with Vercel AI SDK. It includes state management, debugging tools, structured streaming, multi-agent orchestration, caching, and persistent memory.

**Repository**: https://github.com/midday-ai/ai-sdk-tools

## Build System

**Runtime**: Bun (required for all commands)
**Build Tool**: tsup (per-package TypeScript compilation)
**Linter**: Biomejs (configured in `/biome.json`)
**Publishing**: Changesets for version management

## Common Commands

### Development
```bash
# Install dependencies (first time setup)
bun run dev:setup

# Watch mode for all packages (includes chrome extension)
bun run dev

# Watch mode without chrome extension
bun run dev:beta
```

### Building
```bash
# Build all packages in dependency order
bun run build

# Build individual packages (run in order if building manually)
bun run build:store
bun run build:artifacts
bun run build:devtools
bun run build:memory
bun run build:agents
bun run build:cache
bun run build:ai-sdk-tools

# Build example app (requires all packages built first)
bun run build:example
```

### Testing & Quality
```bash
# Type checking all packages
bun run type-check

# Type checking without chrome extension
bun run type-check:beta

# Clean all dist directories
bun run clean
```

### Release Management
```bash
# Create a changeset (describe your changes)
bun run changeset

# Version packages based on changesets
bun run version-packages

# Publish to npm (runs pre-publish script automatically)
bun run release

# Beta releases
bun run changeset:beta              # Enter beta mode
bun run version-packages:beta       # Version with beta tag
bun run release:beta                # Publish beta
bun run changeset:exit-beta         # Exit beta mode
```

## Monorepo Architecture

### Package Structure (Dependency Order)
1. **@ai-sdk-tools/store** - Zustand-based state management (no internal deps)
2. **@ai-sdk-tools/memory** - Persistent memory system (no internal deps)
3. **@ai-sdk-tools/cache** - Universal caching layer (no internal deps)
4. **@ai-sdk-tools/artifacts** - Depends on: store
5. **@ai-sdk-tools/devtools** - Depends on: store
6. **@ai-sdk-tools/agents** - Depends on: memory
7. **ai-sdk-tools** - Unified package (exports all above)

### Workspace Dependencies
- Development uses `workspace:*` protocol in devDependencies
- Pre-publish script (`scripts/pre-publish.js`) converts to semver ranges for publishing
- Build must follow dependency order: store/memory/cache → artifacts/devtools/agents → ai-sdk-tools

### Key Locations
```
packages/
├── store/              # State management foundation
├── artifacts/          # Structured streaming with Zod
├── devtools/           # React debugging UI (Material-UI, Xyflow)
├── agents/             # Multi-agent orchestration
│   └── src/agent.ts    # Core Agent class (38KB, complex)
├── cache/              # LRU caching with pluggable backends
├── memory/             # Memory providers (in-memory, Redis, Drizzle)
└── ai-sdk-tools/       # Unified export package
    ├── src/index.ts    # Server-side exports
    └── src/client.ts   # Client-side exports

apps/
├── example/            # Next.js 15 demo app
└── website/            # Documentation site

scripts/
└── pre-publish.js      # Workspace → semver conversion
```

## TypeScript Configuration

All packages use consistent tsconfig settings:
- **Target**: ES2020
- **Module**: ESNext with bundler resolution
- **Strict mode**: Enabled with noUnusedLocals/Parameters
- **JSX**: react-jsx (React 18+)
- **Source maps**: Enabled for debugging
- Test files excluded from compilation

## Build Configuration Pattern

Each package uses tsup with standard config:
```typescript
// packages/*/tsup.config.ts
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  external: ["react", "zustand", "@ai-sdk/react", "ai"],
  banner: {
    js: '"use client";',  // For React Server Components
  },
});
```

## Key Architectural Patterns

### 1. Agent System (`packages/agents`)
- **Dynamic Instructions**: Accepts `string` or `(context: TContext) => string`
- **Dynamic Tools**: Tools can be `Record<string, Tool>` or `(context: TContext) => Record<string, Tool>`
- **Context Flow**: Context passed through handoffs and resolved per-request
- **Tool Permissions**: Fine-grained access control via `permissions` config
- **Guardrails**: Input/output validation with Zod schemas
- **Memory Integration**: Optional working memory via `@ai-sdk-tools/memory`
- **Handoff Routing**: Automatic agent transitions with context preservation

Example agent location: `packages/agents/src/agent.ts:46-100`

### 2. Artifact Streaming (`packages/artifacts`)
- **Type Safety**: Zod schema validation for all artifacts
- **Progressive Updates**: `StreamingArtifact` class handles partial data
- **Status Tracking**: pending → streaming → completed → error
- **React Integration**: `useArtifact` hook for component consumption
- Create artifacts with: `artifact<T>(id: string, schema: z.ZodSchema<T>)`

### 3. Store Architecture (`packages/store`)
- **Performance Optimizations**:
  - Batched updates to prevent re-render thrashing
  - `useShallow` for subscriber memoization
  - Freeze detection in development
- **Drop-in Replacement**: Extends `@ai-sdk/react` useChat with zero config
- **DevTools Support**: Middleware for state inspection
- All components must use `"use client"` directive

### 4. Memory Providers (`packages/memory`)
- **Provider Pattern**: In-Memory, Upstash Redis, Drizzle ORM
- **Working Memory**: Session-scoped memory for current conversation
- **Chat History**: Persistent message storage across sessions
- **Schema Helpers**: `drizzle-schema.ts` for PostgreSQL/MySQL/SQLite
- Configuration via `MemoryConfig` type

### 5. Cache System (`packages/cache`)
- **Deterministic Keys**: Stable serialization like React Query
- **LRU Eviction**: Configurable max size and TTL
- **Streaming Compatible**: Non-intrusive caching
- **Custom Backends**: Implement `CacheStore` interface
- **Callbacks**: `onCacheHit` / `onCacheMiss` for monitoring

### 6. DevTools UI (`packages/devtools`)
- **Real-time Monitoring**: Event stream visualization
- **Agent Flow**: Xyflow-based interaction graphs
- **Tool Inspection**: Detailed tool call/result view
- **State Explorer**: JSON tree view of Zustand stores
- **Material-UI Components**: Heavy dependency (65KB styles.css)

## Publishing Workflow

### Pre-Publish Process
1. Changesets identify which packages changed
2. `scripts/pre-publish.js prepare` runs automatically:
   - Moves workspace deps from devDependencies → dependencies
   - Converts `workspace:*` → `^x.y.z` (current version)
3. Packages published to npm
4. `scripts/pre-publish.js restore` runs automatically:
   - Restores workspace:* in devDependencies
   - Removes from dependencies

### Current Package Mapping (pre-publish.js)
```javascript
const packageDependencies = {
  artifacts: ["store"],
  devtools: ["store"],
};
```

**Important**: If adding new inter-package dependencies, update `packageDependencies` in `scripts/pre-publish.js`

## CI/CD Pipeline

**GitHub Actions**: `.github/workflows/release.yml`
- Triggers: Push to main, manual dispatch
- Steps: Checkout → Setup Node/Bun → Install → Build → Publish
- Secrets required: `GITHUB_TOKEN`, `NPM_TOKEN`
- Supports stable and beta releases

## Client/Server Separation

**Server-side imports** (Node.js, Next.js server components):
```typescript
import { Agent, artifact, cached } from 'ai-sdk-tools';
```

**Client-side imports** (React components):
```typescript
import { useChat, useArtifact, AIDevtools } from 'ai-sdk-tools/client';
```

All client packages must have `"use client"` directive for React Server Components compatibility.

## Development Notes

### When Adding New Packages
1. Create in `packages/` directory
2. Add to root `package.json` workspaces (already wildcarded)
3. Add build script to root if needed
4. Update dependency order in this doc
5. If package has internal dependencies, update `scripts/pre-publish.js`
6. Ensure tsup config includes `"use client"` if React-based

### When Modifying Agent System
- Dynamic instructions/tools are resolved at runtime per-request
- Context typing is generic: `Agent<TContext extends Record<string, unknown>>`
- Handoff tools automatically created if `handoffs` array provided
- Max turns configurable via `maxTurns` (default: 10)

### When Working with Memory
- Providers are optional (import dynamically)
- Drizzle schema helpers support multiple databases
- Working memory separate from chat history
- Memory identifiers: `sessionId`, `userId`, `agentName`

### When Debugging
- DevTools component: `<AIDevtools />` in React app
- Store has built-in freeze detection (development only)
- Each package has sourcemaps enabled
- Use `debug.ts` utilities in agent/store packages

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js / Bun | 20+ |
| Language | TypeScript | 5.9+ |
| Framework | React | 18+ or 19+ |
| AI SDK | @ai-sdk/react, ai | 5.0+ |
| State | Zustand | 5.0+ |
| Validation | Zod | 3.25+ or 4.1+ |
| Build | tsup | 8.5+ |
| Linting | Biomejs | 2.2+ |
| Release | Changesets | 2.29+ |
| UI (DevTools) | Material-UI, Xyflow | Latest |
| Optional | Drizzle, Upstash Redis | Latest |

## Important Constraints

1. **No Tests**: This codebase has no test files (`.test.ts`, `.spec.ts` not found)
2. **Build Order Matters**: Must build packages in dependency order
3. **Bun Required**: All scripts use `bun run`, not `npm` or `pnpm`
4. **Workspace Protocol**: Development uses `workspace:*`, publishing converts to semver
5. **React Server Components**: All client code must use `"use client"` directive
