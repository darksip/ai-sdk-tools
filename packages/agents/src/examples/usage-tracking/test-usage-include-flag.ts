/**
 * Test if setting usage: { include: true } on the model fixes generateText() cost retrieval
 */

import { join } from "node:path";
import { generateText } from "ai";
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

console.log("Test 1: generateText() WITHOUT usage: { include: true }\n");

const modelWithoutFlag = openrouter("anthropic/claude-3.5-haiku");

const result1 = await generateText({
	model: modelWithoutFlag,
	prompt: "Say hello in one word",
});

console.log("providerMetadata:", JSON.stringify(result1.providerMetadata, null, 2));

console.log("\n---\n");
console.log("Test 2: generateText() WITH usage: { include: true }\n");

const modelWithFlag = openrouter("anthropic/claude-3.5-haiku", {
	usage: {
		include: true,
	},
});

const result2 = await generateText({
	model: modelWithFlag,
	prompt: "Say hello in one word",
});

console.log("providerMetadata:", JSON.stringify(result2.providerMetadata, null, 2));

console.log("\n✅ Test complete");
console.log("\nConclusion:");
console.log("- Without flag: cost =", result1.providerMetadata?.openrouter?.usage?.cost);
console.log("- With flag: cost =", result2.providerMetadata?.openrouter?.usage?.cost);
