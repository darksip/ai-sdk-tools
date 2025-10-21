/**
 * Test with usage: true in provider options
 */

import { join } from "node:path";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

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
  console.log("🧪 Testing with usage: true in provider metadata...\n");

  const result = await generateText({
    model: openrouter("anthropic/claude-3.5-sonnet"),
    prompt: "Say hello in 3 words",
    headers: {
      "X-Track-Usage": "true",
    } as any,
  });

  console.log("🔍 Full providerMetadata:");
  console.log(JSON.stringify(result.providerMetadata, null, 2));

  console.log("\n✅ Response:", result.text);
}

main().catch(console.error);
