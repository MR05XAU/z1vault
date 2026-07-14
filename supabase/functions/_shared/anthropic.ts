// Direct Anthropic API client — deliberately not routed through Lovable's
// AI Gateway (LOVABLE_API_KEY), so these features work independent of the
// Lovable platform. Requires the ANTHROPIC_API_KEY secret to be set.
export async function callClaude(system: string, userMessage: string, maxTokens = 1024): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const block = data?.content?.find((c: { type: string }) => c.type === "text");
  return block?.text ?? "";
}
