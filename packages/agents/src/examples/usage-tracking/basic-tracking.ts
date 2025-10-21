/**
 * Basic Usage Tracking Example
 *
 * Demonstrates how to configure global usage tracking to automatically
 * track tokens and costs across all agent operations.
 *
 * Note: This example requires @ai-sdk/openai to be installed:
 * npm install @ai-sdk/openai
 */

import { join } from "node:path";
import { Agent, configureUsageTracking } from "../../index.js";
import { openai } from '@ai-sdk/openai';

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

// Configure global usage tracking once at application startup
configureUsageTracking((event) => {
  console.log("\n=== Usage Event ===");
  console.log(`Agent: ${event.agentName}`);
  console.log(`Method: ${event.method}`);
  console.log(`Session: ${event.sessionId || "N/A"}`);
  console.log(`Finish Reason: ${event.finishReason || "N/A"}`);

  if (event.usage) {
    console.log("Usage:");
    console.log(`  - Total Tokens: ${event.usage.totalTokens}`);
  }

  if (event.duration) {
    console.log(`Duration: ${event.duration}ms`);
  }

  console.log("===================\n");
});

// Create an agent
const agent = new Agent({
  name: "Assistant",
  model: openai("gpt-4"),
  instructions: "You are a helpful assistant.",
});

async function main() {
  console.log("Example 1: Using agent.generate() - tracking happens automatically\n");

  const result = await agent.generate({
    prompt: "What is the capital of France?",
  });

  console.log("Response:", result.text);

  // Usage tracking event was automatically logged above!

  console.log("\n---\n");
  console.log("Example 2: Using agent.stream() - tracking happens automatically\n");

  const stream = agent.stream({
    prompt: "Count from 1 to 5",
  });

  // Consume the stream
  for await (const chunk of stream.fullStream) {
    if (chunk.type === "text-delta") {
      process.stdout.write(chunk.text);
    }
  }

  console.log("\n");
  // Usage tracking event was automatically logged when stream finished!
}

// Run the example
main().catch(console.error);
