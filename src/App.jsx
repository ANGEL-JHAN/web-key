import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const DURACION_HORAS = 24;
const EXPIRA_SEGUNDOS = 24 * 60 * 60;

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


  // Recuperar key al volver a entrar
  useEffect(() => {
    const guardada = localStorage.getItem("mi_key");

    if (guardada) {
      setKey(guardada);
    }
  }, []);


  const todasHechas = useMemo(
    () => TAREAS.every((t) => completadas[t.id]),
    [completadas]
  );


  // Tiempo real desde Supabase
  useEffect(() => {

    if (!key) return;


    const actualizarTiempo = async () => {

      const { data } = await supabase
        .from("licenses")
        .select("expires_at")
        .eq("license_key", key)
        .single();


      if (data?.expires_at) {

        const ahora = Date.now();
        const expira = new Date(data.expires_at).getTime();


        const segundos = Math.max(
          0,
          Math.floor((expira - ahora) / 1000)
        );


        setRestante(segundos);


        // Si expiró elimina la key guardada
        if (segundos <= 0) {
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


    window.open(t.url, "_blank", "noopener");


    setTimeout(() => {

      setCompletadas((c) => ({
        ...c,
        [t.id]: true
      }));

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
        .order("id", { ascending: true })
        .limit(1)
        .single();



      if (error) throw error;



      const fechaExpira = new Date(
        Date.now() + EXPIRA_SEGUNDOS * 1000
      ).toISOString();



      setKey(data.license_key);

      localStorage.setItem(
        "mi_key",
        data.license_key
      );


      setRestante(EXPIRA_SEGUNDOS);



      await supabase
        .from("licenses")
        .update({
          active: false,
          expires_at: fechaExpira
        })
        .eq("id", data.id);



    } catch (err) {

      console.error(err);

      alert("No hay licencias disponibles.");

    } finally {

      setProcesando(false);

    }

  };



  const copiar = async () => {

    try {

      await navigator.clipboard.writeText(key);

      setCopiado(true);


      setTimeout(() => {
        setCopiado(false);
      }, 1500);


    } catch (e) {

      console.error(e);

    }

  };



  const reiniciar = () => {

    localStorage.removeItem("mi_key");

    setKey("");

    setCompletadas({});

    setRestante(EXPIRA_SEGUNDOS);

  };



  return (
    <div className="page">

      <div className="card">

        <div className="icono">🔑</div>

        <h1>Generador de Key</h1>

        <p className="subtitulo">
          Crea tu key gratis — rápido y seguro
        </p>


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
              <div className="info-valor">
                {DURACION_HORAS} Horas
              </div>
            </div>
          </div>

        </div>



        {!key && (

          <>
            <div className="seccion-label">
              TAREAS DE VERIFICACIÓN
            </div>


            <div className="tareas">

              {TAREAS.map((t)=>(

                <button
                  key={t.id}
                  className={`tarea ${completadas[t.id] ? "hecha":""}`}
                  onClick={()=>marcarTarea(t)}
                  disabled={completadas[t.id]}
                >

                  <span>{t.label}</span>

                  <span className="check">
                    {completadas[t.id] ? "✓":"○"}
                  </span>

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


          </>

        )}




        {key && (

          <div className="resultado">


            <div className="temporizador">

              <div className="temp-label">
                Expira en
              </div>


              <div className="temp-valor">
                {formatoTiempo(restante)}
              </div>

            </div>



            <div className="key-label">
              Tu Key de {DURACION_HORAS}H
            </div>


            <div className="key-box">
              {key}
            </div>



            <button
              className="boton-principal"
              onClick={copiar}
            >

              {copiado ? "✓ Copiado":"Copiar Key"}

            </button>



            <button
              className="boton-secundario"
              onClick={reiniciar}
            >

              Obtener nueva Key

            </button>


          </div>

        )}



        <div className="footer">
          Hecho con ♥ — Generador de Key
        </div>


      </div>

    </div>
  );
}