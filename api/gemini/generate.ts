export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { model, systemPrompt, apiKey } = body;
    const keyToUse = apiKey?.trim() || process.env.GEMINI_API_KEY;

    if (!keyToUse) {
      res.status(400).json({ error: "No Gemini API key provided. Please add your Gemini API key in Config." });
      return;
    }

    const normalizedModel = model === "gemini-3.8-flash" ? "gemini-2.5-flash" : model;
    const candidateModels = Array.from(
      new Set(
        [
          normalizedModel,
          "gemini-2.5-flash",
          "gemini-2.0-flash",
          "gemini-flash-latest",
          "gemini-1.5-flash",
        ].filter(Boolean)
      )
    );

    const endpoints = [
      (m: string) =>
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(keyToUse)}`,
      (m: string) =>
        `https://aiplatform.googleapis.com/v1beta1/publishers/google/models/${m}:generateContent?key=${encodeURIComponent(keyToUse)}`,
    ];

    let rawText = "";
    let success = false;
    let lastErrMsg = "Gemini generation failed";
    let lastStatus = 500;

    for (const buildUrl of endpoints) {
      for (const m of candidateModels) {
        const response = await fetch(buildUrl(m), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.95,
              topP: 0.95,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{"prompts":[]}';
          success = true;
          break;
        } else {
          lastStatus = response.status;
          const errText = await response.text();
          try {
            const parsed = JSON.parse(errText);
            lastErrMsg = parsed.error?.message || errText;
          } catch {
            lastErrMsg = errText;
          }
          if (
            response.status === 404 ||
            response.status === 400 ||
            response.status === 401 ||
            response.status === 403 ||
            response.status === 503
          ) {
            continue;
          }
          break;
        }
      }
      if (success) break;
    }

    if (!success) {
      res.status(lastStatus).json({ error: lastErrMsg });
      return;
    }

    res.status(200).json({ text: rawText });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Gemini generation failed" });
  }
}
