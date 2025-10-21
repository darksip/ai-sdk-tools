# @ai-sdk-tools/memory

## 1.0.0

### Major Changes

- Initial release of @fondation-io fork from ai-sdk-tools

  This is the first release of the @fondation-io scoped packages, forked from midday-ai/ai-sdk-tools.

  All packages have been renamed from @ai-sdk-tools/_ to @fondation-io/_ and are now published under the fondation-io organization.

  Features:

  - Multi-agent orchestration with handoffs and routing
  - Structured artifact streaming for React components
  - Universal caching for AI tool executions
  - Development and debugging tools
  - Persistent memory system for AI agents
  - Zustand-based state management for AI applications

### Patch Changes

- Updated dependencies
  - @fondation-io/debug@1.0.0

## 0.1.0

### Minor Changes

- Initial release of `@ai-sdk-tools/memory` package
- Persistent working memory system for AI agents
- Three built-in providers:
  - `InMemoryProvider` - Zero setup, perfect for development
  - `LibSQLProvider` - Local file or Turso cloud persistence
  - `UpstashProvider` - Serverless Redis for edge environments
- Simple 4-method `MemoryProvider` interface
- Flexible memory scopes: chat-level or user-level
- Optional conversation history tracking
- Automatic integration with `@ai-sdk-tools/agents`
- Auto-injection of `updateWorkingMemory` tool
- TypeScript-first design with full type safety
