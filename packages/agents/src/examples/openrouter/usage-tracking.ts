#!/usr/bin/env bun
/**
 * OpenRouter Usage Tracking Example
 *
 * Demonstrates different ways to track and format OpenRouter usage metrics.
 *
 * Prerequisites:
 *   - OPENROUTER_API_KEY environment variable set
 *
 * Usage:
 *   bun run packages/agents/src/examples/openrouter/usage-tracking.ts
 */

import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import {
	extractOpenRouterUsage,
	extractOpenRouterUsageWithDefaults,
	formatCost,
	formatTokens,
	summarizeUsage,
} from "../../index.js";

async function main() {
	console.log("📊 OpenRouter Usage Tracking Example\n");

	const model = openrouter("openai/gpt-3.5-turbo");
	const prompt = "Write a haiku about TypeScript";

	console.log(`📝 Prompt: "${prompt}"\n`);

	// Generate text
	const result = await generateText({
		model,
		prompt,
	});

	console.log(`💬 Response:\n${result.text}\n`);

	// Method 1: Extract with null check
	console.log("Method 1: Extract with null check");
	const usage = extractOpenRouterUsage(result);
	if (usage) {
		console.log(`   Tokens: ${formatTokens(usage.totalTokens)}`);
		console.log(`   Cost: ${formatCost(usage.cost)}\n`);
	}

	// Method 2: Extract with defaults
	console.log("Method 2: Extract with defaults");
	const usageWithDefaults = extractOpenRouterUsageWithDefaults(result);
	console.log(`   Present: ${usageWithDefaults.present}`);
	console.log(`   Tokens: ${formatTokens(usageWithDefaults.totalTokens)}`);
	console.log(`   Cost: ${formatCost(usageWithDefaults.cost)}\n`);

	// Method 3: Formatted summary
	console.log("Method 3: Formatted summary");
	console.log(`   ${summarizeUsage(usage)}\n`);

	// Method 4: Detailed summary
	console.log("Method 4: Detailed summary");
	console.log(`   ${summarizeUsage(usage, { detailed: true })}\n`);

	// Show additional details if available
	if (usage?.promptTokensDetails?.cachedTokens) {
		console.log(`💾 Cached tokens: ${formatTokens(usage.promptTokensDetails.cachedTokens)}`);
	}

	if (usage?.completionTokensDetails?.reasoningTokens) {
		console.log(
			`🧠 Reasoning tokens: ${formatTokens(usage.completionTokensDetails.reasoningTokens)}`,
		);
	}
}

main().catch((error) => {
	console.error("❌ Error:", error);
	process.exit(1);
});
