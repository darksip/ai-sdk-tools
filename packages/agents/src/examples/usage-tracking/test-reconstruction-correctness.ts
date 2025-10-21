/**
 * Test if our stream-based generate() reconstruction might have bugs
 * Specifically test:
 * 1. Multi-step tool calls
 * 2. Steps order preservation
 * 3. ToolCalls extraction
 */

import { join } from "node:path";
import { Agent } from "../../index.js";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

// Load environment variables
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
		console.warn("⚠️  .env file not found.");
	}
}

await loadEnv();

// Create tools that will trigger multi-step execution
const tools = {
	getCurrentWeather: {
		description: "Get the current weather for a location",
		parameters: z.object({
			location: z.string().describe("The city name"),
		}),
		execute: async ({ location }: { location: string }) => {
			return `The weather in ${location} is sunny, 22°C`;
		},
	},
	getTemperatureHistory: {
		description: "Get temperature history for a location",
		parameters: z.object({
			location: z.string().describe("The city name"),
			days: z.number().describe("Number of days"),
		}),
		execute: async ({ location, days }: { location: string; days: number }) => {
			return `Temperature history for ${location} over ${days} days: [20, 21, 22, 23, 22]`;
		},
	},
};

const agent = new Agent({
	name: "WeatherAgent",
	model: openrouter("anthropic/claude-3.5-sonnet", {
		usage: { include: true },
	}),
	instructions: "You are a weather assistant. You MUST use the available tools to get real weather data. Always call the tools.",
	tools,
});

console.log("Testing agent.generate() with tools (multi-step scenario)\n");

const result = await agent.generate({
	prompt: "What's the weather in Paris and show me the temperature history for the last 3 days?",
});

console.log("✅ Result received\n");
console.log("Text:", result.text);
console.log("\nSteps count:", result.steps?.length || 0);
console.log("ToolCalls count:", result.toolCalls?.length || 0);

if (result.steps && result.steps.length > 0) {
	console.log("\nSteps details:");
	for (let i = 0; i < result.steps.length; i++) {
		const step = result.steps[i];
		console.log(`\nStep ${i + 1}:`);
		console.log("  - Has toolCalls:", !!step.toolCalls && step.toolCalls.length > 0);
		console.log("  - Has toolResults:", !!step.toolResults && step.toolResults.length > 0);
		console.log("  - Has text:", !!step.text);

		if (step.toolCalls) {
			console.log("  - Tool calls:", step.toolCalls.map((tc: any) => tc.toolName));
		}
	}
}

if (result.toolCalls) {
	console.log("\nExtracted toolCalls:");
	for (const tc of result.toolCalls) {
		console.log(`  - ${tc.toolName} (${tc.toolCallId})`);
	}
}

console.log("\nProviderMetadata cost:", result.providerMetadata?.openrouter?.usage?.cost || 0);

console.log("\n✅ Test complete");
