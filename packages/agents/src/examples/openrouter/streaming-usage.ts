#!/usr/bin/env bun
/**
 * OpenRouter Streaming Usage Example
 *
 * Demonstrates how to track usage metrics with streaming text generation.
 * IMPORTANT: Usage metrics are only available in the onFinish callback.
 *
 * Prerequisites:
 *   - .env file in this directory with OPENROUTER_API_KEY
 *
 * Usage:
 *   bun run packages/agents/src/examples/openrouter/streaming-usage.ts
 */

import { join } from "node:path";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import { extractOpenRouterUsage, summarizeUsage } from "../../index.js";

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
	console.log("🌊 OpenRouter Streaming Usage Example\n");

	const model = openrouter("openai/gpt-4o-mini");
	const prompt = "Explain async/await in JavaScript in 2-3 sentences.";

	console.log(`📝 Prompt: "${prompt}"\n`);
	console.log("💬 Response (streaming):");

	// Variable to capture usage from onFinish
	let capturedUsage: ReturnType<typeof extractOpenRouterUsage> = null;

	const result = streamText({
		model,
		prompt,
		onFinish: (event) => {
			// ✅ CORRECT: Extract usage in onFinish callback
			capturedUsage = extractOpenRouterUsage(event);
		},
	});

	// Stream the text
	for await (const chunk of result.textStream) {
		process.stdout.write(chunk);
	}

	console.log("\n");

	// ❌ WRONG: This would be undefined in streaming mode
	// const usage = extractOpenRouterUsage(result);

	// ✅ CORRECT: Use the captured usage from onFinish
	if (capturedUsage) {
		console.log("📊 Usage Metrics (from onFinish):");
		console.log(`   ${summarizeUsage(capturedUsage, { detailed: true })}`);
	} else {
		console.log("⚠️  No usage metrics captured");
	}
}

main().catch((error) => {
	console.error("❌ Error:", error);
	process.exit(1);
});
