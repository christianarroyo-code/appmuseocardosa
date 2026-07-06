# Museo Cardosa

Catálogo digital de las obras de la artista Cardosa. Sube una foto de un cuadro,
Claude la analiza (título, técnica, estilo, dimensiones, descripción curatorial)
y la organiza automáticamente en salas según su estilo.

## Estructura

- `src/` — frontend en React + Vite (interfaz tipo app móvil).
- `server/` — API en Express (`/api/analyze`) que llama a Claude con la
  imagen y devuelve la ficha catalográfica. La API key vive solo aquí,
  nunca en el navegador.

## Desarrollo local

1. `npm install`
2. Copia `.env.example` a `.env` y añade tu `ANTHROPIC_API_KEY`.
3. `npm run dev` — levanta Vite (puerto 5173) y la API (puerto 3001) a la vez.

## Producción

1. `npm run build` genera `dist/`.
2. `npm start` sirve la API y los archivos estáticos desde un único proceso
   Node (necesita `ANTHROPIC_API_KEY` y opcionalmente `PORT` en el entorno).

## Notas

- Las obras se guardan en `localStorage` del navegador (sin base de datos).
  Con muchas obras de alta resolución puede llenarse la cuota del navegador;
  si eso ocurre habría que migrar a IndexedDB o a un backend con almacenamiento real.
- Las salas (`SALAS_CFG` en `src/App.jsx`) se asignan por palabras clave sobre
  el estilo/técnica/descripción que devuelve Claude. Añadir una sala nueva es
  añadir una entrada más a ese objeto.
