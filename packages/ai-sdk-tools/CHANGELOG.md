# ai-sdk-tools

## 1.0.1

### Patch Changes

- Update dependencies to use @fondation-io/agents@1.1.0 with global usage tracking support

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
  - @fondation-io/store@1.0.0
  - @fondation-io/memory@1.0.0
  - @fondation-io/cache@1.0.0
  - @fondation-io/artifacts@1.0.0
  - @fondation-io/devtools@1.0.0
  - @fondation-io/agents@1.0.0

## 0.4.0

### Minor Changes

- Initial release of unified ai-sdk-tools package. Fixed use client directive handling in artifacts. Added artifacts devDependency to cache package.

### Patch Changes

- Updated dependencies
  - @ai-sdk-tools/artifacts@0.8.1
  - @ai-sdk-tools/cache@0.7.1

## 0.1.0

### Initial Release

- Complete toolkit package with all AI SDK tools
- Namespaced exports for:
  - `agents` - Multi-agent orchestration
  - `artifacts` - Artifact streaming
  - `cache` - Tool caching
  - `devtools` - Development tools
  - `memory` - Persistent memory
  - `store` - State management
- Single package installation for all features
- Individual packages still available for granular control
