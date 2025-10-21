/**
 * Test to verify if OpenRouter costs are available in generateText() vs streamText()
 */

import { join } from "node:path";
import { generateText, streamText } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";

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

const model = openrouter("anthropic/claude-3.5-haiku");

console.log("Test 1: generateText() - checking providerMetadata\n");

const result1 = await generateText({
	model,
	prompt: "Say 'hello' in one word",
});

console.log("Result from generateText:");
console.log(JSON.stringify(result1.providerMetadata, null, 2));
console.log("\n---\n");

console.log("Test 2: streamText() with onFinish - checking providerMetadata\n");

const result2 = streamText({
	model,
	prompt: "Say 'hello' in one word",
	onFinish: (event) => {
		console.log("Result from streamText onFinish:");
		console.log(JSON.stringify(event.providerMetadata, null, 2));
	},
});

// Consume the stream
for await (const chunk of result2.textStream) {
	// Just consume it
}

console.log("\n✅ Test complete");
