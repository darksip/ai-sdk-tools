# Project Context

## Purpose

AI SDK Tools is a professional TypeScript monorepo providing essential utilities for building production-ready AI applications with Vercel AI SDK.

**🔱 Fork Status**: This is a maintained fork of [midday-ai/ai-sdk-tools](https://github.com/midday-ai/ai-sdk-tools), published under the `@fondation-io` npm scope.

### Key Capabilities
- **State Management**: Zustand-based store with performance optimizations
- **Debugging Tools**: React DevTools UI with real-time monitoring
- **Artifact Streaming**: Type-safe structured streaming with Zod
- **Multi-Agent Orchestration**: Dynamic agent handoffs with context preservation
- **Caching**: Universal LRU caching with pluggable backends
- **Persistent Memory**: Session-scoped memory with multiple provider options
- **Shared Debug Utilities**: Common debugging infrastructure (fork-specific)

### Fork Differences
- npm scope: `@fondation-io/*` (instead of `@ai-sdk-tools/*`)
- Repository: https://github.com/darksip/ai-sdk-tools
- Independent versioning from upstream
- Additional `@fondation-io/debug` package for shared utilities
- Integrated upstream sync system for selective updates

## Tech Stack

### Core Technologies
- **Runtime**: Bun (required for all commands)
- **Language**: TypeScript 5.9+
- **Target**: ES2020, ESNext modules
- **Frameworks**: React 18+ or 19+
- **AI SDK**: @ai-sdk/react, ai (v5.0+)

### Key Libraries
- **State Management**: Zustand 5.0+
- **Validation**: Zod 3.25+ or 4.1+
- **Build Tool**: tsup 8.5+
- **Linter**: Biomejs 2.2+
- **Release**: Changesets 2.29+
- **UI (DevTools)**: Material-UI, Xyflow
- **Optional**: Drizzle ORM, Upstash Redis

### Build System
- **tsup**: Per-package TypeScript compilation
- **Outputs**: CommonJS + ESM with TypeScript declarations
- **Source maps**: Enabled for all packages
- **React Server Components**: Uses `"use client"` directives

## Project Conventions

### Code Style
- **Linting**: Biomejs configured in `/biome.json`
- **Strict TypeScript**: All packages use strict mode with noUnusedLocals/Parameters
- **Client Directives**: All React packages must include `"use client"` banner
- **Naming**: Package names use kebab-case (`@fondation-io/ai-sdk-tools`)
- **Imports**: Prefer named exports over default exports

### Architecture Patterns

#### 1. Monorepo Structure
- **Workspace Protocol**: Development uses `workspace:*` in devDependencies
- **Pre-Publish Conversion**: Automated conversion to semver ranges for npm
- **Dependency Order**: Must build in order: `debug` → `store/memory/cache` → `artifacts/devtools/agents` → `ai-sdk-tools`

#### 2. Package Organization
```
packages/
├── debug/          # Shared debug utilities (base dependency, fork-specific)
├── store/          # State management foundation
├── artifacts/      # Structured streaming
├── devtools/       # React debugging UI
├── agents/         # Multi-agent orchestration
├── cache/          # LRU caching
├── memory/         # Memory providers
└── ai-sdk-tools/   # Unified export package
```

#### 3. Client/Server Separation
- **Server imports**: `@fondation-io/ai-sdk-tools` (from `src/index.ts`)
- **Client imports**: `@fondation-io/ai-sdk-tools/client` (from `src/client.ts`)
- All packages support individual imports (e.g., `@fondation-io/agents`)

#### 4. Dynamic Context Pattern
- Agent instructions: `string` or `(context: TContext) => string`
- Agent tools: `Record<string, Tool>` or `(context: TContext) => Record<string, Tool>`
- Context flows through handoffs and resolves per-request

#### 5. Provider Pattern
- Memory system uses pluggable providers (In-Memory, Redis, Drizzle)
- Cache system supports custom backends via `CacheStore` interface
- Schema helpers for multi-database support

### Testing Strategy
**Current State**: This codebase has no test files (no `.test.ts` or `.spec.ts` files)

**Quality Assurance Approach**:
- Type checking via `bun run type-check`
- Build validation ensures all packages compile
- Manual testing via `apps/example` Next.js demo
- Real-world usage validation before releases

**Future Considerations**: Test infrastructure may be added for critical paths

### Git Workflow

#### Branching
- **Main branch**: `main` (default for PRs and releases)
- **Feature branches**: Create from `main`, merge back via PR
- **Upstream sync**: Selective cherry-picking from upstream using `/sync-upstream`

#### Commit Conventions
- Use descriptive commit messages
- Reference issue numbers where applicable
- Changesets required for versioned changes

#### Release Process
1. Create changeset: `bun run changeset`
2. Version packages: `bun run version-packages`
3. Publish: `bun run release` (runs pre-publish script automatically)
4. Beta releases: Use `changeset:beta`, `version-packages:beta`, `release:beta`

#### Fork-Specific Workflow
- **Before major changes**: Check upstream for potential sync conflicts
- **Document fork features**: Add comments for easier upstream synchronization
- **Test after upstream sync**: Full build and type-check after integrating changes
- **Adapt upstream commits**: Replace `@ai-sdk-tools` with `@fondation-io` in cherry-picks

## Domain Context

### AI Application Development
This project provides infrastructure for building conversational AI applications using Large Language Models (LLMs). Key concepts:

- **Streaming**: Progressive response delivery from LLMs
- **Tool Calling**: LLMs invoke functions to extend capabilities
- **Multi-Agent Systems**: Multiple specialized agents with handoff mechanisms
- **Context Management**: Maintaining conversation state across interactions
- **Artifacts**: Structured data objects (code, charts, docs) within conversations
- **Memory Systems**: Short-term (working) and long-term (persistent) storage

### React Server Components
All client packages must be compatible with React Server Components:
- Server components run on server (no client state)
- Client components marked with `"use client"` directive
- This project provides both server-side (Agent, cached) and client-side (useChat, DevTools) tools

### Vercel AI SDK Integration
This toolkit extends and enhances the Vercel AI SDK:
- Drop-in replacement for `useChat` with enhanced features
- Compatible with AI SDK's tool and provider system
- Adds state management, debugging, and multi-agent capabilities

## Important Constraints

### Technical Constraints
1. **Bun Required**: All scripts use `bun run`, not `npm` or `pnpm`
2. **Build Order Matters**: Must build `debug` first, then dependencies in order
3. **No Tests**: Codebase currently has no automated tests
4. **React Server Components**: All client code must use `"use client"` directive
5. **Workspace Protocol**: Development uses `workspace:*`, publishing converts to semver

### Fork-Specific Constraints
6. **Always use `@fondation-io` scope** in package.json and imports
7. **Repository URLs** must point to `github.com/darksip/ai-sdk-tools`
8. **Selective Upstream Sync**: Cannot blindly merge upstream changes
9. **Package Name Adaptation**: Upstream commits need scope replacement

### Development Constraints
10. **Pre-Publish Script**: Must update `packageDependencies` in `scripts/pre-publish.js` when adding inter-package dependencies
11. **Type Safety**: All packages use strict TypeScript mode
12. **Source Maps**: Must be enabled for debugging
13. **Dynamic Resolution**: Agent instructions/tools resolved at runtime per-request

## External Dependencies

### Required Runtime Dependencies
- **Vercel AI SDK** (`ai`, `@ai-sdk/react`): Core AI streaming and tooling
- **Zustand**: State management foundation
- **Zod**: Runtime validation and type safety
- **React**: UI framework (18+ or 19+)

### Optional Runtime Dependencies
- **Upstash Redis** (`@upstash/redis`): Redis-based memory provider
- **Drizzle ORM** (`drizzle-orm`): Database-based memory provider
- **Material-UI** (`@mui/material`): DevTools UI components
- **Xyflow** (`@xyflow/react`): Agent flow visualization

### Build & Development Dependencies
- **tsup**: Package bundler
- **Biomejs** (`@biomejs/biome`): Linting and formatting
- **Changesets**: Version management and publishing
- **TypeScript**: Type system and compilation

### External Services (Optional)
- **OpenAI, Anthropic, etc.**: LLM providers (via AI SDK)
- **Upstash Redis**: Cloud Redis for distributed memory
- **PostgreSQL/MySQL/SQLite**: Database options for Drizzle memory provider

### CI/CD
- **GitHub Actions**: Automated releases (`.github/workflows/release.yml`)
- **npm Registry**: Package publishing destination
- **Secrets Required**: `GITHUB_TOKEN`, `NPM_TOKEN`
