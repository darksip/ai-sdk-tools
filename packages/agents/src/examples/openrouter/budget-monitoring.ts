#!/usr/bin/env bun
/**
 * OpenRouter Budget Monitoring Example
 *
 * Demonstrates how to use UsageAccumulator to track costs across
 * multiple requests and enforce budget limits.
 *
 * Prerequisites:
 *   - OPENROUTER_API_KEY environment variable set
 *
 * Usage:
 *   bun run packages/agents/src/examples/openrouter/budget-monitoring.ts
 */

import { openrouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import {
	UsageAccumulator,
	extractOpenRouterUsage,
	formatCost,
} from "../../index.js";

const prompts = [
	"What is TypeScript?",
	"Explain async/await",
	"What are React hooks?",
	"Describe REST APIs",
];

async function main() {
	console.log("💰 OpenRouter Budget Monitoring Example\n");

	// Create accumulator with $0.01 budget limit
	const accumulator = new UsageAccumulator({
		maxCost: 0.01,
		onBudgetWarning: (remaining) => {
			console.log(`\n⚠️  Budget warning: ${formatCost(remaining)} remaining\n`);
		},
	});

	console.log(`📊 Budget: ${formatCost(0.01)}`);
	console.log(`📝 Processing ${prompts.length} prompts...\n`);

	const model = openrouter("openai/gpt-3.5-turbo");

	try {
		for (let i = 0; i < prompts.length; i++) {
			const prompt = prompts[i];

			console.log(`${i + 1}. "${prompt}"`);

			const result = streamText({
				model,
				prompt,
				onFinish: (event) => {
					const usage = extractOpenRouterUsage(event);
					if (usage) {
						try {
							accumulator.add(usage);
							console.log(
								`   ✓ Cost: ${formatCost(usage.cost)} | Remaining: ${formatCost(accumulator.getRemainingBudget())}`,
							);
						} catch (error) {
							// Budget exceeded
							throw error;
						}
					}
				},
			});

			// Consume the stream
			for await (const _ of result.textStream) {
				// Silently consume
			}
		}

		console.log("\n" + "─".repeat(60));
		console.log("📈 Final Summary:");
		console.log(`   ${accumulator.summarize({ detailed: true })}`);
		console.log(`   Remaining budget: ${formatCost(accumulator.getRemainingBudget())}`);
		console.log("\n✅ All requests completed within budget");
	} catch (error) {
		if (error instanceof Error && error.message.includes("Budget exceeded")) {
			console.log("\n" + "─".repeat(60));
			console.log("🛑 Budget Exceeded!");

			const total = accumulator.getTotal();
			console.log(`   Total spent: ${formatCost(total.cost)}`);
			console.log(`   Requests completed: ${total.requestCount}/${prompts.length}`);
			console.log(`   ${accumulator.summarize({ detailed: true })}`);
		} else {
			throw error;
		}
	}
}

main().catch((error) => {
	console.error("❌ Error:", error);
	process.exit(1);
});
