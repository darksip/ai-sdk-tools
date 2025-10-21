# Implementation Tasks: Global Usage Tracking

## Phase 1: Core Infrastructure (Foundational)

### Task 1: Create usage tracking types
- [x] Create `src/usage-tracking-config.ts` file
- [x] Define `UsageTrackingEvent` interface with all required fields
- [x] Define `UsageTrackingHandler` type (function signature)
- [x] Define `UsageTrackingConfig` interface with `onUsage` and optional `onError`
- [x] Export all types from main index

**Dependencies**: None
**Validation**: Type definitions compile without errors

### Task 2: Implement global configuration storage
- [x] Add module-level variable `globalUsageTrackingConfig: UsageTrackingConfig | null`
- [x] Implement `configureUsageTracking(config: UsageTrackingConfig | UsageTrackingHandler): void`
- [x] Handle shorthand: if config is function, wrap as `{ onUsage: config }`
- [x] Implement `resetUsageTracking(): void` to clear config
- [x] Implement `getUsageTrackingConfig(): UsageTrackingConfig | null` internal helper

**Dependencies**: Task 1
**Validation**: Can set and retrieve config, reset clears it

### Task 3: Implement event builder helper
- [x] Add private method `buildUsageEvent()` to Agent class
- [x] Extract `sessionId` from execution context if present
- [x] Extract `_handoffChain` from execution context if present
- [x] Build event with agent name, method, usage, providerMetadata, context
- [x] Handle both generate and stream event structures

**Dependencies**: Task 1, Task 2
**Validation**: Event built correctly with all available fields

## Phase 2: Agent.generate() Integration

### Task 4: Add tracking to Agent.generate()
- [x] Import `getUsageTrackingConfig` in agent.ts
- [x] Add `const startTime = Date.now()` at start of `generate()` method
- [x] After successful generation, check if tracker configured
- [x] Build `UsageTrackingEvent` with `method: 'generate'`
- [x] Calculate duration: `duration: Date.now() - startTime`
- [x] Invoke tracking handler with try/catch

**Dependencies**: Task 3
**Validation**: Manual test shows tracking invoked after generate()

### Task 5: Add error handling for generate() tracking
- [x] Wrap tracking call in try/catch block
- [x] If `onError` callback exists, invoke it with error and event
- [x] Otherwise, use logger.error() for silent logging
- [x] Ensure generation result is still returned on tracking failure

**Dependencies**: Task 4
**Validation**: Tracking errors don't break generation

## Phase 3: Agent.stream() Integration

### Task 6: Add tracking to Agent.stream()
- [x] Get global tracker at start of `stream()` method
- [x] Extract user's `onFinish` from options (if present)
- [x] If tracker exists, create composed `onFinish` callback
- [x] Composed callback runs both user callback and tracker in parallel (Promise.all)
- [x] Pass composed callback to underlying AI SDK stream()

**Dependencies**: Task 3
**Validation**: Both user callback and tracker invoked

### Task 7: Handle stream() tracking event building
- [x] Build `UsageTrackingEvent` in stream's onFinish context
- [x] Set `method: 'stream'`
- [x] Extract usage and providerMetadata from finish event
- [x] Do NOT include duration (streaming time tracked by user if needed)
- [x] Include execution context if available

**Dependencies**: Task 6
**Validation**: Event contains correct stream-specific data

### Task 8: Add error handling for stream() tracking
- [x] Wrap tracking call in try/catch within composed onFinish
- [x] If `onError` exists, invoke it
- [x] Otherwise, use logger.error()
- [x] Ensure user's onFinish still executes even if tracking fails

**Dependencies**: Task 6, Task 7
**Validation**: Tracking errors don't prevent user callback

## Phase 4: Multi-Agent Handoff Tracking

### Task 9: Propagate handoff chain through context
- [x] In handoff logic, check if execution context has `_handoffChain`
- [x] If not, initialize as empty array
- [x] Append current agent name before handing off
- [x] Ensure chain is passed to next agent's execution context

**Dependencies**: None (handoff logic exists)
**Validation**: Chain builds correctly through handoffs

### Task 10: Include handoff chain in tracking events
- [x] In `buildUsageEvent()`, extract `_handoffChain` from context
- [x] Add current agent name to chain for tracking event
- [x] Set `handoffChain` field in event
- [x] Handle case where chain is undefined (single agent, no handoffs)

**Dependencies**: Task 3, Task 9
**Validation**: Each agent tracked with full chain context

## Phase 5: Examples and Documentation

### Task 11: Create basic usage example
- [x] Create `src/examples/usage-tracking/basic-tracking.ts`
- [x] Show `configureUsageTracking` with simple console.log handler
- [x] Demonstrate tracking with `agent.generate()`
- [x] Demonstrate tracking with `agent.stream()`
- [x] Show that both methods automatically track

**Dependencies**: Task 4, Task 6
**Validation**: Example runs and logs tracking events

### Task 12: Create persistence example (OpenRouter + DB)
- [x] Create `src/examples/usage-tracking/database-persistence.ts`
- [x] Show extracting OpenRouter cost from providerMetadata
- [x] Demonstrate async persistence (simulated DB call)
- [x] Show error handling with `onError` callback
- [x] Include comments about real DB integration

**Dependencies**: Task 4, Task 6
**Validation**: Example demonstrates real-world pattern

### Task 13: Create multi-agent handoff example
- [x] Create `src/examples/usage-tracking/multi-agent-tracking.ts`
- [x] Create 2-3 agent handoff chain
- [x] Configure global tracking
- [x] Run workflow and show each agent tracked separately
- [x] Display handoffChain in console output

**Dependencies**: Task 10
**Validation**: Shows per-agent tracking with chain context

### Task 14: Write usage tracking guide
- [x] Create `/docs/guides/usage-tracking-configuration.md`
- [x] Explain motivation (eliminate repetition)
- [x] Document `configureUsageTracking` API with examples
- [x] Document `UsageTrackingEvent` structure
- [x] Show OpenRouter integration pattern
- [x] Document error handling behavior
- [x] Add troubleshooting section

**Dependencies**: All implementation tasks
**Validation**: Guide is clear and comprehensive

### Task 15: Update main README
- [x] Add "Usage Tracking" section to agents README
- [x] Quick example showing global config
- [x] Link to comprehensive guide
- [x] Note that it works with all providers

**Dependencies**: Task 14
**Validation**: README clearly explains new feature

### Task 16: Update CHANGELOG
- [x] Add entry under "## Unreleased" → "### Added"
- [x] Document `configureUsageTracking` and `resetUsageTracking` functions
- [x] Document `UsageTrackingEvent` and `UsageTrackingHandler` types
- [x] Explain automatic tracking in generate() and stream()
- [x] Mention multi-agent handoff tracking support

**Dependencies**: All implementation tasks
**Validation**: CHANGELOG accurately describes changes

## Phase 6: Validation and Polish

### Task 17: Type-check all changes
- [x] Run `bun run type-check` and fix any errors
- [x] Ensure all new exports are in index.ts
- [x] Verify types are exported from package

**Dependencies**: All implementation tasks
**Validation**: `bun run type-check` passes

### Task 18: Build and test examples
- [x] Run `bun run build` for agents package
- [x] Execute all three examples from Task 11-13
- [x] Verify tracking events have expected structure
- [x] Verify error handling works as documented

**Dependencies**: Task 17
**Validation**: All examples run successfully

### Task 19: Manual integration testing
- [x] Test with OpenRouter provider (extract cost)
- [x] Test with OpenAI provider (generic metadata)
- [x] Test with Anthropic provider (generic metadata)
- [x] Verify sessionId extraction from context
- [x] Verify tracking with no context provided

**Dependencies**: Task 18
**Validation**: Works correctly across providers

### Task 20: Update OpenSpec proposal
- [x] Mark all tasks as completed
- [x] Validate with `openspec validate add-global-usage-tracking --strict`
- [x] Resolve any validation errors
- [x] Ensure spec scenarios match implementation

**Dependencies**: All tasks
**Validation**: `openspec validate` passes

## Parallelizable Work

- **Phase 1** (Tasks 1-3): Must be sequential (foundational)
- **Phase 2** (Tasks 4-5) and **Phase 3** (Tasks 6-8): Can be parallel after Phase 1
- **Phase 4** (Tasks 9-10): Can start after Task 3
- **Phase 5** (Tasks 11-16): Can start after Phases 2-4 complete
- **Phase 6** (Tasks 17-20): Must be sequential (validation)

## Success Criteria

- ✅ Global tracking configured once, works for all agents
- ✅ Automatic tracking in generate() and stream()
- ✅ Multi-agent handoffs tracked per-agent
- ✅ Error handling prevents tracking from breaking generation
- ✅ Type-safe APIs with full TypeScript support
- ✅ Comprehensive examples and documentation
- ✅ All type checks and builds pass
- ✅ OpenSpec validation passes
