## Unreleased

### Added

- **OpenRouter Native Support**: First-class integration with type-safe utilities for cost tracking and budget monitoring

  **Type Definitions**:
  - `OpenRouterUsage` - Token counts, costs, cache/reasoning details
  - `OpenRouterMetadata` - Complete provider metadata structure
  - `OpenRouterProviderOptions` - Fallback routes, transforms, caching configuration

  **Utilities**:
  - `extractOpenRouterUsage(result)` - Extract metrics from generation results/events
  - `extractOpenRouterUsageWithDefaults(result)` - Safe extraction with fallback values
  - `formatCost(cost)` - Format USD costs with 6 decimal precision
  - `formatTokens(tokens)` - Format token counts with thousands separators
  - `summarizeUsage(usage, options?)` - Generate human-readable usage summaries
  - `UsageAccumulator` - Budget tracking class with threshold warnings and automatic enforcement
  - `hasOpenRouterUsage(metadata)` - Type guard for OpenRouter metadata presence

  **Documentation & Examples**:
  - 7 comprehensive examples in `src/examples/openrouter/`:
    - Basic agent with usage extraction
    - Streaming usage tracking (streamText + agent.stream)
    - Multi-model fallback routing
    - Prompt caching for cost savings
    - Budget monitoring and enforcement
  - Native support guide at `/docs/guides/openrouter-native-support.md`
  - Updated integration guide at `/docs/openrouter-integration.md`

  All utilities work seamlessly with `generateText()`, `streamText()`, `agent.generate()`, and `agent.stream()`.

### Fixed

- **Agent.generate() providerMetadata propagation**: Added `providerMetadata?: unknown` field to `AgentGenerateResult` interface and propagated it from underlying AI SDK result. This fix enables OpenRouter (and other provider) usage metrics to be accessible via `agent.generate()` method.

- **Agent.stream() onFinish callback support**: `agent.stream()` now extracts and propagates the `onFinish` callback from options to the underlying AI SDK call, enabling usage tracking in streaming scenarios. Previously only `onStepFinish` was supported.

- **Agent.stream() null safety**: Fixed crash when `executionContext` parameter is undefined by adding optional chaining to `_memoryAddition` property access (`extendedContext?._memoryAddition`). The method now safely handles cases where no execution context is provided.

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
