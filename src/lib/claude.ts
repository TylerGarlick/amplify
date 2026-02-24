import Anthropic from "@anthropic-ai/sdk";

// Singleton Anthropic client — reused across all API route invocations
export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
