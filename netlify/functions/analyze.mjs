import { analyzePainting } from "../../shared/curator.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método no permitido" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
  }

  const { b64, existingSalas } = body;
  if (!b64) return { statusCode: 400, body: JSON.stringify({ error: "Falta la imagen" }) };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "ANTHROPIC_API_KEY no está configurada en Netlify" }) };
  }

  try {
    const info = await analyzePainting(b64, Array.isArray(existingSalas) ? existingSalas : [], apiKey);
    return { statusCode: 200, body: JSON.stringify(info) };
  } catch (err) {
    return { statusCode: err.status || 500, body: JSON.stringify({ error: err.message }) };
  }
};
