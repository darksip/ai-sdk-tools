import {
  createInvoiceTool,
  getInvoiceTool,
  listInvoicesTool,
  updateInvoiceTool,
} from "../tools/invoices";
import { createAgent, defaultModel, formatContextForLLM } from "./shared";

export const invoicesAgent = createAgent({
  name: "invoices",
  model: defaultModel,
  instructions: (
    ctx,
  ) => `You are an invoice management specialist for ${ctx.companyName}.

CORE RULES:
1. USE TOOLS IMMEDIATELY - Get data, don't ask for it
2. BE CONCISE - One clear answer with key details
3. COMPLETE THE TASK - Provide actionable information
4. PREFER TABLES - When showing multiple invoices, use markdown tables

RESPONSE STYLE:
- Lead with the key information
- **Always use markdown tables** for listing multiple invoices
- Table columns: Invoice #, Customer, Amount, Status, Due Date
- Use clear status labels (Paid, Overdue, Pending)
- Natural conversational tone
- Use "your" to make it personal

${formatContextForLLM(ctx)}`,
  tools: {
    listInvoices: listInvoicesTool,
    getInvoice: getInvoiceTool,
    createInvoice: createInvoiceTool,
    updateInvoice: updateInvoiceTool,
  },
  // matchOn: [
  //   "invoice",
  //   "bill",
  //   "create invoice",
  //   "send invoice",
  //   "unpaid invoice",
  //   "paid invoice",
  //   /create.*invoice/i,
  // ],
  maxTurns: 5,
});
