## Unreleased

### Added

- **OpenRouter Native Support**: Type-safe utilities for OpenRouter integration
  - `OpenRouterUsage`, `OpenRouterMetadata`, `OpenRouterProviderOptions` type definitions
  - `extractOpenRouterUsage()` - Extract usage metrics from generation results
  - `extractOpenRouterUsageWithDefaults()` - Extract with fallback values
  - `formatCost()` - Format USD costs
  - `formatTokens()` - Format token counts with commas
  - `summarizeUsage()` - Human-readable usage summaries
  - `UsageAccumulator` - Budget tracking across multiple requests with threshold warnings
  - `hasOpenRouterUsage()` - Type guard for OpenRouter metadata
  - Comprehensive examples in `src/examples/openrouter/`
  - Integration guide at `/docs/guides/openrouter-native-support.md`

### Fixed

- **Agent.generate() providerMetadata**: `AgentGenerateResult` now includes `providerMetadata` field to expose OpenRouter usage metrics via `agent.generate()`
- **Agent.stream() onFinish support**: `agent.stream()` now supports `onFinish` callback for usage tracking in streaming scenarios
- **Agent.stream() null safety**: Fixed crash when `executionContext` is undefined by adding optional chaining to `_memoryAddition` access

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
  - @fondation-io/memory@1.0.0
