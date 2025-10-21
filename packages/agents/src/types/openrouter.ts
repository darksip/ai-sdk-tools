/**
 * OpenRouter Provider Type Definitions
 *
 * Type-safe interfaces for OpenRouter-specific provider metadata and options.
 * Based on @openrouter/ai-sdk-provider v1.2.0 API structure.
 *
 * @module @fondation-io/agents/types/openrouter
 */

/**
 * OpenRouter usage metrics returned in provider metadata
 *
 * Available in `result.providerMetadata?.openrouter?.usage` after generation
 *
 * @example
 * ```typescript
 * const result = await generateText({
 *   model: openrouter('openai/gpt-4o'),
 *   prompt: 'Hello'
 * });
 *
 * const usage: OpenRouterUsage | undefined =
 *   result.providerMetadata?.openrouter?.usage;
 *
 * console.log('Cost:', usage?.cost);
 * console.log('Tokens:', usage?.totalTokens);
 * ```
 */
export interface OpenRouterUsage {
	/** Total tokens used (prompt + completion) */
	totalTokens: number;

	/** Tokens in the prompt */
	promptTokens: number;

	/** Tokens in the completion */
	completionTokens: number;

	/** Cost in USD (computed from costDetails) */
	cost: number;

	/** Detailed breakdown of prompt tokens */
	promptTokensDetails?: {
		/** Cached tokens (Anthropic prompt caching) */
		cachedTokens?: number;
	};

	/** Detailed breakdown of completion tokens */
	completionTokensDetails?: {
		/** Reasoning tokens (OpenAI O1 models) */
		reasoningTokens?: number;
	};

	/** Cost details from OpenRouter */
	costDetails?: {
		/** Upstream inference cost in USD */
		upstreamInferenceCost?: number;
	};
}

/**
 * OpenRouter provider metadata structure
 *
 * Contains usage metrics and other OpenRouter-specific data
 */
export interface OpenRouterMetadata {
	/** Usage metrics for the generation */
	usage?: OpenRouterUsage;
}

/**
 * OpenRouter-specific provider options for streamText/generateText
 *
 * Used in `providerOptions.openrouter` field
 *
 * @example
 * ```typescript
 * const result = await streamText({
 *   model: openrouter('openai/gpt-4o'),
 *   messages,
 *   providerOptions: {
 *     openrouter: {
 *       route: 'fallback',
 *       models: [
 *         'openai/gpt-4o',
 *         'anthropic/claude-3-5-sonnet'
 *       ]
 *     }
 *   }
 * });
 * ```
 */
export interface OpenRouterProviderOptions {
	/** Reasoning token configuration (for O1 models) */
	reasoning?: {
		/** Maximum reasoning tokens to use */
		max_tokens: number;
	};

	/** Request transforms to apply */
	transforms?: string[];

	/** Routing strategy ('fallback' for automatic fallback) */
	route?: "fallback";

	/** Model IDs to try in order (when using route: 'fallback') */
	models?: string[];

	/** Cache control for Anthropic prompt caching */
	cacheControl?: {
		/** Cache type ('ephemeral' for automatic caching) */
		type: "ephemeral";
	};
}

/**
 * Type guard to check if provider metadata contains OpenRouter usage
 *
 * @example
 * ```typescript
 * if (hasOpenRouterUsage(result.providerMetadata)) {
 *   console.log('Cost:', result.providerMetadata.openrouter.usage.cost);
 * }
 * ```
 */
export function hasOpenRouterUsage(
	metadata: unknown,
): metadata is { openrouter: OpenRouterMetadata & { usage: OpenRouterUsage } } {
	return (
		typeof metadata === "object" &&
		metadata !== null &&
		"openrouter" in metadata &&
		typeof (metadata as any).openrouter === "object" &&
		(metadata as any).openrouter !== null &&
		"usage" in (metadata as any).openrouter &&
		typeof (metadata as any).openrouter.usage === "object" &&
		(metadata as any).openrouter.usage !== null
	);
}
