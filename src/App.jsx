import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const DURACION_HORAS = 24;
const EXPIRA_SEGUNDOS = 24 * 60 * 60;

const TAREAS = [
  { id:"grupo", label:"UNIRSE AL GRUPO DE AVISOS", url:"https://t.me/" },
  { id:"tiktok", label:"SEGUIR EN TIKTOK", url:"https://www.tiktok.com/" },
  { id:"youtube", label:"SUSCRIBIRSE AL CANAL DE YOUTUBE", url:"https://www.youtube.com/" },
  { id:"admin", label:"CONTACTAR ADMIN Y SOPORTE 24/7", url:"https://t.me/" },
];


function formatoTiempo(s){

  const h = String(Math.floor(s / 3600)).padStart(2,"0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2,"0");
  const seg = String(s % 60).padStart(2,"0");

  return `${h}:${m}:${seg}`;

}



export default function App(){

const [completadas,setCompletadas]=useState({});
const [procesando,setProcesando]=useState(false);
const [key,setKey]=useState("");
const [restante,setRestante]=useState(EXPIRA_SEGUNDOS);
const [copiado,setCopiado]=useState(false);



useEffect(()=>{

const guardada=localStorage.getItem("mi_key");

if(guardada){
setKey(guardada);
}

},[]);



const todasHechas=useMemo(
()=>TAREAS.every(t=>completadas[t.id]),
[completadas]
);



useEffect(()=>{

if(!key)return;


const actualizarTiempo=async()=>{


const {data}=await supabase
.from("licenses")
.select("expires_at")
.eq("license_key",key)
.single();



if(data?.expires_at){


const segundos=Math.max(
0,
Math.floor(
(new Date(data.expires_at).getTime()-Date.now())/1000
)
);


setRestante(segundos);



if(segundos<=0){


await supabase
.from("licenses")
.update({
active:false,
expires_at:null,
device_id:null
})
.eq("license_key",key);



localStorage.removeItem("mi_key");
setKey("");

}


}


};



actualizarTiempo();


const intervalo=setInterval(
actualizarTiempo,
1000
);


return()=>clearInterval(intervalo);



},[key]);






const marcarTarea=(t)=>{


if(completadas[t.id])return;


window.open(t.url,"_blank");


setTimeout(()=>{


setCompletadas(c=>({
...c,
[t.id]:true
}));


},1500);


};






const generar=async()=>{


if(!todasHechas || procesando)return;


setProcesando(true);



try{


const ahora=new Date().toISOString();


// liberar vencidas

await supabase
.from("licenses")
.update({
active:false,
expires_at:null,
device_id:null
})
.lt("expires_at",ahora);




// buscar key libre

const {data,error}=await supabase
.from("licenses")
.select("*")
.eq("active",false)
.order("id",{ascending:true})
.limit(1)
.single();



if(error)throw error;



const fechaExpira=new Date(
Date.now()+EXPIRA_SEGUNDOS*1000
).toISOString();





await supabase
.from("licenses")
.update({

active:true,
expires_at:fechaExpira,
device_id:null

})
.eq("id",data.id);





setKey(data.license_key);


localStorage.setItem(
"mi_key",
data.license_key
);


setRestante(EXPIRA_SEGUNDOS);



}catch(e){

console.error(e);
alert("No hay keys disponibles");


}finally{

setProcesando(false);

}


};






const copiar=async()=>{


await navigator.clipboard.writeText(key);

setCopiado(true);


setTimeout(()=>{
setCopiado(false);
},1500);


};





const reiniciar=()=>{


localStorage.removeItem("mi_key");

setKey("");

setCompletadas({});

setRestante(EXPIRA_SEGUNDOS);


};






return (

<div className="page">

<div className="card">


<h1>🔑 Generador de Key</h1>

<p>
Crea tu key gratis — rápido y seguro
</p>



{!key && (

<>

<h3>TAREAS DE VERIFICACIÓN</h3>


{TAREAS.map(t=>(

<button
key={t.id}
onClick={()=>marcarTarea(t)}
disabled={completadas[t.id]}
>

{t.label}

{completadas[t.id]?" ✓":" ○"}

</button>

))}



<button
onClick={generar}
disabled={!todasHechas || procesando}
>

{
procesando
?"⏳ Procesando..."
:"Generar Key"
}

</button>


</>

)}






{key && (

<div>


<h3>
Expira en
</h3>


<h2>
{formatoTiempo(restante)}
</h2>



<h3>
Tu Key de {DURACION_HORAS}H
</h3>


<div>
{key}
</div>



<button onClick={copiar}>

{
copiado
?"✓ Copiado"
:"Copiar Key"
}

</button>



<button onClick={reiniciar}>
Obtener nueva Key
</button>


</div>

)}



</div>

</div>

);


}