// Vynora V1.5 — Secure AI API
// Vercel Serverless Function

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // OPTIONS / CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Health check
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "vynora-ai"
    });
  }

  // Only POST allowed for AI generation
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured."
      });
    }

    const body = req.body || {};

    const action = body.action || "generate";
    const prompt = body.prompt || "";

    if (!prompt.trim()) {
      return res.status(400).json({
        error: "Prompt is required."
      });
    }

    const model =
      process.env.GEMINI_MODEL || "gemini-2.5-flash";

    let finalPrompt = prompt;

    if (action === "modify") {
      finalPrompt = `
You are Vynora, a premium AI content assistant.

Improve the following existing content according to the requested action.

Action:
${body.modifier || "improve"}

Existing content:
${prompt}

Rules:
- Keep the original meaning.
- Make the result useful and specific.
- Avoid unnecessary filler.
- Return only the improved content.
`;
    } else {
      finalPrompt = `
You are Vynora, a premium AI content creation assistant.

Create high-quality, practical content based on the user's request.

Rules:
- Be specific and useful.
- Match the requested platform, niche, topic and style.
- Avoid generic filler.
- Keep the output well structured.
- Do not invent facts when factual accuracy matters.
- Return clean text suitable for direct use.

User request:
${prompt}
`;
    }

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: finalPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.8,
          topP: 0.95,
          maxOutputTokens: 4096
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API request failed."
      });
    }

    const result =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!result) {
      return res.status(502).json({
        error: "Gemini returned an empty response."
      });
    }

    return res.status(200).json({
      result
    });

  } catch (error) {
    console.error("Vynora API error:", error);

    return res.status(500).json({
      error: "Internal server error."
    });
  }
        }
