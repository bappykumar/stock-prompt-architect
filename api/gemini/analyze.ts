import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { contents, apiKey } = body;
    const keyToUse = apiKey?.trim() || process.env.GEMINI_API_KEY;

    if (!keyToUse) {
      res.status(400).json({ error: "No Gemini API key provided. Please add your Gemini API key in Config." });
      return;
    }

    const client = new GoogleGenAI({ apiKey: keyToUse });
    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-flash-latest",
    ];

    let response: any = null;
    let lastErr: any = null;

    for (const m of candidateModels) {
      try {
        response = await client.models.generateContent({
          model: m,
          contents,
          config: {
            responseMimeType: "application/json",
          },
        });
        if (response) break;
      } catch (innerErr: any) {
        lastErr = innerErr;
        const msg = String(innerErr?.message || "").toLowerCase();
        if (
          msg.includes("not found") ||
          msg.includes("404") ||
          msg.includes("unavailable") ||
          msg.includes("503")
        ) {
          continue;
        }
        throw innerErr;
      }
    }

    if (!response && lastErr) throw lastErr;
    res.status(200).json({ text: response?.text || "" });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Gemini analysis failed" });
  }
}
