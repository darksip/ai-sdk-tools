/**
 * OpenRouter Cost Tracking Example
 *
 * Demonstrates real-time cost monitoring with OpenRouter's rich metadata.
 * Shows how to extract detailed cost information, model usage, and implement
 * budget alerts using global usage tracking.
 *
 * Note: This example requires @openrouter/ai-sdk-provider:
 * npm install @openrouter/ai-sdk-provider
 */

import { join } from "node:path";
import {
  Agent,
  configureUsageTracking,
  extractOpenRouterUsage,
  formatCost,
  formatTokens,
  summarizeUsage,
} from "../../index.js";
import { openrouter } from "@openrouter/ai-sdk-provider";

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

// Budget tracking state
let totalCost = 0;
const DAILY_BUDGET = 10.0; // $10 daily budget
const WARNING_THRESHOLD = 0.8; // Alert at 80%

// Cost breakdown by model
const modelCosts = new Map<string, number>();

// Configure OpenRouter usage tracking with detailed cost extraction
configureUsageTracking({
  onUsage: async (event) => {
    // Extract OpenRouter-specific usage data
    const openRouterUsage = extractOpenRouterUsage({
      providerMetadata: event.providerMetadata,
    });

    if (!openRouterUsage) {
      console.log("⚠️  No OpenRouter metadata found");
      return;
    }

    // Update total cost
    totalCost += openRouterUsage.cost;

    // Track cost by agent (since model name is not in OpenRouterUsage)
    const currentAgentCost = modelCosts.get(event.agentName) || 0;
    modelCosts.set(event.agentName, currentAgentCost + openRouterUsage.cost);

    // Display detailed usage information
    console.log("\n" + "=".repeat(60));
    console.log("📊 OPENROUTER USAGE TRACKING");
    console.log("=".repeat(60));

    console.log(`\n🤖 Agent: ${event.agentName}`);
    console.log(`📋 Method: ${event.method}`);

    console.log(`\n💰 Cost Breakdown:`);
    console.log(`   Current Request: ${formatCost(openRouterUsage.cost)}`);
    console.log(`   Session Total: ${formatCost(totalCost)}`);
    console.log(`   Budget Used: ${((totalCost / DAILY_BUDGET) * 100).toFixed(1)}%`);
    console.log(`   Remaining: ${formatCost(DAILY_BUDGET - totalCost)}`);

    console.log(`\n📈 Tokens:`);
    console.log(`   Total: ${formatTokens(openRouterUsage.totalTokens)}`);
    console.log(`   Prompt: ${formatTokens(openRouterUsage.promptTokens)}`);
    console.log(`   Completion: ${formatTokens(openRouterUsage.completionTokens)}`);

    // Show cache usage if available
    const cachedTokens = openRouterUsage.promptTokensDetails?.cachedTokens;
    if (cachedTokens && cachedTokens > 0) {
      console.log(`   💾 Cached: ${formatTokens(cachedTokens)} (saved cost!)`);
    }

    // Show reasoning tokens if available (for o1 models)
    const reasoningTokens = openRouterUsage.completionTokensDetails?.reasoningTokens;
    if (reasoningTokens && reasoningTokens > 0) {
      console.log(`   🧠 Reasoning: ${formatTokens(reasoningTokens)}`);
    }

    // Human-readable summary
    console.log(`\n📝 Summary: ${summarizeUsage(openRouterUsage)}`);

    // Budget warnings
    if (totalCost >= DAILY_BUDGET) {
      console.log("\n🚨 BUDGET EXCEEDED! Daily limit reached.");
      console.log("   Consider stopping operations or increasing budget.");
    } else if (totalCost >= DAILY_BUDGET * WARNING_THRESHOLD) {
      console.log(`\n⚠️  WARNING: ${((totalCost / DAILY_BUDGET) * 100).toFixed(0)}% of daily budget used!`);
    }

    console.log("=".repeat(60) + "\n");
  },

  onError: (error, event) => {
    console.error("❌ Tracking error:", error.message);
  },
});

// Create agents with different OpenRouter models
// IMPORTANT: usage: { include: true } is REQUIRED for cost tracking with OpenRouter
const fastAgent = new Agent({
  name: "FastAgent",
  model: openrouter("google/gemini-2.5-flash", {
    usage: { include: true },  // Required for cost tracking
  }),
  instructions: "You are a quick assistant. Give brief, concise answers.",
});

const smartAgent = new Agent({
  name: "SmartAgent",
  model: openrouter("anthropic/claude-3.5-sonnet", {
    usage: { include: true },  // Required for cost tracking
  }),
  instructions: "You are an intelligent assistant. Provide detailed, thoughtful answers.",
});

const reasoningAgent = new Agent({
  name: "ReasoningAgent",
  model: openrouter("openai/o1-mini", {
    usage: { include: true },  // Required for cost tracking
  }),
  instructions: "You are a reasoning assistant. Think through problems step by step.",
});

async function demonstrateUsageTracking() {
  console.log("\n🚀 OpenRouter Cost Tracking Demo\n");
  console.log(`Daily Budget: ${formatCost(DAILY_BUDGET)}`);
  console.log(`Warning Threshold: ${(WARNING_THRESHOLD * 100).toFixed(0)}%`);
  console.log("\n⚠️  Note: Costs may show $0 if you have OpenRouter credits or are in test mode.\n");

  // Example 1: Fast, cheap query
  console.log("Example 1: Using fast, cheap model (GPT-3.5)");
  await fastAgent.generate({
    prompt: "What is 2+2?",
  });

  // Example 2: Smart, more expensive query
  console.log("\nExample 2: Using smart, expensive model (GPT-4)");
  await smartAgent.generate({
    prompt: "Explain the theory of relativity in simple terms.",
  });

  // Example 3: Reasoning model
  console.log("\nExample 3: Using reasoning model (O1-mini)");
  await reasoningAgent.generate({
    prompt: "What is the best way to optimize database queries?",
  });

  // Display final summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 FINAL COST SUMMARY");
  console.log("=".repeat(60));
  console.log(`\n💰 Total Session Cost: ${formatCost(totalCost)}`);
  console.log(`📊 Budget Usage: ${((totalCost / DAILY_BUDGET) * 100).toFixed(2)}%`);
  console.log(`💵 Remaining Budget: ${formatCost(DAILY_BUDGET - totalCost)}`);

  console.log(`\n🎯 Cost by Agent:`);
  for (const [agentName, cost] of modelCosts.entries()) {
    const percentage = (cost / totalCost) * 100;
    console.log(`   ${agentName}: ${formatCost(cost)} (${percentage.toFixed(1)}%)`);
  }

  console.log("\n✅ Demo complete! All costs tracked automatically.");
  console.log("=".repeat(60) + "\n");
}

// Run the demo
demonstrateUsageTracking().catch(console.error);
