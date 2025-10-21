#!/usr/bin/env bun
/**
 * OpenRouter Multi-Model Fallback Example
 *
 * Demonstrates how to use OpenRouter's fallback routing to automatically
 * try multiple models if the primary model is unavailable.
 *
 * Prerequisites:
 *   - .env file in this directory with OPENROUTER_API_KEY
 *
 * Usage:
 *   bun run packages/agents/src/examples/openrouter/multi-model-fallback.ts
 */

import { join } from "node:path";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import type { OpenRouterProviderOptions } from "../../index.js";
import { extractOpenRouterUsage, formatCost } from "../../index.js";

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
	console.log("🔄 OpenRouter Multi-Model Fallback Example\n");

	// Use providerOptions to specify fallback models
	const providerOptions: { openrouter: OpenRouterProviderOptions } = {
		openrouter: {
			route: "fallback", // Enable automatic fallback
			models: [
				"openai/gpt-4o", // Try this first
				"anthropic/claude-3-5-sonnet", // Fallback 1
				"google/gemini-pro-1.5", // Fallback 2
			],
		},
	};

	const prompt = "What are the benefits of using multiple LLM providers?";

	console.log(`📝 Prompt: "${prompt}"\n`);
	console.log("🎯 Fallback chain:");
	console.log("   1. openai/gpt-4o");
	console.log("   2. anthropic/claude-3-5-sonnet");
	console.log("   3. google/gemini-pro-1.5\n");

	try {
		const result = await generateText({
			model: openrouter("openai/gpt-4o"), // Primary model
			prompt,
			providerOptions,
		});

		console.log(`💬 Response:\n${result.text}\n`);

		const usage = extractOpenRouterUsage(result);
		if (usage) {
			console.log("📊 Usage:");
			console.log(`   Tokens: ${usage.totalTokens}`);
			console.log(`   Cost: ${formatCost(usage.cost)}\n`);
		}

		console.log("✅ Request succeeded");
		console.log(`   Finish reason: ${result.finishReason}`);
	} catch (error) {
		console.error("❌ All models in fallback chain failed:", error);
	}
}

main().catch((error) => {
	console.error("❌ Error:", error);
	process.exit(1);
});
