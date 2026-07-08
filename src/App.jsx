import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const DURACION_HORAS = 12;
const EXPIRA_SEGUNDOS = 12 * 60 * 60; // 12h

const TAREAS = [
  { id: "grupo", label: "UNIRSE AL GRUPO DE AVISOS", url: "https://t.me/" },
  { id: "tiktok", label: "SEGUIR EN TIKTOK", url: "https://www.tiktok.com/" },
  { id: "youtube", label: "SUSCRIBIRSE AL CANAL DE YOUTUBE", url: "https://www.youtube.com/" },
  { id: "admin", label: "CONTACTAR ADMIN Y SOPORTE 24/7", url: "https://t.me/" },
];


function formatoTiempo(s) {
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const seg = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${seg}`;
}

export default function App() {
  const [completadas, setCompletadas] = useState({});
  const [procesando, setProcesando] = useState(false);
  const [key, setKey] = useState("");
  const [restante, setRestante] = useState(EXPIRA_SEGUNDOS);
  const [copiado, setCopiado] = useState(false);

  const todasHechas = useMemo(
    () => TAREAS.every((t) => completadas[t.id]),
    [completadas]
  );

  useEffect(() => {
    if (!key) return;
    const id = setInterval(() => {
      setRestante((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [key]);

  const marcarTarea = (t) => {
    if (completadas[t.id]) return;
    window.open(t.url, "_blank", "noopener");
    // Simula verificación: se marca completa tras breve espera
    setTimeout(() => {
      setCompletadas((c) => ({ ...c, [t.id]: true }));
    }, 1500);
  };

  const generar = async () => {
  if (!todasHechas || procesando) return;

  setProcesando(true);

  try {
    const { data, error } = await supabase
      .from("licenses")
      .select("*")
      .eq("active", true)
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      alert("No hay licencias disponibles.");
      return;
    }

    const licencia = data[0];

    setKey(licencia.license_key);
    setRestante(EXPIRA_SEGUNDOS);

  } catch (err) {
    console.error(err);
    alert("Error al obtener la licencia.");
  } finally {
    setProcesando(false);
  }
};

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  const reiniciar = () => {
    setKey("");
    setCompletadas({});
    setRestante(EXPIRA_SEGUNDOS);
  };

  return (
    <div className="page">
      <div className="card">
        <div className="icono">🔑</div>
        <h1>Generador de Key</h1>
        <p className="subtitulo">Crea tu key gratis — rápido y seguro</p>

        <div className="info-grid">
          <div className="info-box">
            <div className="info-emoji">📱</div>
            <div>
              <div className="info-label">DISPOSITIVO</div>
              <div className="info-valor">1 Dispositivo</div>
            </div>
          </div>
          <div className="info-box">
            <div className="info-emoji">⏱</div>
            <div>
              <div className="info-label">DURACIÓN</div>
              <div className="info-valor">{DURACION_HORAS} Horas</div>
            </div>
          </div>
        </div>

        {!key && (
          <>
            <div className="seccion-label">TAREAS DE VERIFICACIÓN</div>
            <div className="tareas">
              {TAREAS.map((t) => (
                <button
                  key={t.id}
                  className={`tarea ${completadas[t.id] ? "hecha" : ""}`}
                  onClick={() => marcarTarea(t)}
                  disabled={completadas[t.id]}
                >
                  <span>{t.label}</span>
                  <span className="check">{completadas[t.id] ? "✓" : "○"}</span>
                </button>
              ))}
            </div>

            <button
              className="boton-principal"
              onClick={generar}
              disabled={!todasHechas || procesando}
            >
              {procesando ? "⏳ Procesando..." : "Generar Key"}
            </button>

            {!todasHechas && (
              <p className="ayuda">
                Completa todas las tareas para desbloquear tu key.
              </p>
            )}
          </>
        )}

        {key && (
          <div className="resultado">
            <div className="temporizador">
              <div className="temp-label">Expira en</div>
              <div className="temp-valor">{formatoTiempo(restante)}</div>
            </div>

            <div className="key-label">Tu Key de {DURACION_HORAS}H</div>
            <div className="key-box">{key}</div>

            <button className="boton-principal" onClick={copiar}>
              {copiado ? "✓ Copiado" : "Copiar Key"}
            </button>
            <button className="boton-secundario" onClick={reiniciar}>
              Obtener nueva Key
            </button>
          </div>
        )}

        <div className="footer">Hecho con ♥ — Generador de Key</div>
      </div>
    </div>
  );
}