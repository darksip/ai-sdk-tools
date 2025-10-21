# Design Document: Native OpenRouter Integration

## Context

OpenRouter is already usable with `@fondation-io/agents` via the standard AI SDK interface, and `@openrouter/ai-sdk-provider` is a root-level dependency. However, users must manually:
- Type-cast `providerMetadata` to access OpenRouter-specific usage data
- Remember to use `onFinish` callback for streaming usage extraction
- Manually implement cost tracking and budget monitoring
- Discover providerOptions structure through external docs

This change adds **thin utility layer** over the existing integration to improve developer experience without changing core agent functionality.

## Goals

1. **Type Safety**: Provide TypeScript definitions for OpenRouter metadata and options
2. **Discoverability**: Make OpenRouter's unique features (usage tracking, fallbacks) obvious
3. **Utilities**: Offer helpers for common patterns (cost formatting, budget tracking)
4. **Examples**: Demonstrate integration with agents package

## Non-Goals

- **Not** creating a wrapper around `@openrouter/ai-sdk-provider` (use it directly)
- **Not** modifying agent core behavior or API surface
- **Not** making OpenRouter a required dependency
- **Not** supporting other provider-specific features (keep focused on OpenRouter)

## Decisions

### Decision 1: Place utilities in agents package

**Choice**: Add OpenRouter utilities to `@fondation-io/agents`

**Rationale**:
- Agents package is the primary integration point for model providers
- Keeps utilities close to where they're used (agent examples, streaming patterns)
- Avoids creating a new package for thin utility layer

**Alternatives Considered**:
- Create `@fondation-io/openrouter` package → Rejected: Too heavyweight for type definitions and helpers
- Add to root ai-sdk-tools → Rejected: Not server-safe, utilities needed server-side

### Decision 2: Extract usage via explicit utility function

**Choice**: Provide `extractOpenRouterUsage(result)` rather than extending result types

**Rationale**:
- Non-invasive: doesn't modify AI SDK result objects
- Works with both `generateText` and streaming `onFinish` events
- Graceful degradation: returns null if OpenRouter metadata absent
- Type guard: narrows return type when usage is present

**Alternatives Considered**:
- Extend AgentGenerateResult with `.openrouterUsage` → Rejected: Breaks type compatibility, OpenRouter-specific
- Use middleware to inject usage → Rejected: Overcomplicated for simple extraction

### Decision 3: Usage accumulator as stateful class

**Choice**: `UsageAccumulator` class with instance methods rather than functional approach

**Rationale**:
- Natural for stateful tracking across multiple requests
- Familiar pattern for budget monitoring (accumulate, check threshold)
- Easy to reset and reuse in long-running sessions

**Alternatives Considered**:
- Functional reducer pattern → Rejected: Less intuitive for stateful accumulation
- Global singleton → Rejected: Not suitable for multi-tenant scenarios

### Decision 4: Examples in source tree, not separate directory

**Choice**: Place examples in `packages/agents/src/examples/openrouter/`

**Rationale**:
- Co-located with package source for easy reference
- Can import from `../..` without build artifacts
- Easier to keep examples in sync with API changes
- Follows pattern from `packages/artifacts/src/examples/`

**Alternatives Considered**:
- `apps/examples/` → Rejected: Requires build step, harder to maintain
- `docs/examples/` → Rejected: Not executable, can go stale

## Type Structure

### OpenRouterUsage

```typescript
interface OpenRouterUsage {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  promptTokensDetails?: {
    cachedTokens?: number;
  };
  completionTokensDetails?: {
    reasoningTokens?: number;
  };
}
```

Based on actual OpenRouter API response structure documented in `docs/openrouter-integration.md:388-402`.

### OpenRouterProviderOptions

```typescript
interface OpenRouterProviderOptions {
  reasoning?: { max_tokens: number };
  transforms?: string[];
  route?: 'fallback';
  models?: string[];
  cacheControl?: { type: 'ephemeral' };
}
```

Matches providerOptions structure in OpenRouter provider v1.2.0.

## Risks / Trade-offs

### Risk: OpenRouter API changes

**Mitigation**:
- Keep types aligned with `@openrouter/ai-sdk-provider` version
- Document supported provider version in package.json peerDependencies
- Usage extraction handles missing fields gracefully

### Risk: Utility API churn

**Mitigation**:
- Keep utility surface minimal (extract, format, accumulate)
- Mark as experimental in initial release
- Gather feedback before considering stable API

### Trade-off: OpenRouter-specific vs generic provider utilities

**Decision**: OpenRouter-specific utilities only

**Rationale**:
- Each provider has unique metadata structure (no common standard)
- Generic abstraction would be leaky and complex
- Users can create similar utilities for other providers if needed

## Migration Plan

### For existing OpenRouter users

**Before** (manual type casting):
```typescript
const usage = result.providerMetadata?.openrouter?.usage as any;
console.log('Cost:', usage?.cost);
```

**After** (type-safe utility):
```typescript
const usage = extractOpenRouterUsage(result);
if (usage) {
  console.log('Cost:', formatCost(usage.cost));
}
```

Migration is **opt-in**: existing code continues to work without changes.

### Rollout plan

1. **Phase 1**: Add types and utilities (this change)
2. **Phase 2**: Update documentation with examples
3. **Phase 3**: Gather feedback, iterate on API
4. **Phase 4**: Mark utilities as stable after 1-2 minor versions

## Implementation Issues Discovered

### Issue 1: Missing providerMetadata in AgentGenerateResult

**Problem**: Initial implementation did not include `providerMetadata` field in `AgentGenerateResult` interface, causing `extractOpenRouterUsage(result)` to return `null` when used with `agent.generate()`.

**Root Cause**:
- `AgentGenerateResult` interface only contained `usage?: LanguageModelUsage` (basic token counts)
- `Agent.generate()` method did not propagate `providerMetadata` from AI SDK result
- OpenRouter-specific metadata (including cost and detailed breakdowns) lives in `providerMetadata.openrouter.usage`

**Symptoms**:
- ✅ `generateText()` direct → usage metrics available
- ❌ `agent.generate()` → `extractOpenRouterUsage()` returns `null`
- Examples using agents failed to show usage metrics

**Solution** (packages/agents/src/types.ts:175 & agent.ts:152):
```typescript
// 1. Add field to interface
export interface AgentGenerateResult {
  // ... existing fields
  providerMetadata?: unknown;  // ← ADDED
}

// 2. Propagate in Agent.generate()
return {
  // ... existing fields
  providerMetadata: result.providerMetadata,  // ← ADDED
};
```

**Validation**: All examples now successfully extract usage metrics:
- `basic-agent.ts`: 48 tokens tracked via `agent.generate()`
- `streaming-usage.ts`: 123 tokens, $0.000064 cost
- `budget-monitoring.ts`: 537 tokens across 4 requests, budget enforcement working

**Prevention**: Added explicit requirement in `specs/openrouter-integration/spec.md`:
- Requirement: Agent Result Metadata Propagation
- Scenario: AgentGenerateResult includes providerMetadata
- Scenario: Agent.generate() returns providerMetadata
- Scenario: providerMetadata propagation in implementation

### Issue 2: Agent.stream() Missing onFinish Support and Null Safety

**Problem**: When testing `agent.stream()` method for usage tracking, discovered two issues:
1. `agent.stream()` crashed when `executionContext` was undefined (TypeError accessing `_memoryAddition`)
2. `agent.stream()` did not support `onFinish` callback for usage extraction

**Root Cause**:
- `Agent.stream()` method tried to access `executionContext._memoryAddition` without checking if `executionContext` was defined (agent.ts:188-189)
- `onFinish` callback was not extracted from options and passed to underlying AI SDK call
- Only `onStepFinish` was supported, not `onFinish`

**Symptoms**:
```bash
# agent.stream({ prompt: "..." }) - without executionContext
TypeError: undefined is not an object (evaluating 'executionContext._memoryAddition')
```

**Solution** (packages/agents/src/agent.ts:180-182, 188-189, 261):
```typescript
// 1. Extract onFinish from options (like onStepFinish)
const onFinish = (options as Record<string, unknown>).onFinish as
  | ((event: unknown) => void | Promise<void>)
  | undefined;

// 2. Add null safety to executionContext access
const extendedContext = executionContext as ExtendedExecutionContext | undefined;
const memoryAddition = extendedContext?._memoryAddition || "";

// 3. Pass onFinish to AI SDK additionalOptions
if (onFinish) additionalOptions.onFinish = onFinish;
```

**Validation**: Created new example `agent-streaming-usage.ts` demonstrating:
- `agent.stream()` with `onFinish` callback successfully extracts usage metrics
- 58 tokens tracked, $0.000139 cost
- Works identically to `streamText()` direct calls

**Prevention**: Will update specs to explicitly require `agent.stream()` support for:
- `onFinish` callback propagation
- Null-safe handling of optional parameters
- Usage tracking via streaming callbacks

## Open Questions

1. **Should we support other providers similarly?**
   - Answer: Wait for user demand, evaluate case-by-case

2. **Should UsageAccumulator be async-aware for concurrent requests?**
   - Answer: No, keep simple. Users can manage concurrency externally if needed

3. **Should we expose raw OpenRouter API types from @openrouter/ai-sdk-provider?**
   - Answer: No, define our own types to avoid tight coupling to provider package internals
