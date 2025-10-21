# AI SDK Tools (@fondation-io)

![AI SDK Tools](image.png)

> **🔱 Fork Notice**
>
> This is a fork of the original [midday-ai/ai-sdk-tools](https://github.com/midday-ai/ai-sdk-tools) project, maintained and published under the `@fondation-io` npm scope.

> **⚠️ Active Development Notice**
>
> This package is currently in **active development** and breaking changes may occur between versions. We recommend pinning to specific versions in production environments and staying updated with our changelog.

Essential utilities for building production-ready AI applications with Vercel AI SDK. State management, debugging, structured streaming, intelligent agents, caching, and persistent memory.

## Installation

### Unified Package (Recommended)

Install everything in one package:

```bash
npm install @fondation-io/ai-sdk-tools
```

Import what you need:

```typescript
// Server-side
import { Agent, artifact, cached } from '@fondation-io/ai-sdk-tools';

// Client-side
import { useChat, useArtifact, AIDevtools } from '@fondation-io/ai-sdk-tools/client';
```

### Individual Packages

Or install only what you need:

### [@fondation-io/store](./packages/store)
AI chat state management that eliminates prop drilling. Clean architecture and better performance for chat components.

```bash
npm i @fondation-io/store
```

### [@fondation-io/devtools](./packages/devtools)
Development tools for debugging AI applications. Inspect tool calls, messages, and execution flow directly in your app.

```bash
npm i @fondation-io/devtools
```

### [@fondation-io/artifacts](./packages/artifacts)
Stream structured, type-safe artifacts from AI tools to React components. Build dashboards, analytics, and interactive experiences beyond chat.

```bash
npm i @fondation-io/artifacts @fondation-io/store
```

### [@fondation-io/agents](./packages/agents)
Multi-agent orchestration with automatic handoffs and routing. Build intelligent workflows with specialized agents for any AI provider.

```bash
npm i @fondation-io/agents ai zod
```

### [@fondation-io/cache](./packages/cache)
Universal caching for AI SDK tools. Cache expensive operations with zero configuration - works with regular tools, streaming, and artifacts.

```bash
npm i @fondation-io/cache
```

### [@fondation-io/memory](./packages/memory)
Persistent memory system for AI agents. Add long-term memory with support for multiple storage backends (In-Memory, Upstash Redis, Drizzle).

```bash
npm i @fondation-io/memory
```

### [@fondation-io/debug](./packages/debug)
Shared debug utilities used internally across packages.

```bash
npm i @fondation-io/debug
```

## Getting Started

Visit the [original project website](https://ai-sdk-tools.dev) to explore interactive demos and detailed documentation for each package.

For fork-specific documentation and examples, see the individual package READMEs in the `packages/` directory.

## Repository

- **Fork**: [github.com/darksip/ai-sdk-tools](https://github.com/darksip/ai-sdk-tools)
- **Upstream**: [github.com/midday-ai/ai-sdk-tools](https://github.com/midday-ai/ai-sdk-tools)

## License

MIT

## Acknowledgments

This project is a fork of the excellent [AI SDK Tools](https://github.com/midday-ai/ai-sdk-tools) created by the [Midday](https://midday.ai) team. We are grateful for their work and contribution to the open-source community.

All credit for the original implementation goes to the original authors. This fork is maintained independently under the `@fondation-io` scope.
