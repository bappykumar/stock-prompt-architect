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

    const isVertexKey = keyToUse.startsWith("AQ.");
    const restParts = (Array.isArray(contents) ? contents : []).map((item: any) => {
      if (item.inlineData) {
        return {
          inline_data: {
            mime_type: item.inlineData.mimeType,
            data: item.inlineData.data,
          },
        };
      }
      if (item.inline_data) {
        return { inline_data: item.inline_data };
      }
      return { text: item.text || "" };
    });

    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-1.5-flash",
    ];

    const standardEndpoint = (m: string) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(keyToUse)}`;
    const vertexEndpoint = (m: string) =>
      `https://aiplatform.googleapis.com/v1beta1/publishers/google/models/${m}:generateContent?key=${encodeURIComponent(keyToUse)}`;

    const endpoints = isVertexKey
      ? [vertexEndpoint, standardEndpoint]
      : [standardEndpoint, vertexEndpoint];

    let rawText = "";
    let success = false;
    let lastErrMsg = "Gemini analysis failed";
    let lastStatus = 500;

    for (const buildUrl of endpoints) {
      for (const m of candidateModels) {
        const generationConfig: Record<string, any> = {
          responseMimeType: "application/json",
        };
        if (m.includes("2.5-flash") || m === "gemini-flash-latest") {
          generationConfig.thinkingConfig = { thinkingBudget: 0 };
        }

        const response = await fetch(buildUrl(m), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: restParts }],
            generationConfig,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
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
          if (errLower.includes("api key not valid") || errLower.includes("api_key_invalid")) {
            break;
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
    res.status(500).json({ error: error?.message || "Gemini analysis failed" });
  }
}
