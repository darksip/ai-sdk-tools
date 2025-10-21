/**
 * Test if OpenAI has the same cost issue with generateText()
 * (to see if our workaround is needed for other providers)
 */

import { join } from "node:path";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

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

console.log("Testing OpenAI with generateText()\n");

const model = openai("gpt-3.5-turbo");

const result = await generateText({
	model,
	prompt: "Say hello in one word",
});

console.log("providerMetadata:", JSON.stringify(result.providerMetadata, null, 2));
console.log("\nusage:", JSON.stringify(result.usage, null, 2));

console.log("\n✅ Test complete");
console.log("\nOpenAI provides cost in providerMetadata:", !!result.providerMetadata);
