# usage-tracking Specification

## Purpose

Defines requirements for OpenRouter usage tracking utilities, including extraction functions for usage metrics from various generation methods (generateText, streamText, agent.generate, agent.stream), formatting helpers for displaying costs and token counts, and budget monitoring via UsageAccumulator for multi-request cost enforcement.
## Requirements
### Requirement: Usage Extraction Utility

The system SHALL provide a utility function to extract OpenRouter usage metrics from generation results.

#### Scenario: Extract usage from generateText result

- **WHEN** calling `extractOpenRouterUsage(result)` on a `generateText` result
- **THEN** the function returns an object with `totalTokens`, `promptTokens`, `completionTokens`, and `cost`
- **AND** returns `null` if OpenRouter metadata is not present

#### Scenario: Extract usage from Agent.generate() result

- **WHEN** calling `extractOpenRouterUsage(result)` on an `agent.generate()` result with an OpenRouter model
- **THEN** the function MUST successfully extract usage metrics from `result.providerMetadata`
- **AND** returns an object with non-zero `totalTokens`, `promptTokens`, `completionTokens`
- **AND** the extraction works identically to direct `generateText()` calls

#### Scenario: Extract usage from Agent.stream() result

- **WHEN** calling `agent.stream()` with an `onFinish` callback
- **THEN** the callback MUST receive an event with `providerMetadata` field
- **AND** `extractOpenRouterUsage(event)` successfully extracts usage metrics
- **AND** the extraction works identically to `streamText()` direct calls
- **AND** the method does not crash when `executionContext` is undefined

#### Scenario: Extract usage from streaming result

- **WHEN** calling `extractOpenRouterUsage(finishEvent)` from an `onFinish` callback
- **THEN** the function extracts usage from `finishEvent.providerMetadata?.openrouter?.usage`
- **AND** handles missing metadata gracefully without throwing

#### Scenario: Safe fallback for missing data

- **WHEN** OpenRouter metadata is absent or incomplete
- **THEN** the utility returns default values (0 for counts, 0.0 for cost)
- **AND** provides a `present: boolean` flag indicating if real data was found

### Requirement: Usage Formatting Helpers

The system SHALL provide helper functions to format usage metrics for display.

#### Scenario: Format cost in USD

- **WHEN** calling `formatCost(usage.cost)`
- **THEN** the result is a string formatted as `$0.000123` with 6 decimal places
- **AND** handles small values (< $0.000001) by showing scientific notation

#### Scenario: Format token counts

- **WHEN** calling `formatTokens(usage.totalTokens)`
- **THEN** the result is a comma-separated string (e.g., `1,234`)
- **AND** handles undefined values by returning `"0"`

#### Scenario: Summary statistics

- **WHEN** calling `summarizeUsage(usage)`
- **THEN** the result is a formatted string like `"27 tokens ($0.000028)"`
- **AND** includes breakdown if `detailed: true` option is passed

### Requirement: Streaming Usage Accumulator

The system SHALL provide a utility to accumulate usage across multiple streaming requests.

#### Scenario: Track cumulative costs

- **WHEN** creating a `UsageAccumulator` and calling `add(usage)` after each request
- **THEN** the accumulator maintains running totals for tokens and cost
- **AND** provides `getTotal()` method returning cumulative metrics

#### Scenario: Reset accumulator

- **WHEN** calling `accumulator.reset()`
- **THEN** all cumulative counters return to zero
- **AND** subsequent `add()` calls start fresh accumulation

#### Scenario: Budget threshold checking

- **WHEN** creating an accumulator with `maxCost: 1.00`
- **THEN** calling `accumulator.add(usage)` throws if total cost would exceed budget
- **AND** provides `getRemainingBudget()` method for proactive checking

