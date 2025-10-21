#!/usr/bin/env bun
/**
 * OpenRouter Prompt Caching Example
 *
 * Demonstrates Anthropic prompt caching via OpenRouter to reduce costs
 * and latency for repeated prompts with large system messages.
 *
 * Prerequisites:
 *   - OPENROUTER_API_KEY environment variable set
 *
 * Usage:
 *   bun run packages/agents/src/examples/openrouter/prompt-caching.ts
 */

import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { extractOpenRouterUsage, formatCost, formatTokens } from "../../index.js";

// Simulate a large system prompt (would be much larger in practice)
const LARGE_DOCUMENTATION = `
You are an expert TypeScript consultant with deep knowledge of:

- TypeScript type system and advanced types
- Generic type constraints and inference
- Conditional types and mapped types
- Template literal types
- Type guards and narrowing
- Module resolution and declaration files
- tsconfig.json configuration
- Build tools (tsc, tsup, rollup)
- Testing with TypeScript
- Performance optimization

You provide accurate, concise answers based on the latest TypeScript best practices.
`;

async function makeRequest(prompt: string, withCache: boolean): Promise<void> {
	const messages = [
		{
			role: "system" as const,
			content: withCache
				? [
						{
							type: "text" as const,
							text: LARGE_DOCUMENTATION,
							// Enable caching for this content part
							experimental_providerMetadata: {
								openrouter: {
									cacheControl: { type: "ephemeral" },
								},
							},
						},
					]
				: LARGE_DOCUMENTATION,
		},
		{
			role: "user" as const,
			content: prompt,
		},
	];

	const result = await generateText({
		model: openrouter("anthropic/claude-3-5-sonnet"),
		messages,
	});

	const usage = extractOpenRouterUsage(result);

	if (usage) {
		const cachedTokens = usage.promptTokensDetails?.cachedTokens || 0;
		console.log(`   Tokens: ${formatTokens(usage.totalTokens)}`);
		console.log(`   Cached: ${formatTokens(cachedTokens)}`);
		console.log(`   Cost: ${formatCost(usage.cost)}`);

		if (cachedTokens > 0) {
			const cachePercentage = ((cachedTokens / usage.promptTokens) * 100).toFixed(1);
			console.log(`   Cache hit: ${cachePercentage}% of prompt tokens\n`);
		} else {
			console.log(`   Cache hit: None (cache miss)\n`);
		}
	}
}

async function main() {
	console.log("💾 OpenRouter Prompt Caching Example\n");

	// First request - cache miss (builds cache)
	console.log("📝 Request 1: Initial request (cache miss expected)");
	await makeRequest("Explain TypeScript generics in one sentence.", true);

	// Wait a moment to ensure cache is ready
	await new Promise((resolve) => setTimeout(resolve, 1000));

	// Second request - cache hit (uses cached prompt)
	console.log("📝 Request 2: Follow-up request (cache hit expected)");
	await makeRequest("What are mapped types?", true);

	console.log("✅ Prompt caching demonstration complete");
	console.log("\n💡 Note: Cache hits reduce costs by ~90% and improve latency");
	console.log("   Cache TTL is 5 minutes by default");
}

main().catch((error) => {
	console.error("❌ Error:", error);
	process.exit(1);
});
