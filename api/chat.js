export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  res.setHeader("Access-Control-Allow-Origin", "*");
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured on server." });
  }
  try {
    const { messages, habitName, systemPrompt } = req.body;
    const FALLBACK = `You are Rewire, a warm AI habit coach. Help the user understand and replace their habit using BJ Fogg's Tiny Habits. Keep responses to 3 sentences max, use 1-2 emojis, bold key insights with **asterisks**.`;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: (systemPrompt || FALLBACK) + "\n\nThe user's habit is: " + habitName,
        messages: messages
      })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error?.message || "API error " + response.status });
    }
    const data = await response.json();
    const reply = data.content.map(b => b.text || "").join("");
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
