import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverApiKey = process.env.GEMINI_API_KEY?.trim() || "";
const ai = serverApiKey
  ? new GoogleGenAI({
      apiKey: serverApiKey,
      httpOptions: {
        apiVersion: "v1beta",
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

function getGeminiClients(customApiKey?: string): GoogleGenAI[] {
  const trimmed = customApiKey?.trim();
  if (trimmed && trimmed !== serverApiKey) {
    const standardClient = new GoogleGenAI({
      apiKey: trimmed,
      httpOptions: {
        apiVersion: "v1beta",
        headers: { "User-Agent": "aistudio-build" },
      },
    });
    const vertexExpressClient = new GoogleGenAI({
      vertexai: true,
      apiKey: trimmed,
      httpOptions: {
        apiVersion: "v1beta1",
        headers: { "User-Agent": "aistudio-build" },
      },
    });
    return trimmed.startsWith("AQ.")
      ? [vertexExpressClient, standardClient]
      : [standardClient, vertexExpressClient];
  }
  return ai ? [ai] : [];
}

const isGemini4Model = (modelName: string) =>
  modelName.startsWith("gemini-4-");

const DEPRECATED_MODELS = new Set([
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-pro",
  "gemini-2.0-flash",
  "gemini-2.0-pro",
  "gemini-2.0-flash-thinking",
  "gemini-3.8-flash",
]);

function normalizeRequestedModel(model?: string): string {
  const trimmed = model?.trim() || "";
  if (!trimmed || DEPRECATED_MODELS.has(trimmed)) return "gemini-2.5-flash";
  return trimmed;
}

function getHttpStatusFromError(error: any): number {
  const directStatus = Number(error?.status || error?.statusCode || error?.code);
  if (directStatus >= 400 && directStatus < 600) return directStatus;
  const msg = String(error?.message || "").toLowerCase();
  if (msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("quota") || msg.includes("rate limit")) return 429;
  if (msg.includes("401") || msg.includes("unauthenticated")) return 401;
  if (msg.includes("403") || msg.includes("permission_denied") || msg.includes("forbidden") || msg.includes("referer")) return 403;
  if (msg.includes("api_key_invalid") || msg.includes("api key not valid")) return 400;
  if (msg.includes("404") || msg.includes("not found")) return 404;
  if (msg.includes("503") || msg.includes("unavailable")) return 503;
  return 500;
}

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Test a Gemini API key (or the server's configured GEMINI_API_KEY)
  app.post("/api/gemini/test-key", async (req, res) => {
    try {
      const customKey = req.body?.apiKey?.trim();
      const keyToTest = customKey || serverApiKey;
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
          res.json({ ok: true });
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
      res
        .status(getHttpStatusFromError(error))
        .json({ error: error?.message || "Gemini API verification failed" });
    }
  });

  // Analyze reference image or text description using Gemini
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { contents, apiKey } = req.body || {};
      const clients = getGeminiClients(apiKey);
      if (clients.length === 0) {
        res.status(400).json({ error: "No Gemini API key configured. Please add a Gemini API key in Config." });
        return;
      }

      const hasCustomKey = Boolean(apiKey?.trim());
      const candidateModels = hasCustomKey
        ? [
            "gemini-2.5-flash",
            "gemini-flash-latest",
            "gemini-3.1-flash-lite",
            "gemini-4-hydrogen",
          ]
        : [
            "gemini-4-hydrogen",
            "gemini-2.5-flash",
            "gemini-flash-latest",
            "gemini-3.1-flash-lite",
          ];
      let response: any = null;
      let usedModel = "";
      let lastErr: any = null;

      for (const client of clients) {
        const normalizedContents = Array.isArray(contents) ? contents : [];
        for (const m of candidateModels) {
          if (client.vertexai && isGemini4Model(m)) continue;
          try {
            const config: Record<string, any> = {
              responseMimeType: "application/json",
            };
            if (m.startsWith("gemini-2.5-flash") || m === "gemini-flash-latest") {
              config.thinkingConfig = { thinkingBudget: 0 };
            }
            response = await client.models.generateContent({
              model: m,
              contents: client.vertexai ? [{ role: "user", parts: normalizedContents }] : normalizedContents,
              config,
            });
            if (response) {
              usedModel = m;
              break;
            }
          } catch (innerErr: any) {
            lastErr = innerErr;
            const status = getHttpStatusFromError(innerErr);
            const msg = String(innerErr?.message || "").toLowerCase();
            // Immediately propagate quota/rate-limit errors so the client rotates keys immediately
            if (status === 429) {
              throw innerErr;
            }
            // If key itself is rejected by this endpoint, jump directly to next endpoint instead of retrying all models
            if (isKeyAuthFailure(msg, status)) {
              break;
            }
            // Try next fallback model if this specific model is unavailable or unsupported
            if (
              status === 404 ||
              status === 503 ||
              status === 400 ||
              msg.includes("not found") ||
              msg.includes("unavailable")
            ) {
              continue;
            }
            throw innerErr;
          }
        }
        if (response) break;
      }

      if (!response && lastErr) throw lastErr;
      res.json({ text: response?.text || "", model: usedModel });
    } catch (error: any) {
      res
        .status(getHttpStatusFromError(error))
        .json({ error: error?.message || "Gemini analysis failed" });
    }
  });

  // Generate stock prompts using Gemini
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { model, systemPrompt, apiKey } = req.body || {};
      const clients = getGeminiClients(apiKey);
      if (clients.length === 0) {
        res.status(400).json({ error: "No Gemini API key configured. Please add a Gemini API key in Config." });
        return;
      }

      const schema = {
        type: Type.OBJECT,
        properties: {
          prompts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: {
                  type: Type.STRING,
                  description: "The full descriptive prompt text.",
                },
              },
              required: ["text"],
            },
          },
        },
        required: ["prompts"],
      };

      const hasCustomKey = Boolean(apiKey?.trim());
      const normalizedModel = normalizeRequestedModel(model);
      const candidateModels = Array.from(
        new Set(
          (hasCustomKey
            ? [
                normalizedModel,
                "gemini-2.5-flash",
                "gemini-flash-latest",
                "gemini-3.1-flash-lite",
                "gemini-4-hydrogen",
              ]
            : [
                normalizedModel,
                "gemini-4-hydrogen",
                "gemini-2.5-flash",
                "gemini-flash-latest",
                "gemini-3.1-flash-lite",
              ]
          ).filter(Boolean)
        )
      );

      let response: any = null;
      let usedModel = "";
      let lastErr: any = null;

      for (const client of clients) {
        for (const m of candidateModels) {
          if (client.vertexai && isGemini4Model(m)) continue;
          try {
            const config: Record<string, any> = {
              responseMimeType: "application/json",
              responseSchema: schema,
            };
            if (!isGemini4Model(m)) {
              config.temperature = 0.78;
              config.topP = 0.92;
            }
            if (m.startsWith("gemini-2.5-flash") || m === "gemini-flash-latest") {
              config.thinkingConfig = { thinkingBudget: 0 };
            }

            response = await client.models.generateContent({
              model: m,
              contents: client.vertexai
                ? [{ role: "user", parts: [{ text: systemPrompt }] }]
                : systemPrompt,
              config,
            });
            if (response) {
              usedModel = m;
              break;
            }
          } catch (innerErr: any) {
            lastErr = innerErr;
            const status = getHttpStatusFromError(innerErr);
            const msg = String(innerErr?.message || "").toLowerCase();
            if (status === 429) {
              throw innerErr;
            }
            if (isKeyAuthFailure(msg, status)) {
              break;
            }
            if (
              status === 404 ||
              status === 503 ||
              status === 400 ||
              msg.includes("not found") ||
              msg.includes("unavailable")
            ) {
              continue;
            }
            throw innerErr;
          }
        }
        if (response) break;
      }

      if (!response && lastErr) throw lastErr;
      res.json({ text: response?.text?.trim() || '{"prompts":[]}', model: usedModel });
    } catch (error: any) {
      res
        .status(getHttpStatusFromError(error))
        .json({ error: error?.message || "Gemini generation failed" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
