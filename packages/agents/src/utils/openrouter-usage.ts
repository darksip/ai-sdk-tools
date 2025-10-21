/**
 * OpenRouter Usage Tracking Utilities
 *
 * Helper functions for extracting, formatting, and tracking OpenRouter usage metrics
 *
 * @module @fondation-io/agents/utils/openrouter-usage
 */

import type { OpenRouterUsage } from "../types/openrouter.js";
import { hasOpenRouterUsage } from "../types/openrouter.js";

/**
 * Result of usage extraction with presence indicator
 */
export interface UsageExtractionResult {
	/** Whether real OpenRouter usage data was found */
	present: boolean;

	/** Total tokens used */
	totalTokens: number;

	/** Tokens in the prompt */
	promptTokens: number;

	/** Tokens in the completion */
	completionTokens: number;

	/** Cost in USD */
	cost: number;

	/** Cached tokens (if applicable) */
	cachedTokens?: number;

	/** Reasoning tokens (if applicable) */
	reasoningTokens?: number;
}

/**
 * Extract OpenRouter usage metrics from generation result or finish event
 *
 * Safely extracts usage data from `providerMetadata.openrouter.usage`
 * Returns null if OpenRouter metadata is not present
 *
 * @param result - Generation result from generateText/streamText or onFinish event
 * @returns Usage metrics or null if not present
 *
 * @example
 * ```typescript
 * // With generateText
 * const result = await generateText({
 *   model: openrouter('openai/gpt-4o'),
 *   prompt: 'Hello'
 * });
 * const usage = extractOpenRouterUsage(result);
 * if (usage) {
 *   console.log('Cost:', usage.cost);
 * }
 *
 * // With streamText onFinish
 * streamText({
 *   model: openrouter('openai/gpt-4o'),
 *   prompt: 'Hello',
 *   onFinish: (event) => {
 *     const usage = extractOpenRouterUsage(event);
 *     if (usage) {
 *       console.log('Tokens:', usage.totalTokens);
 *     }
 *   }
 * });
 * ```
 */
export function extractOpenRouterUsage(
	result: { providerMetadata?: unknown } | undefined,
): OpenRouterUsage | null {
	if (!result?.providerMetadata) {
		return null;
	}

	if (!hasOpenRouterUsage(result.providerMetadata)) {
		return null;
	}

	return result.providerMetadata.openrouter.usage;
}

/**
 * Extract usage with default fallback values
 *
 * Similar to extractOpenRouterUsage but returns an object with default values
 * and a `present` flag instead of null
 *
 * @param result - Generation result or onFinish event
 * @returns Usage extraction result with presence indicator
 */
export function extractOpenRouterUsageWithDefaults(
	result: { providerMetadata?: unknown } | undefined,
): UsageExtractionResult {
	const usage = extractOpenRouterUsage(result);

	if (!usage) {
		return {
			present: false,
			totalTokens: 0,
			promptTokens: 0,
			completionTokens: 0,
			cost: 0,
		};
	}

	return {
		present: true,
		totalTokens: usage.totalTokens,
		promptTokens: usage.promptTokens,
		completionTokens: usage.completionTokens,
		cost: usage.cost,
		cachedTokens: usage.promptTokensDetails?.cachedTokens,
		reasoningTokens: usage.completionTokensDetails?.reasoningTokens,
	};
}

/**
 * Format cost value as USD string
 *
 * @param cost - Cost in USD
 * @returns Formatted cost string (e.g., "$0.000123")
 *
 * @example
 * ```typescript
 * console.log(formatCost(0.000123)); // "$0.000123"
 * console.log(formatCost(0));         // "$0.000000"
 * ```
 */
export function formatCost(cost: number | undefined): string {
	if (cost === undefined || cost === null || Number.isNaN(cost)) {
		return "$0.000000";
	}

	// For very small values, use scientific notation
	if (cost > 0 && cost < 0.000001) {
		return `$${cost.toExponential(2)}`;
	}

	return `$${cost.toFixed(6)}`;
}

/**
 * Format token count with comma separators
 *
 * @param count - Token count
 * @returns Formatted token count (e.g., "1,234")
 *
 * @example
 * ```typescript
 * console.log(formatTokens(1234));  // "1,234"
 * console.log(formatTokens(0));     // "0"
 * ```
 */
export function formatTokens(count: number | undefined): string {
	if (count === undefined || count === null || Number.isNaN(count)) {
		return "0";
	}

	return count.toLocaleString("en-US");
}

/**
 * Options for summarizeUsage
 */
export interface SummarizeUsageOptions {
	/** Include detailed token breakdown */
	detailed?: boolean;
}

/**
 * Create a human-readable summary of usage metrics
 *
 * @param usage - OpenRouter usage metrics
 * @param options - Formatting options
 * @returns Formatted summary string
 *
 * @example
 * ```typescript
 * const usage = extractOpenRouterUsage(result);
 * if (usage) {
 *   console.log(summarizeUsage(usage));
 *   // "27 tokens ($0.000028)"
 *
 *   console.log(summarizeUsage(usage, { detailed: true }));
 *   // "27 tokens (13 prompt + 14 completion) ($0.000028)"
 * }
 * ```
 */
export function summarizeUsage(
	usage: OpenRouterUsage | null | undefined,
	options?: SummarizeUsageOptions,
): string {
	if (!usage) {
		return "No usage data available";
	}

	const tokens = formatTokens(usage.totalTokens);
	const cost = formatCost(usage.cost);

	if (options?.detailed) {
		const promptTokens = formatTokens(usage.promptTokens);
		const completionTokens = formatTokens(usage.completionTokens);

		let details = `${tokens} tokens (${promptTokens} prompt + ${completionTokens} completion)`;

		if (usage.promptTokensDetails?.cachedTokens) {
			details += `, ${formatTokens(usage.promptTokensDetails.cachedTokens)} cached`;
		}

		if (usage.completionTokensDetails?.reasoningTokens) {
			details += `, ${formatTokens(usage.completionTokensDetails.reasoningTokens)} reasoning`;
		}

		return `${details} (${cost})`;
	}

	return `${tokens} tokens (${cost})`;
}

/**
 * Options for creating a UsageAccumulator
 */
export interface UsageAccumulatorOptions {
	/** Maximum allowed cost in USD (throws on exceed) */
	maxCost?: number;

	/** Callback when budget threshold is approached (90%) */
	onBudgetWarning?: (remaining: number) => void;
}

/**
 * Accumulated usage metrics
 */
export interface AccumulatedUsage {
	/** Total tokens across all requests */
	totalTokens: number;

	/** Total prompt tokens */
	promptTokens: number;

	/** Total completion tokens */
	completionTokens: number;

	/** Total cost in USD */
	cost: number;

	/** Number of requests tracked */
	requestCount: number;
}

/**
 * Accumulate usage metrics across multiple requests
 *
 * Provides budget monitoring and cumulative tracking
 *
 * @example
 * ```typescript
 * const accumulator = new UsageAccumulator({ maxCost: 1.00 });
 *
 * for (const prompt of prompts) {
 *   const result = await streamText({
 *     model: openrouter('openai/gpt-4o'),
 *     prompt,
 *     onFinish: (event) => {
 *       const usage = extractOpenRouterUsage(event);
 *       if (usage) {
 *         accumulator.add(usage);
 *       }
 *     }
 *   });
 *
 *   for await (const chunk of result.textStream) {
 *     process.stdout.write(chunk);
 *   }
 * }
 *
 * const total = accumulator.getTotal();
 * console.log(`Total: ${total.cost.toFixed(4)}$`);
 * ```
 */
export class UsageAccumulator {
	private totalTokens = 0;
	private promptTokens = 0;
	private completionTokens = 0;
	private cost = 0;
	private requestCount = 0;
	private readonly options: UsageAccumulatorOptions;
	private warningTriggered = false;

	constructor(options: UsageAccumulatorOptions = {}) {
		this.options = options;
	}

	/**
	 * Add usage metrics from a request
	 *
	 * @param usage - OpenRouter usage metrics
	 * @throws Error if maxCost budget would be exceeded
	 */
	add(usage: OpenRouterUsage): void {
		const newCost = this.cost + usage.cost;

		// Check budget limit
		if (this.options.maxCost !== undefined && newCost > this.options.maxCost) {
			throw new Error(
				`Budget exceeded: ${formatCost(newCost)} > ${formatCost(this.options.maxCost)} (limit)`,
			);
		}

		// Check warning threshold (90% of budget)
		if (
			this.options.maxCost !== undefined &&
			this.options.onBudgetWarning &&
			!this.warningTriggered &&
			newCost >= this.options.maxCost * 0.9
		) {
			this.warningTriggered = true;
			const remaining = this.options.maxCost - newCost;
			this.options.onBudgetWarning(remaining);
		}

		// Accumulate metrics
		this.totalTokens += usage.totalTokens;
		this.promptTokens += usage.promptTokens;
		this.completionTokens += usage.completionTokens;
		this.cost = newCost;
		this.requestCount++;
	}

	/**
	 * Get cumulative totals
	 *
	 * @returns Accumulated usage metrics
	 */
	getTotal(): AccumulatedUsage {
		return {
			totalTokens: this.totalTokens,
			promptTokens: this.promptTokens,
			completionTokens: this.completionTokens,
			cost: this.cost,
			requestCount: this.requestCount,
		};
	}

	/**
	 * Get remaining budget
	 *
	 * @returns Remaining USD or undefined if no budget set
	 */
	getRemainingBudget(): number | undefined {
		if (this.options.maxCost === undefined) {
			return undefined;
		}

		return Math.max(0, this.options.maxCost - this.cost);
	}

	/**
	 * Reset all counters to zero
	 */
	reset(): void {
		this.totalTokens = 0;
		this.promptTokens = 0;
		this.completionTokens = 0;
		this.cost = 0;
		this.requestCount = 0;
		this.warningTriggered = false;
	}

	/**
	 * Get formatted summary of accumulated usage
	 *
	 * @param options - Formatting options
	 * @returns Human-readable summary
	 */
	summarize(options?: SummarizeUsageOptions): string {
		const tokens = formatTokens(this.totalTokens);
		const cost = formatCost(this.cost);

		if (options?.detailed) {
			const promptTokens = formatTokens(this.promptTokens);
			const completionTokens = formatTokens(this.completionTokens);
			const avgPerRequest =
				this.requestCount > 0 ? this.cost / this.requestCount : 0;

			return `${tokens} tokens (${promptTokens} prompt + ${completionTokens} completion) across ${this.requestCount} requests (${cost} total, ${formatCost(avgPerRequest)}/request)`;
		}

		return `${tokens} tokens (${cost}) across ${this.requestCount} requests`;
	}
}
