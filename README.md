# Museo Cardosa

Catálogo digital de las obras de la artista Cardosa. Sube o haz una foto de un
cuadro, el curador digital (Claude) le pone título, técnica, año, dimensiones
y una lectura curatorial, y lo archiva solo en la sala que le corresponde —
si ninguna sala existente encaja, crea una nueva.

Es una PWA de un solo archivo (sin build, sin framework), igual en espíritu a
"Jardín de Piedra de Fuego": HTML/CSS/JS plano, instalable, con IndexedDB
(con fallback a localStorage) como almacén local.

## Estructura

- `index.html` — toda la app: interfaz, estilos y lógica.
- `manifest.json` / `sw.js` / `icon-*.png` — la hacen instalable como PWA.
- `shared/curator.mjs` — el prompt del curador y el parseo de la respuesta de Claude.
- `netlify/functions/analyze.mjs` — única pieza de servidor: recibe la foto,
  llama a Claude con `ANTHROPIC_API_KEY` (nunca viaja al navegador) y devuelve
  la ficha catalográfica.
- `netlify.toml` — publica la raíz tal cual y redirige `/api/*` a la función.

A diferencia del jardín (que resuelve su autocompletado con APIs públicas
gratuitas — GBIF y Wikipedia, sin clave), no existe una base pública de las
obras de Cardosa: identificarlas requiere visión por IA, y esa llamada sí
necesita una clave secreta. Por eso hace falta esta única función, aunque
todo lo demás sea estático.

## Desarrollo local

Con la [Netlify CLI](https://docs.netlify.com/cli/get-started/) (sirve los
estáticos y la función juntos, tal como en producción):

1. `npm install -g netlify-cli` (si no la tienes)
2. Copia `.env.example` a `.env` y añade tu `ANTHROPIC_API_KEY`
3. `netlify dev` — levanta la app en `http://localhost:8888`

## Desplegar en Netlify

1. **Add new site → Import an existing project** y conecta este repo
   (o `netlify deploy --prod` desde esta carpeta con la CLI).
2. En **Site settings → Environment variables**, añade `ANTHROPIC_API_KEY`.
3. Netlify publica la raíz y despliega `netlify/functions/analyze.mjs` como función.

Arrastrar solo el HTML/carpeta a app.netlify.com/drop **no basta**: sin la
función desplegada, `/api/analyze` no existe y "Analizar con IA" fallará.

## Notas

- Las obras (con su imagen en base64) se guardan en IndexedDB del navegador,
  con fallback a localStorage si IndexedDB no está disponible.
- Las salas no son una lista fija: Claude decide, al analizar cada obra, si
  encaja en una sala existente o si hay que crear una nueva.
