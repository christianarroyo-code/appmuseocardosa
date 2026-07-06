import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "15mb" }));

function buildPrompt(existingSalas) {
  const salasInstruction = existingSalas.length
    ? `Salas que ya existen en el museo: ${existingSalas.map((s) => `"${s}"`).join(", ")}. Si esta obra encaja por tema o estilo con alguna, usa EXACTAMENTE ese mismo nombre en "sala". Si no encaja con ninguna, inventa el nombre de una sala nueva.`
    : `Todavía no existe ninguna sala en el museo: inventa el nombre de la primera.`;

  return `Eres curador del Museo Pinturas Cardosa. Analiza esta pintura y responde SOLO JSON sin backticks ni texto extra:
{"title":"título poético español máx 5 palabras","year":"año estimado ej 2021","technique":"óleo/acrílico/acuarela/pastel/técnica mixta","style":"paisaje/retrato/abstracto/bodegón/expresionismo/impresionismo/figurativo/naïf/realismo","dimensions":"ej 80 × 60 cm","description":"descripción poética 2-3 frases como curador en español sobre luz emoción paleta y lo que transmite","sala":"nombre de la sala del museo a la que pertenece esta obra, 2-4 palabras en español, tipo Sala Retratos Íntimos"}

${salasInstruction}`;
}

app.post("/api/analyze", async (req, res) => {
  const { b64, existingSalas } = req.body || {};
  if (!b64) return res.status(400).json({ error: "Falta la imagen" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY no está configurada en el servidor" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
              { type: "text", text: buildPrompt(Array.isArray(existingSalas) ? existingSalas : []) },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Error de la API de Anthropic" });
    }

    const raw = data.content?.find((b) => b.type === "text")?.text || "";
    const match = raw.replace(/```json|```/gi, "").trim().match(/\{[\s\S]*\}/);
    if (!match) return res.status(502).json({ error: "Claude no devolvió JSON válido" });

    res.json(JSON.parse(match[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API escuchando en http://localhost:${port}`));
