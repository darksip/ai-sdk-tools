/**
 * Database Persistence Example
 *
 * Demonstrates how to persist usage metrics to a database using
 * global usage tracking with OpenRouter cost extraction.
 */

import { join } from "node:path";
import { Agent, configureUsageTracking, extractOpenRouterUsage } from "../../index.js";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

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

// Simulated database interface (replace with your actual DB)
interface UsageRecord {
  id?: string;
  agentName: string;
  sessionId?: string;
  tokens: number;
  cost: number;
  timestamp: Date;
  method: "generate" | "stream";
  finishReason?: string;
}

// Simulated database (replace with real Postgres, MySQL, etc.)
const db = {
  usage: {
    async create(data: UsageRecord) {
      console.log("📝 Saving to database:", data);
      // In production, this would be:
      // await prisma.usage.create({ data })
      // await db.query('INSERT INTO usage ...')
      // await UsageModel.create(data)
    },
  },
};

// Configure global usage tracking with database persistence
configureUsageTracking({
  onUsage: async (event) => {
    // Extract OpenRouter-specific usage data
    const openRouterUsage = extractOpenRouterUsage({
      providerMetadata: event.providerMetadata,
    });

    // Prepare usage record
    const record: UsageRecord = {
      agentName: event.agentName,
      sessionId: event.sessionId,
      tokens: event.usage?.totalTokens || 0,
      cost: openRouterUsage?.cost || 0,
      timestamp: new Date(),
      method: event.method,
      finishReason: event.finishReason,
    };

    // Persist to database (async, non-blocking)
    await db.usage.create(record);
  },

  // Optional: handle tracking errors
  onError: (error, event) => {
    console.error("❌ Failed to track usage:", error);
    console.error("Event that failed:", event);
    // Could log to error tracking service (Sentry, etc.)
  },
});

// Create an agent
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "your-api-key",
});

const agent = new Agent({
  name: "Assistant",
  model: openrouter("openai/gpt-4-turbo"),
  instructions: "You are a helpful assistant.",
});

async function main() {
  console.log("Usage tracking is configured to persist to database\n");

  // Example with session context (passed via execution context)
  const result = await agent.generate({
    prompt: "Explain quantum computing in one sentence.",
  });

  console.log("\nResponse:", result.text);
  console.log("\n✅ Usage automatically saved to database with session context!");
}

// Run the example
main().catch(console.error);
