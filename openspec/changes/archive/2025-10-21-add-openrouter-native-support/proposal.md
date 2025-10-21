# Native OpenRouter Integration

## Why

OpenRouter provides access to 300+ AI models through a single API, offering cost-effective alternatives and automatic fallback capabilities. While `@openrouter/ai-sdk-provider` is already a dependency and documented in `/docs/openrouter-integration.md`, the project lacks:

1. **First-class integration examples** demonstrating OpenRouter usage with `@fondation-io/agents`
2. **Usage tracking utilities** to expose OpenRouter's built-in cost and token metrics via `providerMetadata.openrouter.usage`
3. **Type-safe providerOptions** for OpenRouter-specific features (fallback routes, reasoning tokens, transforms)

This change elevates OpenRouter from "works via AI SDK" to a fully-supported, well-integrated provider with utilities that expose its unique capabilities.

## What Changes

- **NEW**: Add OpenRouter-specific type definitions for `providerMetadata` and `providerOptions`
- **NEW**: Create usage tracking helpers to extract OpenRouter cost/token metrics from generation results
- **NEW**: Add comprehensive examples showing OpenRouter integration with agents, streaming, and usage tracking
- **ENHANCED**: Update agent examples to demonstrate OpenRouter model selection and cost optimization patterns
- **DOCS**: Create integration guide linking existing docs with new utilities and examples

This is **non-breaking** - purely additive functionality that makes existing OpenRouter support more discoverable and easier to use.

## Impact

### Affected Specs
- `openrouter-integration` (NEW) - Core integration types and utilities
- `usage-tracking` (NEW) - OpenRouter-specific usage metrics extraction
- `provider-configuration` (NEW) - Type-safe providerOptions support

### Affected Code
- `packages/agents/src/types.ts` - Add OpenRouter type definitions
- `packages/agents/src/utils/` (NEW) - Usage tracking utilities
- `packages/agents/src/examples/` (NEW) - OpenRouter integration examples
- `docs/` - Integration guide referencing new utilities

### Dependencies
- Uses existing `@openrouter/ai-sdk-provider` dependency (v1.2.0)
- No new external dependencies required
- Compatible with current AI SDK v5.0.76+

### Benefits
1. **Cost visibility**: Easy access to per-request costs and token counts
2. **Type safety**: Full TypeScript support for OpenRouter-specific options
3. **Better DX**: Clear examples for common patterns (fallbacks, multi-model routing, budget tracking)
4. **Discovery**: Makes OpenRouter support more visible to users of `@fondation-io/agents`
