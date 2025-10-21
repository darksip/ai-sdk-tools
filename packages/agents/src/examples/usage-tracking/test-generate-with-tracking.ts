/**
 * Test if agent.generate() now captures costs with global tracking
 */

import { join } from "node:path";
import {
  Agent,
  configureUsageTracking,
  extractOpenRouterUsage,
  formatCost,
} from "../../index.js";
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

// Configure global tracking
configureUsageTracking({
  onUsage: async (event) => {
    console.log("\n📊 Global Tracker Called!");
    console.log("Agent:", event.agentName);
    console.log("Method:", event.method);

    const usage = extractOpenRouterUsage({
      providerMetadata: event.providerMetadata,
    });

    if (usage) {
      console.log("✅ Cost:", formatCost(usage.cost));
      console.log("   Tokens:", usage.totalTokens);
    } else {
      console.log("❌ No OpenRouter usage found");
    }
  },
});

const agent = new Agent({
  name: "TestAgent",
  model: openrouter("anthropic/claude-3.5-haiku"),
  instructions: "You are helpful.",
});

console.log("Testing agent.generate() with global tracking:\n");

const result = await agent.generate({
  prompt: "Say hello in one word",
});

console.log("\nResponse:", result.text);
console.log("\n✅ Test complete");
