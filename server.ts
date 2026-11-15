import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "v1beta",
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

function getGeminiClients(customApiKey?: string): GoogleGenAI[] {
  const trimmed = customApiKey?.trim();
  if (trimmed && trimmed !== process.env.GEMINI_API_KEY) {
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
  return [ai];
}

const isGemini4Model = (modelName: string) =>
  modelName.startsWith("gemini-4-");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Test a Gemini API key (or the server's configured GEMINI_API_KEY)
  app.post("/api/gemini/test-key", async (req, res) => {
    try {
      const customKey = req.body?.apiKey?.trim();
      const keyToTest = customKey || process.env.GEMINI_API_KEY;
      if (!keyToTest) {
        res.status(400).json({ error: "No Gemini API key configured." });
        return;
      }

      // 1. Try standard Gemini Developer API (generativelanguage.googleapis.com)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(keyToTest)}`
      );
      if (response.ok) {
        res.json({ ok: true });
        return;
      }

      const firstErrText = await response.text();

      // 2. Fallback: Try Vertex AI Express Mode endpoint (for AQ.Ab8RN... Google Cloud / Vertex keys)
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
          res.json({ ok: true });
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
      res
        .status(500)
        .json({ error: error?.message || "Gemini API verification failed" });
    }
  });

  // Analyze reference image or text description using Gemini
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { contents, apiKey } = req.body || {};
      const clients = getGeminiClients(apiKey);

      const hasCustomKey = Boolean(apiKey?.trim());
      const candidateModels = hasCustomKey
        ? [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-flash-latest",
            "gemini-1.5-flash",
            "gemini-4-hydrogen",
          ]
        : [
            "gemini-4-hydrogen",
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-flash-latest",
          ];
      let response: any = null;
      let lastErr: any = null;

      for (const client of clients) {
        const normalizedContents = client.vertexai
          ? contents.map((p: any) => p)
          : contents;
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
            if (response) break;
          } catch (innerErr: any) {
            lastErr = innerErr;
            const msg = String(innerErr?.message || "").toLowerCase();
            if (
              msg.includes("not found") ||
              msg.includes("404") ||
              msg.includes("unavailable") ||
              msg.includes("503") ||
              msg.includes("unauthenticated") ||
              msg.includes("401") ||
              msg.includes("403") ||
              msg.includes("api key not valid")
            ) {
              continue;
            }
            throw innerErr;
          }
        }
        if (response) break;
      }

      if (!response && lastErr) throw lastErr;
      res.json({ text: response?.text || "" });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error?.message || "Gemini analysis failed" });
    }
  });

  // Generate stock prompts using Gemini
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { model, systemPrompt, apiKey } = req.body || {};
      const clients = getGeminiClients(apiKey);

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
      const normalizedModel =
        model === "gemini-3.8-flash" ? "gemini-2.5-flash" : model;
      const candidateModels = Array.from(
        new Set(
          (hasCustomKey
            ? [
                normalizedModel,
                "gemini-2.5-flash",
                "gemini-2.0-flash",
                "gemini-flash-latest",
                "gemini-1.5-flash",
                "gemini-4-hydrogen",
              ]
            : [
                normalizedModel,
                "gemini-4-hydrogen",
                "gemini-2.5-flash",
                "gemini-2.0-flash",
                "gemini-flash-latest",
              ]
          ).filter(Boolean)
        )
      );

      let response: any = null;
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
              config.temperature = 0.95;
              config.topP = 0.95;
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
            if (response) break;
          } catch (innerErr: any) {
            lastErr = innerErr;
            const msg = String(innerErr?.message || "").toLowerCase();
            if (
              msg.includes("not found") ||
              msg.includes("404") ||
              msg.includes("unavailable") ||
              msg.includes("503") ||
              msg.includes("unauthenticated") ||
              msg.includes("401") ||
              msg.includes("403") ||
              msg.includes("api key not valid")
            ) {
              continue;
            }
            throw innerErr;
          }
        }
        if (response) break;
      }

      if (!response && lastErr) throw lastErr;
      res.json({ text: response?.text?.trim() || '{"prompts":[]}' });
    } catch (error: any) {
      res
        .status(500)
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
