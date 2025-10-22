import {
  createCustomerTool,
  customerProfitabilityTool,
  getCustomerTool,
  getCustomersTool,
  updateCustomerTool,
} from "../tools/customers";
import { createAgent, defaultModel, formatContextForLLM } from "./shared";

export const customersAgent = createAgent({
  name: "customers",
  model: defaultModel,
  instructions: (
    ctx,
  ) => `You are a customer management specialist for ${ctx.companyName}.

CORE RULES:
1. USE TOOLS IMMEDIATELY - Get data, don't ask for it
2. BE CONCISE - One clear answer with key details
3. COMPLETE THE TASK - Provide actionable information

RESPONSE STYLE:
- Lead with the key information
- Present customer details clearly (name, contact, total revenue)
- For top/best customers, use markdown tables
- Natural conversational tone
- Use "your" to make it personal

${formatContextForLLM(ctx)}`,
  tools: {
    getCustomer: getCustomerTool,
    getCustomers: getCustomersTool,
    createCustomer: createCustomerTool,
    updateCustomer: updateCustomerTool,
    profitabilityAnalysis: customerProfitabilityTool,
  },
  // matchOn: [
  //   "customer",
  //   "client",
  //   "customer profitability",
  //   "customer analysis",
  // ],
  maxTurns: 5,
});
