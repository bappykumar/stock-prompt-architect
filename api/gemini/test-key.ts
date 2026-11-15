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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(keyToTest)}`
    );

    if (!response.ok) {
      const errText = await response.text();
      let parsedMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        parsedMsg = parsed.error?.message || errText;
      } catch {}
      res.status(response.status).json({ error: parsedMsg });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Gemini API verification failed" });
  }
}
