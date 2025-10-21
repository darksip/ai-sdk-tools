/**
 * Test with usage as an object instead of boolean
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
  console.log("🧪 Testing with usage as object...\n");

  try {
    const result = await generateText({
      model: openrouter("anthropic/claude-3.5-sonnet"),
      prompt: "Say hello in 3 words",
      providerOptions: {
        openrouter: {
          usage: {
            track: true,
          },
        } as any,
      },
    });

    console.log("🔍 Full providerMetadata:");
    console.log(JSON.stringify(result.providerMetadata, null, 2));
    console.log("\n✅ Response:", result.text);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.log("\n📋 Request body that was sent:");
    console.log(JSON.stringify(error.requestBodyValues, null, 2));
  }
}

main().catch(console.error);
