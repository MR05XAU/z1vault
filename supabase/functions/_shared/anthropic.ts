// LLM client for the AI features (coach report, auto-tag, NL filter).
// Deliberately not routed through Lovable's AI Gateway so these work fully
// self-hosted. Provider fallback: ANTHROPIC_API_KEY if set, otherwise
// NVIDIA_API_KEY via NVIDIA's OpenAI-compatible endpoint.
export async function callClaude(system: string, userMessage: string, maxTokens = 1024): Promise<string> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (anthropicKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
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
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return data?.content?.find((c: { type: string }) => c.type === "text")?.text ?? "";
  }

  const nvidiaKey = Deno.env.get("NVIDIA_API_KEY");
  if (!nvidiaKey) throw new Error("No LLM key configured (ANTHROPIC_API_KEY or NVIDIA_API_KEY)");
  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${nvidiaKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "meta/llama-3.3-70b-instruct",
      max_tokens: maxTokens,
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    }),
  });
  if (!res.ok) throw new Error(`NVIDIA API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}
