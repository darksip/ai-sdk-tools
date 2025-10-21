# usage-tracking-config Specification

## Purpose
TBD - created by archiving change add-global-usage-tracking. Update Purpose after archive.
## Requirements
### Requirement: Global Usage Tracking Configuration

The system SHALL provide a global configuration mechanism for automatic usage tracking across all agent instances.

#### Scenario: Configure global usage tracker

- **WHEN** calling `configureUsageTracking({ onUsage: handler })`
- **THEN** the handler function is stored as the global usage tracker
- **AND** all subsequent agent generations and streams invoke this handler
- **AND** the handler receives a `UsageTrackingEvent` object with agent context and usage metrics

#### Scenario: Reset global usage tracking

- **WHEN** calling `resetUsageTracking()`
- **THEN** the global usage tracker is cleared
- **AND** subsequent agent operations do not invoke any tracking handler

#### Scenario: Shorthand configuration with handler function

- **WHEN** calling `configureUsageTracking(handler)` with just a function (not config object)
- **THEN** the function is treated as the `onUsage` handler
- **AND** tracking behaves identically to passing `{ onUsage: handler }`

### Requirement: UsageTrackingEvent Structure

The system SHALL provide a structured event object to usage tracking handlers containing all relevant context and metrics.

#### Scenario: Event includes agent context

- **WHEN** a usage tracking event is created
- **THEN** the event includes `agentName` (string) identifying the agent
- **AND** includes optional `sessionId` extracted from execution context
- **AND** includes optional `handoffChain` (array of agent names) for multi-agent flows

#### Scenario: Event includes usage metrics

- **WHEN** a usage tracking event is created
- **THEN** the event includes `usage` field with standard AI SDK `LanguageModelUsage` structure
- **AND** includes `providerMetadata` field with provider-specific metadata (if available)
- **AND** includes `finishReason` indicating how generation completed

#### Scenario: Event includes generation metadata

- **WHEN** a usage tracking event is created
- **THEN** the event includes `method` field ('generate' or 'stream') indicating generation type
- **AND** includes optional `duration` in milliseconds for generate() calls
- **AND** includes optional `context` with full execution context

### Requirement: Automatic Tracking in Agent.generate()

The system SHALL automatically invoke the global usage tracker after each successful `agent.generate()` call.

#### Scenario: Track usage after generate() completes

- **WHEN** `agent.generate()` completes successfully
- **THEN** if a global usage tracker is configured, it MUST be invoked with a `UsageTrackingEvent`
- **AND** the event has `method: 'generate'`
- **AND** the event includes `duration` calculated from start to end of generation
- **AND** tracking failures do NOT throw errors or affect the generation result

#### Scenario: No tracking when tracker not configured

- **WHEN** `agent.generate()` is called and no global tracker is configured
- **THEN** no tracking handler is invoked
- **AND** generation proceeds normally without overhead

### Requirement: Automatic Tracking in Agent.stream()

The system SHALL automatically invoke the global usage tracker in the `onFinish` callback of `agent.stream()`.

#### Scenario: Compose tracking with user onFinish callback

- **WHEN** `agent.stream()` is called with user-provided `onFinish` callback
- **AND** a global usage tracker is configured
- **THEN** both the user callback and tracking handler MUST be invoked
- **AND** they execute in parallel (Promise.all)
- **AND** failure in tracking does NOT prevent user callback from executing

#### Scenario: Track usage when no user onFinish provided

- **WHEN** `agent.stream()` is called without `onFinish` callback
- **AND** a global usage tracker is configured
- **THEN** an `onFinish` callback is automatically added
- **AND** it invokes the tracking handler with `method: 'stream'`

#### Scenario: Streaming event includes finish event metadata

- **WHEN** tracking handler is invoked from `agent.stream()` onFinish
- **THEN** the event includes `usage` and `providerMetadata` from the finish event
- **AND** the event includes `finishReason` from the finish event
- **AND** duration is NOT included (streaming duration is tracked by user if needed)

### Requirement: Multi-Agent Handoff Tracking

The system SHALL track usage for each agent individually in multi-agent handoff scenarios.

#### Scenario: Track each agent with handoff chain context

- **WHEN** a multi-agent handoff occurs
- **THEN** each agent's usage is tracked separately with its own `UsageTrackingEvent`
- **AND** each event includes `handoffChain` array containing names of all agents in the chain up to current
- **AND** the `agentName` field identifies the specific agent that generated this usage

#### Scenario: Handoff chain propagates through context

- **WHEN** an agent hands off to another agent
- **THEN** the `_handoffChain` array is maintained in execution context
- **AND** each subsequent agent appends its name to the chain
- **AND** the chain is included in usage tracking events for attribution

### Requirement: Error Handling and Resilience

The system SHALL ensure that tracking failures do not disrupt AI generation operations.

#### Scenario: Silent error handling by default

- **WHEN** a usage tracking handler throws an error
- **THEN** the error is caught and logged internally
- **AND** the generation or streaming operation continues normally
- **AND** the result is returned to the user unchanged

#### Scenario: Custom error handling via onError callback

- **WHEN** `configureUsageTracking` is called with `onError` callback
- **AND** the `onUsage` handler throws an error
- **THEN** the `onError` callback MUST be invoked with the error and event
- **AND** the default error logging is skipped
- **AND** the generation operation still continues normally

#### Scenario: Async tracking does not block generation

- **WHEN** the tracking handler returns a Promise (async operation)
- **THEN** for `agent.generate()`, tracking completes before returning result
- **AND** for `agent.stream()`, tracking runs in parallel with user's onFinish
- **AND** errors in async tracking are caught and handled per error handling rules

### Requirement: Context Extraction and Propagation

The system SHALL automatically extract relevant context information from execution context for tracking events.

#### Scenario: Extract sessionId from execution context

- **WHEN** `agent.generate()` or `agent.stream()` is called with execution context
- **AND** the context contains a `sessionId` field
- **THEN** the tracking event MUST include this `sessionId`
- **AND** if no `sessionId` is present, the field is omitted (undefined)

#### Scenario: Include full context in tracking event

- **WHEN** a tracking event is created
- **THEN** the `context` field includes the complete execution context object
- **AND** user can access any custom fields they added to context
- **AND** internal fields like `_handoffChain` are preserved

### Requirement: TypeScript Type Safety

The system SHALL provide complete TypeScript type definitions for all tracking-related APIs.

#### Scenario: UsageTrackingEvent type exported

- **WHEN** importing from `@fondation-io/agents`
- **THEN** `UsageTrackingEvent` type is available
- **AND** includes all documented fields with correct types
- **AND** optional fields are properly marked with `?`

#### Scenario: UsageTrackingHandler type exported

- **WHEN** defining a tracking handler
- **THEN** `UsageTrackingHandler` type is available for type annotation
- **AND** correctly types the event parameter and return type (void | Promise<void>)

#### Scenario: Configuration function types

- **WHEN** calling `configureUsageTracking`
- **THEN** TypeScript enforces correct signature (config object or handler function)
- **AND** IDE autocomplete suggests all available config options

