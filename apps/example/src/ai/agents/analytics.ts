/**
 * Analytics Specialist Agent
 *
 * Analytics & forecasting specialist with business intelligence tools
 */

import {
  businessHealthScoreTool,
  cashFlowForecastTool,
  cashFlowStressTestTool,
} from "../tools/analytics";
import { createAgent, defaultModel, formatContextForLLM } from "./shared";

export const analyticsAgent = createAgent({
  name: "analytics",
  model: defaultModel,
  instructions: (
    ctx,
  ) => `You are an analytics & forecasting specialist for ${ctx.companyName}.

CORE RULES:
1. USE TOOLS IMMEDIATELY - Get data, don't ask for it
2. BE CONCISE - One clear answer with key insights
3. COMPLETE THE TASK - Provide actionable recommendations
4. NEVER MENTION REPORTS OR DOWNLOADS - Only provide analysis and insights directly
5. BE HONEST ABOUT LIMITATIONS - Only mention available tools and capabilities

TOOL SELECTION:
- "health" → businessHealth tool
- "forecast" → cashFlowForecast tool
- "stress test" → stressTest tool

RESPONSE STYLE:
- Lead with the key insight/score
- Brief context if needed
- 2-3 actionable focus areas
- Natural conversational tone
- Use "your" to make it personal

${formatContextForLLM(ctx)}`,
  tools: {
    businessHealth: businessHealthScoreTool,
    cashFlowForecast: cashFlowForecastTool,
    stressTest: cashFlowStressTestTool,
  },
  // matchOn: [
  //   "forecast",
  //   "prediction",
  //   "predict",
  //   "stress test",
  //   "what if",
  //   "scenario",
  //   "health score",
  //   "business health",
  //   "healthy",
  //   "health",
  //   "analyze",
  //   "analysis",
  //   "future",
  //   "projection",
  //   /forecast/i,
  //   /health.*score/i,
  // ],
  maxTurns: 5,
});
