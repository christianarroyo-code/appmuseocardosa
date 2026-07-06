# Museo Cardosa

Catálogo digital de las obras de la artista Cardosa. Sube una foto de un cuadro,
Claude la analiza (título, técnica, estilo, dimensiones, descripción curatorial)
y la organiza automáticamente en salas según su estilo.

## Estructura

- `src/` — frontend en React + Vite (interfaz tipo app móvil).
- `shared/curator.mjs` — lógica de la llamada a Claude (prompt del curador y
  parseo de la respuesta), compartida por los dos backends de abajo.
- `server/` — API en Express (`/api/analyze`) para desarrollo local o para
  desplegar en cualquier host Node. La API key vive solo aquí, nunca en el navegador.
- `netlify/functions/analyze.mjs` — la misma API como función serverless,
  para desplegar en Netlify.

## Desarrollo local

1. `npm install`
2. Copia `.env.example` a `.env` y añade tu `ANTHROPIC_API_KEY`.
3. `npm run dev` — levanta Vite (puerto 5173) y la API (puerto 3001) a la vez.

## Desplegar en Netlify

El repo ya trae `netlify.toml` (build, publish y redirects de `/api/*` a la función).

1. En Netlify: **Add new site → Import an existing project** y conecta este repo
   (o usa `netlify deploy --prod` desde la carpeta del proyecto con la Netlify CLI).
2. En **Site settings → Environment variables**, añade `ANTHROPIC_API_KEY`.
3. Netlify ejecuta `npm run build`, publica `dist/` y despliega
   `netlify/functions/analyze.mjs` como función — no hace falta gestionar servidor.

Un simple arrastrar-y-soltar de un ZIP estático **no sirve** para esta app: sin la
función serverless, `/api/analyze` no existe y el análisis con IA fallará.

## Otros hostings (con servidor Node propio)

1. `npm run build` genera `dist/`.
2. `npm start` sirve la API y los archivos estáticos desde un único proceso
   Node (necesita `ANTHROPIC_API_KEY` y opcionalmente `PORT` en el entorno).

## Notas

- Las obras se guardan en `localStorage` del navegador (sin base de datos).
  Con muchas obras de alta resolución puede llenarse la cuota del navegador;
  si eso ocurre habría que migrar a IndexedDB o a un backend con almacenamiento real.
- Las salas ya no son una lista fija: Claude decide, al analizar cada obra,
  si encaja en una sala existente o si hay que crear una nueva (ver `shared/curator.mjs`).
