#!/usr/bin/env bun
/**
 * OpenRouter Streaming Usage Example
 *
 * Demonstrates how to track usage metrics with streaming text generation.
 * IMPORTANT: Usage metrics are only available in the onFinish callback.
 *
 * Prerequisites:
 *   - OPENROUTER_API_KEY environment variable set
 *
 * Usage:
 *   bun run packages/agents/src/examples/openrouter/streaming-usage.ts
 */

import { openrouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import { extractOpenRouterUsage, summarizeUsage } from "../../index.js";

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
