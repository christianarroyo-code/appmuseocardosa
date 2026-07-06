import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzePainting } from "../shared/curator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "15mb" }));

app.post("/api/analyze", async (req, res) => {
  const { b64, existingSalas } = req.body || {};
  if (!b64) return res.status(400).json({ error: "Falta la imagen" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY no está configurada en el servidor" });
  }

  try {
    const info = await analyzePainting(b64, Array.isArray(existingSalas) ? existingSalas : [], apiKey);
    res.json(info);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API escuchando en http://localhost:${port}`));
