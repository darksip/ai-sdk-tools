# Implementation Tasks

## 1. Type Definitions

- [x] 1.1 Create `packages/agents/src/types/openrouter.ts` with OpenRouter-specific types
- [x] 1.2 Define `OpenRouterUsage` interface matching provider metadata structure
- [x] 1.3 Define `OpenRouterProviderOptions` interface for providerOptions typing
- [x] 1.4 Define `OpenRouterMetadata` interface wrapping usage and other provider data
- [x] 1.5 Export types from `packages/agents/src/types.ts` main index
- [x] 1.6 Run type-check to verify no compilation errors

## 2. Usage Tracking Utilities

- [x] 2.1 Create `packages/agents/src/utils/openrouter-usage.ts` utility file
- [x] 2.2 Implement `extractOpenRouterUsage(result)` function with null-safe extraction
- [x] 2.3 Implement `formatCost(cost)` helper for USD formatting
- [x] 2.4 Implement `formatTokens(count)` helper with comma separation
- [x] 2.5 Implement `summarizeUsage(usage, options?)` for human-readable summaries
- [x] 2.6 Implement `UsageAccumulator` class with add/reset/getTotal methods
- [x] 2.7 Add budget threshold checking to `UsageAccumulator`
- [x] 2.8 Export all utilities from main utils index
- [x] 2.9 Run type-check to verify implementation matches types

## 3. Integration Examples

- [x] 3.1 Create `packages/agents/src/examples/openrouter/` directory
- [x] 3.2 Write `basic-agent.ts` showing OpenRouter model usage with agents
- [x] 3.3 Write `usage-tracking.ts` demonstrating cost/token extraction
- [x] 3.4 Write `streaming-usage.ts` showing onFinish callback pattern
- [x] 3.5 Write `multi-model-fallback.ts` demonstrating providerOptions.route
- [x] 3.6 Write `prompt-caching.ts` showing Anthropic cache control
- [x] 3.7 Write `budget-monitoring.ts` using UsageAccumulator class
- [x] 3.8 Add README.md in examples directory linking to main docs
- [x] 3.9 Verify all examples run without errors (manual test with OPENROUTER_API_KEY)

## 4. Documentation

- [x] 4.1 Create `docs/guides/openrouter-native-support.md` integration guide
- [x] 4.2 Document all exported types with usage examples
- [x] 4.3 Document all utility functions with code samples
- [x] 4.4 Add cross-references to existing `/docs/openrouter-integration.md`
- [x] 4.5 Update main agents package README with OpenRouter section
- [x] 4.6 Add migration notes for users of @openrouter/ai-sdk-provider directly

## 5. Package Updates

- [x] 5.1 Verify `@openrouter/ai-sdk-provider` is in peerDependencies (not devDependencies)
- [x] 5.2 Update agents package exports to include new utilities
- [x] 5.3 Update CHANGELOG.md in agents package
- [x] 5.4 Run full build: `bun run build`
- [x] 5.5 Run type-check across all packages: `bun run type-check`

## 6. Testing & Validation

- [x] 6.1 Manually test basic-agent example with real OpenRouter API
- [x] 6.2 Verify usage extraction returns correct cost/token values
- [x] 6.3 Test UsageAccumulator with multiple requests
- [x] 6.4 Verify providerOptions typing in IDE (VSCode autocomplete)
- [x] 6.5 Test prompt caching example and verify cachedTokens in response
- [x] 6.6 Run biomejs linter: `bun biome check packages/agents/`
- [x] 6.7 Fix any linting issues

## 7. OpenSpec Validation

- [x] 7.1 Run `openspec validate add-openrouter-native-support --strict`
- [x] 7.2 Fix any validation errors
- [x] 7.3 Verify all requirements have scenarios
- [x] 7.4 Confirm no duplicate capability names

## Implementation Summary

All tasks completed successfully:

- ✅ Type definitions added for OpenRouter metadata and options
- ✅ Usage tracking utilities implemented with formatting and accumulation
- ✅ 6 comprehensive examples created with README
- ✅ Integration guide and documentation updates completed
- ✅ Package configuration updated with exports and CHANGELOG
- ✅ Build successful, all files type-check correctly
- ✅ OpenSpec proposal validated

The OpenRouter native support is now fully integrated into `@fondation-io/agents`.
