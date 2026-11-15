export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const customKey = body.apiKey?.trim();
    const keyToTest = customKey || process.env.GEMINI_API_KEY;

    if (!keyToTest) {
      res.status(400).json({ error: "No Gemini API key configured." });
      return;
    }

    // 1. Standard Gemini Developer API check
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(keyToTest)}`
    );
    if (response.ok) {
      res.status(200).json({ ok: true });
      return;
    }

    const firstErrText = await response.text();

    // 2. Fallback: Vertex AI Express Mode check (for AQ.Ab8RN... Google Cloud / Vertex keys)
    const vertexModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    for (const vm of vertexModels) {
      const vertexRes = await fetch(
        `https://aiplatform.googleapis.com/v1beta1/publishers/google/models/${vm}:countTokens?key=${encodeURIComponent(keyToTest)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "ping" }] }],
          }),
        }
      );
      if (vertexRes.ok) {
        res.status(200).json({ ok: true });
        return;
      }
    }

    let parsedMsg = firstErrText;
    try {
      const parsed = JSON.parse(firstErrText);
      parsedMsg = parsed.error?.message || firstErrText;
    } catch {}
    res.status(response.status).json({ error: parsedMsg });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Gemini API verification failed" });
  }
}
