const DEPRECATED_MODELS = new Set([
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-pro",
  "gemini-2.0-flash",
  "gemini-2.0-pro",
  "gemini-2.0-flash-thinking",
  "gemini-3.8-flash",
]);

function isKeyAuthFailure(msgLower: string, status: number): boolean {
  return (
    status === 401 ||
    status === 403 ||
    msgLower.includes("api key not valid") ||
    msgLower.includes("api_key_invalid") ||
    msgLower.includes("unauthenticated") ||
    msgLower.includes("permission_denied") ||
    msgLower.includes("ip_referer_blocked") ||
    msgLower.includes("referer")
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { model, systemPrompt, apiKey } = body;
    const customKey = apiKey?.trim();
    const keyToUse = customKey || process.env.GEMINI_API_KEY?.trim();

    if (!keyToUse) {
      res.status(400).json({ error: "No Gemini API key provided. Please add your Gemini API key in Config." });
      return;
    }

    const isVertexKey = keyToUse.startsWith("AQ.");
    const rawModel = typeof model === "string" ? model.trim() : "";
    const normalizedModel = !rawModel || DEPRECATED_MODELS.has(rawModel) ? "gemini-2.5-flash" : rawModel;

    const candidateModels = Array.from(
      new Set(
        (customKey
          ? [normalizedModel, "gemini-2.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-4-hydrogen"]
          : [normalizedModel, "gemini-4-hydrogen", "gemini-2.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"]
        ).filter(Boolean)
      )
    );

    const standardEndpoint = (m: string) => ({
      isVertex: false,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(keyToUse)}`,
    });
    const vertexEndpoint = (m: string) => ({
      isVertex: true,
      url: `https://aiplatform.googleapis.com/v1beta1/publishers/google/models/${m}:generateContent?key=${encodeURIComponent(keyToUse)}`,
    });

    const endpoints = isVertexKey
      ? [vertexEndpoint, standardEndpoint]
      : [standardEndpoint, vertexEndpoint];

    let rawText = "";
    let usedModel = "";
    let success = false;
    let lastErrMsg = "Gemini generation failed";
    let lastStatus = 500;

    for (const buildEndpoint of endpoints) {
      let rateLimited = false;
      for (const m of candidateModels) {
        const ep = buildEndpoint(m);
        if (ep.isVertex && m.startsWith("gemini-4-")) continue;

        const isGemini4 = m.startsWith("gemini-4-");
        const generationConfig: Record<string, any> = {
          responseMimeType: "application/json",
        };
        if (!isGemini4) {
          generationConfig.temperature = 0.78;
          generationConfig.topP = 0.92;
        }
        if (m.includes("2.5-flash") || m === "gemini-flash-latest") {
          generationConfig.thinkingConfig = { thinkingBudget: 0 };
        }

        const response = await fetch(ep.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
            generationConfig,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{"prompts":[]}';
          usedModel = m;
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
          const errLower = lastErrMsg.toLowerCase();
          if (response.status === 429 || errLower.includes("resource_exhausted") || errLower.includes("quota")) {
            rateLimited = true;
            break;
          }
          if (isKeyAuthFailure(errLower, response.status)) {
            break;
          }
          if (response.status === 404 || response.status === 400 || response.status === 503) {
            continue;
          }
          break;
        }
      }
      if (success || rateLimited) break;
    }

    if (!success) {
      res.status(lastStatus).json({ error: lastErrMsg });
      return;
    }

    res.status(200).json({ text: rawText, model: usedModel });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Gemini generation failed" });
  }
}
