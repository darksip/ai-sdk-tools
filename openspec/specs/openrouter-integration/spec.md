# openrouter-integration Specification

## Purpose

Defines requirements for OpenRouter provider integration in @fondation-io/agents, including type-safe definitions for provider metadata and options, working examples demonstrating usage patterns, and proper propagation of providerMetadata through Agent methods to enable cost tracking and usage monitoring.
## Requirements
### Requirement: OpenRouter Type Definitions

The system SHALL provide TypeScript type definitions for OpenRouter provider metadata and options.

#### Scenario: Type definitions exported

- **WHEN** a developer imports OpenRouter types from `@fondation-io/agents`
- **THEN** TypeScript definitions for `OpenRouterMetadata`, `OpenRouterUsage`, and `OpenRouterProviderOptions` are available
- **AND** these types match the structure documented in `@openrouter/ai-sdk-provider`

#### Scenario: Usage metadata typing

- **WHEN** accessing `result.providerMetadata?.openrouter?.usage` after a generation
- **THEN** TypeScript recognizes the shape as `OpenRouterUsage` with properties: `totalTokens`, `promptTokens`, `completionTokens`, `cost`, `promptTokensDetails`, `completionTokensDetails`
- **AND** all numeric fields are typed as `number | undefined`

#### Scenario: Provider options typing

- **WHEN** using `providerOptions.openrouter` in a `streamText` or `generateText` call
- **THEN** TypeScript autocomplete suggests: `reasoning`, `transforms`, `route`, `models`, `cacheControl`
- **AND** invalid option names are caught at compile time

### Requirement: OpenRouter Integration Examples

The system SHALL provide working examples demonstrating OpenRouter usage with agents.

#### Scenario: Basic agent with OpenRouter model

- **WHEN** a developer references the basic OpenRouter agent example
- **THEN** the example shows how to create an agent using `openrouter('model-id')`
- **AND** demonstrates accessing usage metrics via `providerMetadata.openrouter.usage`

#### Scenario: Multi-model fallback example

- **WHEN** a developer wants to implement model fallbacks
- **THEN** an example shows using `providerOptions.openrouter.route: 'fallback'`
- **AND** demonstrates specifying multiple models in `providerOptions.openrouter.models`

#### Scenario: Streaming with usage tracking

- **WHEN** a developer needs to track costs in streaming mode
- **THEN** an example demonstrates using the `onFinish` callback
- **AND** shows extracting `event.providerMetadata?.openrouter?.usage` for cost and token metrics

### Requirement: Agent Result Metadata Propagation

The system SHALL propagate `providerMetadata` from AI SDK results through Agent methods to enable OpenRouter usage tracking.

#### Scenario: AgentGenerateResult includes providerMetadata

- **WHEN** examining the `AgentGenerateResult` interface
- **THEN** it MUST include a `providerMetadata?: unknown` field
- **AND** this field is explicitly documented as containing provider-specific metadata including OpenRouter usage metrics

#### Scenario: Agent.generate() returns providerMetadata

- **WHEN** calling `agent.generate()` with an OpenRouter model
- **THEN** the result MUST include `providerMetadata` from the underlying AI SDK call
- **AND** `extractOpenRouterUsage(result)` successfully extracts usage metrics
- **AND** metrics include `totalTokens`, `promptTokens`, `completionTokens`, and `cost`

#### Scenario: providerMetadata propagation in implementation

- **WHEN** the Agent class processes a generation result
- **THEN** it MUST copy `result.providerMetadata` to the returned `AgentGenerateResult`
- **AND** the propagation occurs in both success and handoff scenarios
- **AND** the metadata is preserved without modification

#### Scenario: Agent.stream() supports onFinish callback

- **WHEN** calling `agent.stream()` with an `onFinish` callback parameter
- **THEN** the callback MUST be passed to the underlying AI SDK `streamText` call
- **AND** the callback receives events with `providerMetadata` field populated
- **AND** usage metrics can be extracted from the finish event via `extractOpenRouterUsage()`

#### Scenario: Agent.stream() handles undefined executionContext

- **WHEN** calling `agent.stream({ prompt: "..." })` without providing `executionContext`
- **THEN** the method MUST NOT throw errors
- **AND** optional chaining or defensive checks prevent accessing properties on undefined
- **AND** the stream works correctly with default values

### Requirement: Integration Documentation

The system SHALL link existing OpenRouter docs with new utilities and examples.

#### Scenario: Documentation discoverability

- **WHEN** a developer searches for "OpenRouter" in the project
- **THEN** they find references to both `/docs/openrouter-integration.md` and the new utilities
- **AND** the integration guide explains the relationship between the provider package and fondation-io utilities

#### Scenario: Migration path clarity

- **WHEN** a developer is already using `@openrouter/ai-sdk-provider` directly
- **THEN** documentation clarifies that fondation-io utilities are optional helpers
- **AND** explains the value proposition (type safety, usage tracking utilities, examples)

