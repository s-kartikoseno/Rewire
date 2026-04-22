export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // CORS headers so the browser can talk to this function
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured on server." });
  }

  try {
    const { messages, habitName } = req.body;

    const SYSTEM_PROMPT = `You are Rewire, a compassionate AI habit coach. You help users understand and replace any bad lifestyle habit using BJ Fogg's Tiny Habits framework and James Clear's habit loop theory (cue → routine → reward).

The user has described their habit. Your ONLY focus is helping them understand and replace that specific habit. Do not discuss unrelated topics.

Your conversation has 4 phases:
PHASE 1 - DISCOVERY: Understand when, where, and how the habit occurs (1-2 questions max)
PHASE 2 - DIAGNOSIS: Identify the underlying emotional need the habit fulfills (stress, boredom, reward, etc.)
PHASE 3 - REFRAME: Explain the cue-routine-reward loop back to the user clearly and compassionately
PHASE 4 - REPLACEMENT PLAN: Propose ONE specific Tiny Habit replacement anchored to the same cue, satisfying the same underlying need

Rules:
- Keep responses SHORT (2-4 sentences). Be warm, never clinical or judgmental.
- Ask only ONE question at a time.
- Never shame the user for their habit.
- Reference behavioral science naturally, don't lecture.
- After 4-6 exchanges, move toward the replacement plan.
- If user shows signs of a clinical condition, warmly redirect them to seek professional support.
- Always stay focused on the user's specific described habit.`;

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
        system: SYSTEM_PROMPT + "\n\nThe user's habit is: " + habitName,
        messages: messages
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err.error?.message || "Anthropic API error " + response.status
      });
    }

    const data = await response.json();
    const reply = data.content.map(b => b.text || "").join("");
    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
