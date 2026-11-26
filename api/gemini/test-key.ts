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
    const customKey = body.apiKey?.trim();
    const keyToTest = customKey || process.env.GEMINI_API_KEY?.trim();

    if (!keyToTest) {
      res.status(400).json({ error: "No Gemini API key configured." });
      return;
    }

    const tryStandard = async () => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(keyToTest)}`
      );
      if (response.ok) return { ok: true as const, status: 200, error: "" };
      const errText = await response.text();
      let parsedMsg = errText;
      try {
        parsedMsg = JSON.parse(errText).error?.message || errText;
      } catch {}
      return { ok: false as const, status: response.status, error: parsedMsg };
    };

    const tryVertexExpress = async () => {
      const vertexModels = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
      let lastStatus = 400;
      let lastMsg = "Vertex AI Express verification failed";
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
        if (vertexRes.ok) return { ok: true as const, status: 200, error: "" };
        lastStatus = vertexRes.status;
        const errText = await vertexRes.text();
        try {
          lastMsg = JSON.parse(errText).error?.message || errText;
        } catch {
          lastMsg = errText;
        }
        if (isKeyAuthFailure(lastMsg.toLowerCase(), lastStatus)) break;
      }
      return { ok: false as const, status: lastStatus, error: lastMsg };
    };

    const checks = keyToTest.startsWith("AQ.")
      ? [tryVertexExpress, tryStandard]
      : [tryStandard, tryVertexExpress];

    let primaryFailure: { status: number; error: string } | null = null;
    for (const check of checks) {
      const result = await check();
      if (result.ok) {
        res.status(200).json({ ok: true });
        return;
      }
      if (!primaryFailure) {
        primaryFailure = { status: result.status, error: result.error };
      }
    }

    res
      .status(primaryFailure?.status || 400)
      .json({ error: primaryFailure?.error || "Gemini API verification failed" });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Gemini API verification failed" });
  }
}
