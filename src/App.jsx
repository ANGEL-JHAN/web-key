import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import "./styles.css";

const DURACION_HORAS = 24;
const EXPIRA_SEGUNDOS = 24 * 60 * 60;

const TAREAS = [
  { id: "grupo", label: "Unirse al grupo de avisos", icon: "📢", url: "https://t.me/" },
  { id: "tiktok", label: "Seguir en TikTok", icon: "🎵", url: "https://www.tiktok.com/" },
  { id: "youtube", label: "Suscribirse en YouTube", icon: "▶️", url: "https://www.youtube.com/" },
  { id: "admin", label: "Contactar admin & soporte 24/7", icon: "💬", url: "https://t.me/" },
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

  useEffect(() => {
    const guardada = localStorage.getItem("mi_key");
    if (guardada) setKey(guardada);
  }, []);

  const todasHechas = useMemo(
    () => TAREAS.every((t) => completadas[t.id]),
    [completadas]
  );

  const progreso = useMemo(
    () => (Object.values(completadas).filter(Boolean).length / TAREAS.length) * 100,
    [completadas]
  );

  useEffect(() => {
    if (!key) return;
    const actualizarTiempo = async () => {
      const { data } = await supabase
        .from("licenses")
        .select("expires_at")
        .eq("license_key", key)
        .single();
      if (data?.expires_at) {
        const segundos = Math.max(
          0,
          Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000)
        );
        setRestante(segundos);
        if (segundos <= 0) {
          await supabase
            .from("licenses")
            .update({ active: false, expires_at: null, device_id: null })
            .eq("license_key", key);
          localStorage.removeItem("mi_key");
          setKey("");
        }
      }
    };
    actualizarTiempo();
    const intervalo = setInterval(actualizarTiempo, 1000);
    return () => clearInterval(intervalo);
  }, [key]);

  const marcarTarea = (t) => {
    if (completadas[t.id]) return;
    window.open(t.url, "_blank");
    setTimeout(() => {
      setCompletadas((c) => ({ ...c, [t.id]: true }));
    }, 1500);
  };

  const generar = async () => {
    if (!todasHechas || procesando) return;
    setProcesando(true);
    try {
      const ahora = new Date().toISOString();
      await supabase
        .from("licenses")
        .update({ active: false, expires_at: null, device_id: null })
        .lt("expires_at", ahora);
      const { data, error } = await supabase
        .from("licenses")
        .select("*")
        .eq("active", false)
        .order("id", { ascending: true })
        .limit(1)
        .single();
      if (error) throw error;
      const fechaExpira = new Date(Date.now() + EXPIRA_SEGUNDOS * 1000).toISOString();
      await supabase
        .from("licenses")
        .update({ active: true, expires_at: fechaExpira, device_id: null })
        .eq("id", data.id);
      setKey(data.license_key);
      localStorage.setItem("mi_key", data.license_key);
      setRestante(EXPIRA_SEGUNDOS);
    } catch (e) {
      console.error(e);
      alert("No hay keys disponibles");
    } finally {
      setProcesando(false);
    }
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(key);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const reiniciar = () => {
    localStorage.removeItem("mi_key");
    setKey("");
    setCompletadas({});
    setRestante(EXPIRA_SEGUNDOS);
  };

  return (
    <div className="page">
      <div className="bg-orbs">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>

      <div className="card">
        <div className="badge">
          <span className="dot" /> Sistema activo
        </div>

        <div className="header">
          <div className="key-icon">🔑</div>
          <h1>Generador de Key</h1>
          <p>Crea tu key <b>gratis</b> — rápido, seguro y sin registros.</p>
        </div>

        {!key && (
          <>
            <div className="section-title">
              <span>Tareas de verificación</span>
              <span className="progress-label">
                {Object.values(completadas).filter(Boolean).length}/{TAREAS.length}
              </span>
            </div>

            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progreso}%` }} />
            </div>

            <div className="tareas">
              {TAREAS.map((t) => {
                const hecha = !!completadas[t.id];
                return (
                  <button
                    key={t.id}
                    onClick={() => marcarTarea(t)}
                    disabled={hecha}
                    className={`tarea ${hecha ? "hecha" : ""}`}
                  >
                    <span className="tarea-icon">{t.icon}</span>
                    <span className="tarea-label">{t.label}</span>
                    <span className={`check ${hecha ? "on" : ""}`}>
                      {hecha ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={generar}
              disabled={!todasHechas || procesando}
              className="btn-primary"
            >
              {procesando ? "⏳ Procesando..." : todasHechas ? "🚀 Generar Key" : "🔒 Completa las tareas"}
            </button>
          </>
        )}

        {key && (
          <div className="result">
            <div className="timer-block">
              <span className="timer-label">Expira en</span>
              <div className="timer">{formatoTiempo(restante)}</div>
            </div>

            <div className="key-label">Tu Key de {DURACION_HORAS}H</div>
            <div className="key-box">{key}</div>

            <button onClick={copiar} className="btn-primary">
              {copiado ? "✓ Copiado" : "📋 Copiar Key"}
            </button>

            <button onClick={reiniciar} className="btn-ghost">
              Obtener nueva Key
            </button>
          </div>
        )}

        <div className="footer">Hecho con ♥ · Válido por {DURACION_HORAS}h</div>
      </div>
    </div>
  );
}
