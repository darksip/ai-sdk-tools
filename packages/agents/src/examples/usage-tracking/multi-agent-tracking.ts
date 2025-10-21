/**
 * Multi-Agent Handoff Tracking Example with OpenRouter
 *
 * Demonstrates how global usage tracking automatically tracks each agent
 * in a multi-agent handoff workflow, including the handoff chain context
 * and OpenRouter cost attribution.
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

// Track total cost across all agents
let totalCost = 0;
const agentCosts = new Map<string, number>();

// Configure global usage tracking to show handoff chains and costs
configureUsageTracking((event) => {
  console.log("\n" + "=".repeat(50));
  console.log("📊 USAGE EVENT");
  console.log("=".repeat(50));

  console.log(`\n🤖 Agent: ${event.agentName}`);

  // Show handoff chain if present
  if (event.handoffChain && event.handoffChain.length > 0) {
    const fullChain = [...event.handoffChain, event.agentName].join(" → ");
    console.log(`🔄 Handoff Chain: ${fullChain}`);
  } else {
    console.log("🔄 Handoff Chain: N/A (initial agent)");
  }

  console.log(`📋 Method: ${event.method}`);

  // Extract OpenRouter cost data
  const openRouterUsage = extractOpenRouterUsage({
    providerMetadata: event.providerMetadata,
  });

  if (event.usage) {
    console.log(`\n📈 Tokens: ${formatTokens(event.usage.totalTokens)}`);
  }

  if (openRouterUsage) {
    console.log(`💰 Cost: ${formatCost(openRouterUsage.cost)}`);

    // Update totals
    totalCost += openRouterUsage.cost;
    const currentAgentCost = agentCosts.get(event.agentName) || 0;
    agentCosts.set(event.agentName, currentAgentCost + openRouterUsage.cost);

    console.log(`\n💵 Session Total: ${formatCost(totalCost)}`);
  }

  console.log("=".repeat(50) + "\n");
});

// Create a triage agent that routes to specialists
// IMPORTANT: usage: { include: true } is REQUIRED for cost tracking with OpenRouter
const triageAgent = new Agent({
  name: "Triage",
  model: openrouter("openai/gpt-3.5-turbo", {
    usage: { include: true },  // Required for cost tracking
  }),
  instructions: "You are a triage agent. Route technical questions to TechnicalSupport and billing questions to Billing.",
  handoffs: [], // Will add specialists below
});

// Create specialist agents with different models
const technicalSupportAgent = new Agent({
  name: "TechnicalSupport",
  model: openrouter("openai/gpt-4-turbo", {
    usage: { include: true },  // Required for cost tracking
  }),
  instructions: "You are a technical support specialist. Answer technical questions clearly and concisely.",
});

const billingAgent = new Agent({
  name: "Billing",
  model: openrouter("openai/gpt-3.5-turbo", {
    usage: { include: true },  // Required for cost tracking
  }),
  instructions: "You are a billing specialist. Help with payment and subscription questions.",
});

// Configure handoffs
(triageAgent as any).handoffAgents = [technicalSupportAgent, billingAgent];

async function main() {
  console.log("\n🚀 Multi-Agent Workflow with Cost Tracking");
  console.log("=".repeat(50));
  console.log("The triage agent will route to specialists.");
  console.log("Each agent's usage and cost will be tracked separately.\n");

  // Example 1: Technical question (routes to TechnicalSupport)
  console.log("📝 Example 1: Technical Question\n");

  const result1 = await triageAgent.generate({
    prompt: "How do I reset my password?",
  });

  console.log("✅ Final Response:", result1.finalOutput);

  // Example 2: Billing question (routes to Billing)
  console.log("\n\n📝 Example 2: Billing Question\n");

  const result2 = await triageAgent.generate({
    prompt: "What payment methods do you accept?",
  });

  console.log("✅ Final Response:", result2.finalOutput);

  // Display final cost summary
  console.log("\n\n" + "=".repeat(50));
  console.log("📊 FINAL COST SUMMARY");
  console.log("=".repeat(50));

  console.log(`\n💰 Total Workflow Cost: ${formatCost(totalCost)}`);

  console.log("\n💵 Cost by Agent:");
  for (const [agentName, cost] of agentCosts.entries()) {
    const percentage = totalCost > 0 ? (cost / totalCost) * 100 : 0;
    console.log(`   ${agentName}: ${formatCost(cost)} (${percentage.toFixed(1)}%)`);
  }

  console.log("\n✅ Multi-agent workflow complete!");
  console.log("   Each agent tracked separately with full handoff chain context.");
  console.log("   Costs attributed to each agent for accurate billing.\n");
}

// Run the example
main().catch(console.error);
