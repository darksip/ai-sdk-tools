#!/usr/bin/env bun
/**
 * Agent Streaming with Usage Tracking Example
 *
 * Demonstrates how to use agent.stream() with OpenRouter and extract usage metrics
 * via the onFinish callback. This is useful for tracking costs in real-time streaming scenarios.
 *
 * Prerequisites:
 *   - .env file in this directory with OPENROUTER_API_KEY
 *   - @openrouter/ai-sdk-provider installed
 *
 * Usage:
 *   bun run packages/agents/src/examples/openrouter/agent-streaming-usage.ts
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
	console.log("🤖 Agent Streaming with Usage Tracking\n");

	const model = openrouter("anthropic/claude-3.5-haiku");

	const agent = new Agent({
		name: "assistant",
		model,
		instructions: "You are a helpful assistant. Be concise and friendly.",
	});

	console.log("Streaming response: ");
	process.stdout.write("💬 ");

	// Stream with onFinish callback to capture usage metrics
	const stream = agent.stream({
		prompt: "Explain what OpenRouter is in one sentence.",
		onFinish: async (event) => {
			// Extract usage metrics from the finish event
			const usage = extractOpenRouterUsage(event);

			if (usage) {
				console.log("\n\n📊 Usage Metrics:");
				console.log(`   Total tokens: ${formatTokens(usage.totalTokens)}`);
				console.log(`   Cost: ${formatCost(usage.cost)}`);
				console.log(`   Breakdown: ${usage.promptTokens} prompt + ${usage.completionTokens} completion`);

				if (usage.promptTokensDetails?.cachedTokens) {
					console.log(`   Cached tokens: ${usage.promptTokensDetails.cachedTokens} (saved cost!)`);
				}
			} else {
				console.log("\n⚠️  No usage metrics available");
			}
		},
	} as any); // Type assertion needed until AgentStreamOptions includes onFinish

	// Consume the text stream
	for await (const chunk of stream.textStream) {
		process.stdout.write(chunk);
	}

	console.log("\n");
}

main().catch(console.error);
