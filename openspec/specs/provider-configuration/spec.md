# provider-configuration Specification

## Purpose

Defines requirements for type-safe OpenRouter providerOptions configuration, including TypeScript definitions for reasoning parameters, transforms, fallback routing, model lists, and prompt caching controls to enable compile-time validation and IDE autocomplete for OpenRouter-specific features.
## Requirements
### Requirement: Type-Safe providerOptions Support

The system SHALL provide type definitions for OpenRouter-specific `providerOptions`.

#### Scenario: Reasoning configuration typing

- **WHEN** using `providerOptions.openrouter.reasoning`
- **THEN** TypeScript recognizes `max_tokens` as a valid property
- **AND** autocomplete suggests the correct structure `{ max_tokens: number }`

#### Scenario: Transforms array typing

- **WHEN** using `providerOptions.openrouter.transforms`
- **THEN** TypeScript expects an array of valid transform names
- **AND** suggests known transforms like `'middle-out'`

#### Scenario: Route and models for fallback

- **WHEN** using `providerOptions.openrouter.route: 'fallback'`
- **THEN** TypeScript expects `models` to be an array of model ID strings
- **AND** autocomplete works for both `route` and `models` properties

### Requirement: Cache Control Support

The system SHALL support Anthropic prompt caching via OpenRouter `providerOptions`.

#### Scenario: Message-level cache control

- **WHEN** adding `providerOptions.openrouter.cacheControl: { type: 'ephemeral' }` to a message content part
- **THEN** the type system recognizes this as valid for text content parts
- **AND** OpenRouter forwards the cache control directive to Anthropic models

#### Scenario: Cache control typing

- **WHEN** using cache control in providerOptions
- **THEN** TypeScript enforces the structure `{ type: 'ephemeral' }`
- **AND** rejects invalid type values

### Requirement: providerOptions Examples

The system SHALL provide examples demonstrating all major `providerOptions` use cases.

#### Scenario: Fallback configuration example

- **WHEN** a developer wants to configure model fallbacks
- **THEN** an example shows the complete `providerOptions.openrouter` structure
- **AND** demonstrates `route: 'fallback'` with a `models` array

#### Scenario: Reasoning token configuration

- **WHEN** using OpenAI O1 models via OpenRouter
- **THEN** an example shows `reasoning: { max_tokens: 10 }`
- **AND** explains how this affects cost via reasoning tokens in usage metadata

#### Scenario: Prompt caching example

- **WHEN** using Anthropic models with large system prompts
- **THEN** an example shows message-level `cacheControl` configuration
- **AND** demonstrates accessing `usage.promptTokensDetails.cachedTokens` to verify caching

