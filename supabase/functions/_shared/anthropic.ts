import { llmChat } from "./llm.ts";

// Back-compat shim: the coach-report / tag-suggest / NL-filter functions call
// callClaude(). It now routes through the failover LLM router (llm.ts), so a
// busy primary model transparently falls back to a backup.
export async function callClaude(system: string, userMessage: string, maxTokens = 1024): Promise<string> {
  return llmChat(
    [
      { role: "system", content: system },
      { role: "user", content: userMessage },
    ],
    { maxTokens },
  );
}
