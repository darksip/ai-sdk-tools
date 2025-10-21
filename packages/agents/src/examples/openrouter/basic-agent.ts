#!/usr/bin/env bun
/**
 * Basic OpenRouter Agent Example
 *
 * Demonstrates how to use OpenRouter models with @fondation-io/agents
 * and extract usage metrics.
 *
 * Prerequisites:
 *   - .env file in this directory with OPENROUTER_API_KEY
 *   - @openrouter/ai-sdk-provider installed
 *
 * Usage:
 *   bun run packages/agents/src/examples/openrouter/basic-agent.ts
 */

import { join } from "node:path";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { Agent, extractOpenRouterUsage, formatCost, formatTokens } from "../../index.js";

// Load environment variables from .env file in current directory
async function loadEnv() {
	const envPath = join(import.meta.dir, ".env");
	try {
		const envContent = await Bun.file(envPath).text();
		for (const line of envContent.split("\n")) {
			const trimmedLine = line.trim();
			if (trimmedLine && !trimmedLine.startsWith("#")) {
				const equalIndex = trimmedLine.indexOf("=");
				if (equalIndex > 0) {
					const key = trimmedLine.substring(0, equalIndex).trim();
					const value = trimmedLine.substring(equalIndex + 1).trim();
					process.env[key] = value;
				}
			}
		}
	} catch (error) {
		console.warn("⚠️  .env file not found. Using existing environment variables.");
	}
}

await loadEnv();

async function main() {
	console.log("🤖 Basic OpenRouter Agent Example\n");

	// Create an agent with an OpenRouter model
	const agent = new Agent({
		name: "Assistant",
		model: openrouter("openai/gpt-4o-mini"), // Cost-effective model
		instructions: "You are a helpful assistant. Keep responses concise.",
	});

	const prompt = "Explain what OpenRouter is in one sentence.";

	console.log(`📝 Prompt: "${prompt}"\n`);

	// Generate a response
	const result = await agent.generate({
		prompt,
	});

	console.log(`💬 Response: ${result.text}\n`);

	// Extract usage metrics
	const usage = extractOpenRouterUsage(result);

	if (usage) {
		console.log("📊 Usage Metrics:");
		console.log(`   Total tokens:      ${formatTokens(usage.totalTokens)}`);
		console.log(`   Prompt tokens:     ${formatTokens(usage.promptTokens)}`);
		console.log(`   Completion tokens: ${formatTokens(usage.completionTokens)}`);
		console.log(`   Cost:              ${formatCost(usage.cost)}\n`);
	} else {
		console.log("⚠️  No usage metrics available\n");
	}

	// Show finish reason
	console.log(`✅ Finish reason: ${result.finishReason}`);
}

main().catch((error) => {
	console.error("❌ Error:", error);
	process.exit(1);
});
