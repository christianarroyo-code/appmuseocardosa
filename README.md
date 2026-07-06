# Museo Cardosa

Catálogo digital de las obras de la artista Cardosa. Sube o haz una foto de un
cuadro, el curador digital (Gemini, vía Firebase AI Logic) le pone título,
técnica, año, dimensiones y una lectura curatorial, y lo archiva solo en la
sala que le corresponde — si ninguna sala existente encaja, crea una nueva.

Es una PWA de un solo archivo (sin build ni framework para la app en sí),
igual en espíritu a "Jardín de Piedra de Fuego": HTML/CSS/JS plano,
instalable, con IndexedDB (con fallback a localStorage) como almacén local.
Reutiliza el mismo proyecto de Firebase que el jardín.

## Estructura

- `index.html` — toda la app: interfaz, estilos y lógica.
- `manifest.json` / `sw.js` / `icon-*.png` — la hacen instalable como PWA.
- `vendor/firebase-ai.bundle.js` — el SDK de Firebase AI Logic (`firebase/ai`)
  ya empaquetado en un único archivo ESM, para poder importarlo desde
  `index.html` sin bundler. Se genera con `tools/build-firebase-ai/` y se
  versiona en el repo — solo hay que regenerarlo si cambia esta integración.

No hace falta servidor ni clave secreta: a diferencia de Claude/Anthropic, la
llamada a Gemini desde `firebase/ai` va directo del navegador a Firebase,
protegida por la config pública del proyecto (igual que la de Firestore/Storage
del jardín) en vez de una API key de servidor.

## Regenerar `vendor/firebase-ai.bundle.js`

Solo si cambias el modelo, el prompt del curador o la versión del SDK:

```
cd tools/build-firebase-ai
npm install
npm run build
```

## Desarrollo local

Al ser estático, sirve con cualquier servidor de archivos, por ejemplo:

```
npx serve .
```

## Desplegar en Netlify

**Add new site → Import an existing project** y conecta este repo (o
`netlify deploy --prod` desde esta carpeta con la CLI) — no hace falta
configurar ninguna variable de entorno.

## Habilitar Gemini en el proyecto de Firebase (una sola vez)

Si el proyecto (`jardin-d3092`) todavía no tiene **Firebase AI Logic**
habilitado:

1. En [console.firebase.google.com](https://console.firebase.google.com),
   abre el proyecto → **Build → AI Logic → Get started**.
2. Elige **Gemini Developer API** como backend (tiene capa gratuita, no pide
   tarjeta).
3. Sigue el asistente para activarlo — no requiere cambiar nada más en el código.

## Notas

- Las obras (con su imagen en base64) se guardan en IndexedDB del navegador,
  con fallback a localStorage si IndexedDB no está disponible.
- Las salas no son una lista fija: Gemini decide, al analizar cada obra, si
  encaja en una sala existente o si hay que crear una nueva.
- El prompt del curador y el modelo (`gemini-2.5-flash`) están en
  `tools/build-firebase-ai/src/entry.js`.
