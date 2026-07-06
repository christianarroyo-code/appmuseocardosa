import { useState, useEffect } from "react";

const STORAGE_KEY = "museo-cardosa-paintings";

const SALAS_CFG = {
  "Sala Naturaleza y Paisaje": {
    desc: "Paisajes, jardines, naturaleza y el mundo exterior",
    kw: ["paisaje","naturaleza","jardín","garden","marina","montaña","campo","flores","landscape","outdoor","bosque","rio","lago","atardecer","playa","costa","botanical","árbol","arboles","verde"],
    bg: "#e8f2e8",
  },
  "Sala Figurativa y Retratos": {
    desc: "Figuras humanas, retratos y escenas con personas",
    kw: ["figurativo","retrato","figura","portrait","persona","mujer","hombre","niño","familia","family","realismo","rostro","face","people","human"],
    bg: "#f2e8e8",
  },
  "Sala Abstracción y Color": {
    desc: "Arte abstracto, geométrico y exploración del color",
    kw: ["abstracto","abstract","geométrico","geometric","expresionismo","expressionism","minimalismo","contemporáneo","moderno","no figurativo"],
    bg: "#e8eaf5",
  },
  "Sala Bodegones y Objetos": {
    desc: "Bodegones, naturalezas muertas y composiciones de objetos",
    kw: ["bodegón","still life","frutas","fruit","comida","food","jarrón","vase","flores cortadas","objetos","naturaleza muerta"],
    bg: "#f5f0e8",
  },
};

function getSala(style = "", desc = "", tech = "") {
  const h = (style + " " + desc + " " + tech).toLowerCase();
  for (const [name, cfg] of Object.entries(SALAS_CFG))
    if (cfg.kw.some((k) => h.includes(k))) return name;
  return "Sala Miscelánea";
}

function compress(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round((h * MAX) / w); w = MAX; }
          else { w = Math.round((w * MAX) / h); h = MAX; }
        }
        try {
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          const ctx = c.getContext("2d");
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL("image/jpeg", 0.8).split(",")[1]);
        } catch { resolve(dataUrl.split(",")[1]); }
      };
      img.onerror = () => resolve(dataUrl.split(",")[1]);
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

async function analyzeWithClaude(b64) {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ b64 }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error("API " + response.status + ": " + text.slice(0, 150));
  return JSON.parse(text);
}

function Logo({ sm }) {
  const S = sm ? 11 : 13, bw = "2.5px", bc = "#c8102e";
  const cor = (t, r, b, l) => ({ position: "absolute", width: S, height: S, borderTop: t ? `${bw} solid ${bc}` : "none", borderRight: r ? `${bw} solid ${bc}` : "none", borderBottom: b ? `${bw} solid ${bc}` : "none", borderLeft: l ? `${bw} solid ${bc}` : "none" });
  const W = sm ? 68 : 84;
  return (
    <div style={{ width: W, height: W * 0.74, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <div style={{ ...cor(1, 0, 0, 1), top: 0, left: 0 }} /><div style={{ ...cor(1, 1, 0, 0), top: 0, right: 0 }} />
      <div style={{ ...cor(0, 0, 1, 1), bottom: 0, left: 0 }} /><div style={{ ...cor(0, 1, 1, 0), bottom: 0, right: 0 }} />
      <div style={{ textAlign: "center", lineHeight: 1 }}>
        <div style={{ fontSize: sm ? 7 : 8.5, fontWeight: 600, letterSpacing: "0.14em", color: "#5a5048", textTransform: "uppercase", marginBottom: 2 }}>Museo</div>
        <div style={{ fontSize: sm ? 13 : 16, fontWeight: 600, color: "#1c1714", fontFamily: "'Playfair Display',serif" }}>CARDOSA</div>
      </div>
    </div>
  );
}

function Cover({ items, bg }) {
  if (!items.length) return <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, color: "#ccc", background: bg }}>🖼️</div>;
  if (items.length === 1) return <img src={`data:image/jpeg;base64,${items[0].b64}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  const show = [...items, null, null, null, null].slice(0, 4);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, width: "100%", height: "100%" }}>
      {show.map((p, i) => (p ? <img key={i} src={`data:image/jpeg;base64,${p.b64}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div key={i} style={{ background: bg }} />))}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [paintings, setPaintings] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [status, setStatus] = useState("idle"); // idle | reading | analyzing | error
  const [errorMsg, setErrorMsg] = useState("");
  const [activeSala, setActiveSala] = useState("");
  const [activeP, setActiveP] = useState(null);
  const [prevScreen, setPrev] = useState("salas");

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(paintings)); } catch {}
  }, [paintings]);

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, "0")} / ${String(today.getMonth() + 1).padStart(2, "0")} / ${today.getFullYear()}`;

  const groups = {};
  paintings.forEach((p) => { (groups[p.sala] ||= []).push(p); });

  async function onFilePicked(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    for (const file of files) {
      try {
        setStatus("reading");
        setErrorMsg("");
        const b64 = await compress(file);
        setStatus("analyzing");
        const info = await analyzeWithClaude(b64);
        const sala = getSala(info.style, info.description, info.technique);
        const p = { id: Date.now() + Math.random(), b64, sala, ...info };
        setPaintings((prev) => [...prev, p]);
        setStatus("idle");
        setPrev("salas");
        setActiveP(p);
        setScreen("detail");
      } catch (err) {
        setStatus("error");
        setErrorMsg(err.message);
      }
    }
  }

  const isLoading = status === "reading" || status === "analyzing";

  const IB = { width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "#5a5048", fontSize: 17, cursor: "pointer", background: "#f0ebe3", borderRadius: "50%", border: "none", flexShrink: 0 };
  const PHONE = { width: 390, minHeight: 844, maxHeight: 844, background: "#faf8f5", borderRadius: 44, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.22),0 0 0 1px rgba(0,0,0,0.06)", position: "relative", display: "flex", flexDirection: "column" };
  const NAV = (cream) => ({ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "52px 22px 14px", background: cream ? "#faf8f5" : "#fff", borderBottom: "1px solid #ede8e2", flexShrink: 0 });

  function BNav({ active }) {
    return (
      <div style={{ flexShrink: 0, background: "#fff", borderTop: "1px solid #ede8e2", padding: "10px 0 26px", display: "flex", justifyContent: "space-around" }}>
        {[["⌂", "Inicio", "home"], ["🏛", "Salas", "salas"]].map(([ic, lb, id]) => (
          <div key={lb} onClick={() => setScreen(id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", color: active === id ? "#c8102e" : "#9a9088", fontSize: 9, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            <span style={{ fontSize: 19 }}>{ic}</span>{lb}
          </div>
        ))}
        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", color: "#9a9088", fontSize: 9, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          <input type="file" accept="image/*" multiple onChange={onFilePicked} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} />
          <span style={{ fontSize: 19 }}>➕</span>Subir
        </label>
      </div>
    );
  }

  function UploadHero() {
    return (
      <label style={{ display: "block", margin: "0 24px 24px", border: "2px dashed #ddd8d0", borderRadius: 16, padding: "24px 20px", textAlign: "center", cursor: "pointer", background: "#f5f2ee" }}>
        <input type="file" accept="image/*" multiple onChange={onFilePicked} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} />
        <div style={{ fontSize: 30, marginBottom: 8 }}>🖼️</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1c1714", marginBottom: 4 }}>Añadir obra al museo</div>
        <div style={{ fontSize: 12, color: "#9a9088", lineHeight: 1.5 }}>Claude analizará la pintura y la catalogará automáticamente</div>
      </label>
    );
  }

  function UploadStrip() {
    return (
      <label style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 16px 14px", border: "2px dashed #ddd8d0", borderRadius: 12, padding: "13px 16px", cursor: "pointer", background: "#fff", flexShrink: 0 }}>
        <input type="file" accept="image/*" multiple onChange={onFilePicked} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} />
        <span style={{ fontSize: 22 }}>➕</span>
        <div><div style={{ fontSize: 13, fontWeight: 600, color: "#1c1714" }}>Subir nueva obra</div><div style={{ fontSize: 11, color: "#9a9088", marginTop: 2 }}>Claude la clasifica automáticamente</div></div>
        <span style={{ marginLeft: "auto", color: "#c8102e", fontSize: 18 }}>↑</span>
      </label>
    );
  }

  function Overlay() {
    if (status === "idle") return null;
    return (
      <div style={{ position: "absolute", inset: 0, background: "rgba(250,248,245,0.96)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 300, gap: 16, borderRadius: 44, padding: "0 32px" }}>
        {isLoading ? (
          <>
            <div style={{ width: 48, height: 48, border: "3px solid #ede8e2", borderTopColor: "#c8102e", borderRadius: "50%", animation: "cspin .85s linear infinite" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1c1714", marginBottom: 6, fontFamily: "'Playfair Display',serif" }}>
                {status === "reading" ? "Leyendo la imagen…" : "Claude analiza la obra…"}
              </div>
              <div style={{ fontSize: 13, color: "#5a5048", lineHeight: 1.6 }}>
                {status === "reading" ? "Preparando y comprimiendo" : "Nombrando, clasificando y describiendo"}
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 42 }}>⚠️</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1c1714", marginBottom: 8 }}>Error al procesar</div>
              <div style={{ fontSize: 11, color: "#5a5048", lineHeight: 1.6, marginBottom: 20, wordBreak: "break-all", maxWidth: 280 }}>{errorMsg}</div>
              <button onClick={() => setStatus("idle")} style={{ padding: "11px 28px", background: "#c8102e", border: "none", borderRadius: 24, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cerrar</button>
            </div>
          </>
        )}
      </div>
    );
  }

  /* HOME */
  if (screen === "home") return (
    <div style={PHONE}>
      <style>{`@keyframes cspin{to{transform:rotate(360deg)}}`}</style>
      <Overlay />
      <div style={NAV(false)}><div style={IB}>☰</div><Logo /><div style={IB}>🗺</div></div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "28px 26px 0" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c8102e", marginBottom: 10 }}>
            <div style={{ width: 18, height: 1.5, background: "#c8102e" }} /> Colección permanente
          </div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 400, lineHeight: 1.22, color: "#1c1714", marginBottom: 10 }}>
            Arte que<br />nace del<br /><em style={{ fontStyle: "italic", color: "#c8102e" }}>alma</em>
          </h1>
          <p style={{ fontSize: 13, color: "#9a9088", lineHeight: 1.65, marginBottom: 22, fontWeight: 300 }}>Pinturas de la artista Cardosa, organizadas por salas según su estilo.</p>
          <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
            <button onClick={() => setScreen("salas")} style={{ flex: 1, padding: 14, background: "#c8102e", border: "none", borderRadius: 28, color: "#fff", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>Ver las salas →</button>
            <button onClick={() => setScreen("salas")} style={{ flex: 1, padding: 14, background: "transparent", border: "1.5px solid #ede8e2", borderRadius: 28, color: "#1c1714", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>Colección</button>
          </div>
        </div>
        <UploadHero />
        <div style={{ display: "flex", borderTop: "1px solid #ede8e2", padding: "16px 0" }}>
          {[[paintings.length, "Obras"], [Object.keys(groups).length, "Salas"], ["∞", "Emoción"]].map(([n, l], i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", borderLeft: i > 0 ? "1px solid #ede8e2" : "none" }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 600, color: "#1c1714" }}>{n}</div>
              <div style={{ fontSize: 9, color: "#9a9088", textTransform: "uppercase", letterSpacing: "0.08em" }}>{l}</div>
            </div>
          ))}
        </div>
        {paintings.length > 0 && <>
          <div style={{ padding: "20px 26px 10px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#5a5048" }}>Últimas incorporaciones</div>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "0 26px 28px", scrollbarWidth: "none" }}>
            {[...paintings].reverse().slice(0, 5).map((p) => (
              <div key={p.id} onClick={() => { setPrev("home"); setActiveP(p); setScreen("detail"); }} style={{ flexShrink: 0, width: 120, borderRadius: 10, overflow: "hidden", boxShadow: "0 3px 12px rgba(0,0,0,0.09)", background: "#fff", cursor: "pointer" }}>
                <div style={{ height: 90, overflow: "hidden" }}><img src={`data:image/jpeg;base64,${p.b64}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
                <div style={{ padding: "7px 9px", fontSize: 9.5, fontStyle: "italic", fontFamily: "'Playfair Display',serif", color: "#5a5048", lineHeight: 1.3 }}>{p.title}</div>
              </div>
            ))}
          </div>
        </>}
      </div>
      <BNav active="home" />
    </div>
  );

  /* SALAS */
  if (screen === "salas") return (
    <div style={PHONE}>
      <style>{`@keyframes cspin{to{transform:rotate(360deg)}}`}</style>
      <Overlay />
      <div style={NAV(true)}><button style={IB} onClick={() => setScreen("home")}>‹</button><Logo sm /><div style={IB}>🗺</div></div>
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 400, textAlign: "center", padding: "18px 26px 10px", color: "#1c1714", flexShrink: 0 }}>Las salas del museo</h2>
      <UploadStrip />
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
        {Object.keys(groups).length === 0
          ? <div style={{ border: "2px dashed #ede8e2", borderRadius: 14, padding: "32px 20px", textAlign: "center", background: "#fff", color: "#9a9088" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏛️</div>
              <p style={{ fontSize: 12, lineHeight: 1.7 }}>Las salas se crearán automáticamente cuando subas las primeras obras. Claude clasificará cada pintura y la asignará a la sala correcta.</p>
            </div>
          : Object.entries(groups).map(([s, obras]) => {
              const cfg = SALAS_CFG[s] || { bg: "#f0ebe3", desc: "Obras variadas" };
              return (
                <div key={s} onClick={() => { setActiveSala(s); setScreen("obras"); }} style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 3px 14px rgba(0,0,0,0.09)", cursor: "pointer", background: "#fff", marginBottom: 14 }}>
                  <div style={{ height: 130, position: "relative", overflow: "hidden", background: cfg.bg }}>
                    <Cover items={obras} bg={cfg.bg} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 60%)" }} />
                    <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(255,255,255,0.92)", borderRadius: 20, padding: "3px 10px", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#c8102e" }}>{obras.length} obra{obras.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ padding: "14px 16px 16px" }}>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 600, color: "#1c1714", marginBottom: 3 }}>{s}</div>
                    <div style={{ fontSize: 12, color: "#9a9088", lineHeight: 1.5 }}>{cfg.desc}</div>
                  </div>
                </div>
              );
            })
        }
      </div>
      <BNav active="salas" />
    </div>
  );

  /* OBRAS */
  if (screen === "obras") {
    const obras = groups[activeSala] || [];
    return (
      <div style={PHONE}>
        <style>{`@keyframes cspin{to{transform:rotate(360deg)}}`}</style>
        <Overlay />
        <div style={NAV(true)}><button style={IB} onClick={() => setScreen("salas")}>‹</button><Logo sm /><div style={IB}>🗺</div></div>
        <div style={{ padding: "14px 24px 2px", flexShrink: 0 }}>
          <div style={{ display: "inline-block", padding: "3px 10px", background: "#f8eaed", borderRadius: 10, fontSize: 9.5, color: "#c8102e", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{activeSala}</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 600, color: "#1c1714" }}>{activeSala}</div>
        </div>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9a9088", textAlign: "center", padding: "4px 0 10px", flexShrink: 0 }}>{obras.length} obra{obras.length !== 1 ? "s" : ""} en esta sala</div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: "4px 16px 32px" }}>
            {obras.map((p) => (
              <div key={p.id} onClick={() => { setPrev("obras"); setActiveP(p); setScreen("detail"); }} style={{ background: "#fff", borderRadius: 10, overflow: "hidden", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
                <div style={{ height: 128, overflow: "hidden", background: "#f0ebe3" }}>
                  <img src={`data:image/jpeg;base64,${p.b64}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ padding: "10px 11px 13px" }}>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 11.5, fontStyle: "italic", color: "#1c1714", lineHeight: 1.35, marginBottom: 4 }}>{p.title}</p>
                  <p style={{ fontSize: 10, color: "#9a9088" }}>Cardosa · {p.year}</p>
                  <span style={{ display: "inline-block", marginTop: 6, padding: "2px 8px", background: "#f8eaed", borderRadius: 10, fontSize: 9, color: "#c8102e", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{p.style}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <BNav active="obras" />
      </div>
    );
  }

  /* DETAIL */
  if (screen === "detail" && activeP) {
    const p = activeP;
    return (
      <div style={PHONE}>
        <style>{`@keyframes cspin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ flexShrink: 0, height: 300, background: "#f0ebe3", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 52, left: 18, right: 18, display: "flex", justifyContent: "space-between", zIndex: 10 }}>
            <button style={IB} onClick={() => setScreen(prevScreen)}>‹</button><div style={{ width: 36 }} />
          </div>
          <div style={{ width: 200, height: 230, border: "10px solid #c8b898", borderRadius: 3, boxShadow: "0 2px 0 #a89878,0 20px 50px rgba(0,0,0,0.13),inset 0 0 0 2px #e8d8b8", overflow: "hidden", zIndex: 1 }}>
            <img src={`data:image/jpeg;base64,${p.b64}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ position: "absolute", bottom: 14, right: 14, background: "#fff", borderRadius: 8, padding: "9px 12px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", border: "1.5px solid #c8102e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 5.5, fontWeight: 700, color: "#c8102e", lineHeight: 1.1 }}>MC</span>
              </div>
              <div>
                <div style={{ fontSize: 8, fontWeight: 600, color: "#1c1714", letterSpacing: "0.04em" }}>MUSEO CARDOSA</div>
                <div style={{ fontSize: 8, color: "#9a9088" }}>{dateStr}</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ padding: "20px 24px 12px" }}>
            <span style={{ display: "inline-block", padding: "3px 10px", background: "#f8eaed", borderRadius: 10, fontSize: 9.5, color: "#c8102e", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>{p.sala}</span>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontStyle: "italic", color: "#1c1714", marginBottom: 3, lineHeight: 1.25 }}>{p.title}</h2>
            <p style={{ fontSize: 13, color: "#9a9088", marginBottom: 5 }}>{p.year}</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#1c1714" }}>Cardosa</p>
          </div>
          <div style={{ height: 1, background: "#ede8e2", margin: "0 24px 14px" }} />
          <p style={{ padding: "0 24px 14px", fontSize: 13, color: "#5a5048", lineHeight: 1.72, fontWeight: 300 }}>{p.description}</p>
          <div style={{ display: "flex", gap: 8, padding: "0 24px 20px", flexWrap: "wrap" }}>
            {[p.technique, p.style, p.dimensions].filter(Boolean).map((s, i) => (
              <span key={i} style={{ padding: "5px 12px", border: "1px solid #ede8e2", borderRadius: 18, fontSize: 11, color: "#5a5048" }}>{s}</span>
            ))}
          </div>
          <div style={{ padding: "4px 24px 44px", display: "flex", flexDirection: "column", gap: 10 }}>
            <button style={{ padding: 14, border: "1.5px solid #ede8e2", borderRadius: 28, background: "#fff", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1c1714", cursor: "pointer" }}>Compartir</button>
            <button onClick={() => setScreen(prevScreen)} style={{ padding: 14, border: "none", borderRadius: 28, background: "#c8102e", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#fff", cursor: "pointer" }}>Volver a la sala</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
