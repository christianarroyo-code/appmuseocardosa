import { initializeApp } from 'firebase/app';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';

// Mismo proyecto de Firebase que "Jardín de Piedra de Fuego" (reutilizado a
// propósito). Esta config es pública por diseño -- la seguridad de Firebase
// se controla con las reglas del proyecto / App Check, no ocultando esto.
const firebaseConfig = {
  apiKey: 'AIzaSyBBDEeOlgMZu2NqHu-S_zwGDxv-ci1bOIw',
  authDomain: 'jardin-d3092.firebaseapp.com',
  projectId: 'jardin-d3092',
  storageBucket: 'jardin-d3092.firebasestorage.app',
  messagingSenderId: '398525098030',
  appId: '1:398525098030:web:977c663f651aa6da3257bf',
};

const app = initializeApp(firebaseConfig);
const ai = getAI(app, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, { model: 'gemini-2.5-flash' });

function buildPrompt(existingSalas) {
  const salasInstruction = existingSalas.length
    ? `Salas que ya existen en el museo: ${existingSalas.map((s) => `"${s}"`).join(', ')}. Si esta obra encaja por tema o estilo con alguna, usa EXACTAMENTE ese mismo nombre en "sala". Si no encaja con ninguna, inventa el nombre de una sala nueva.`
    : 'Todavía no existe ninguna sala en el museo: inventa el nombre de la primera.';

  return `Eres curador del Museo Pinturas Cardosa. Analiza esta pintura y responde SOLO JSON sin backticks ni texto extra:
{"title":"título poético español máx 5 palabras","year":"año estimado ej 2021","technique":"óleo/acrílico/acuarela/pastel/técnica mixta","style":"paisaje/retrato/abstracto/bodegón/expresionismo/impresionismo/figurativo/naïf/realismo","dimensions":"ej 80 × 60 cm","description":"descripción poética 2-3 frases como curador en español sobre luz emoción paleta y lo que transmite","sala":"nombre de la sala del museo a la que pertenece esta obra, 2-4 palabras en español, tipo Sala Retratos Íntimos"}

${salasInstruction}`;
}

export async function analyzePaintingWithGemini(base64Jpeg, existingSalas) {
  const result = await model.generateContent([
    { text: buildPrompt(existingSalas || []) },
    { inlineData: { mimeType: 'image/jpeg', data: base64Jpeg } },
  ]);
  const raw = result.response.text();
  const match = raw.replace(/```json|```/gi, '').trim().match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Gemini no devolvió una respuesta con formato reconocible');
  return JSON.parse(match[0]);
}
