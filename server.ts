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
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const trimmed = customApiKey?.trim();
  if (trimmed && trimmed !== process.env.GEMINI_API_KEY) {
    return new GoogleGenAI({
      apiKey: trimmed,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ai;
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

      res.json({ ok: true });
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
      const client = getGeminiClient(apiKey);

      const candidateModels = [
        "gemini-4-hydrogen",
        "gemini-2.5-flash",
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
      const client = getGeminiClient(apiKey);

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

      const candidateModels = Array.from(
        new Set(
          [
            model,
            "gemini-4-hydrogen",
            "gemini-2.5-flash",
            "gemini-flash-latest",
          ].filter(Boolean)
        )
      );

      let response: any = null;
      let lastErr: any = null;

      for (const m of candidateModels) {
        try {
          const config: Record<string, any> = {
            responseMimeType: "application/json",
            responseSchema: schema,
          };
          if (!isGemini4Model(m)) {
            config.temperature = 0.95;
            config.topP = 0.95;
          }

          response = await client.models.generateContent({
            model: m,
            contents: systemPrompt,
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
            msg.includes("503")
          ) {
            continue;
          }
          throw innerErr;
        }
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
