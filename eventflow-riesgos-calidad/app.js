"use strict";
const riskSeed = [
 ["Medidas imprecisas a partir de fotos","IA y montaje",4,5,"Equipo de IA","El mobiliario podría no caber en el espacio disponible.","Medir el salón y el mobiliario. Usar las fotos como referencia y permitir editar el plano."],
 ["Salidas o pasillos obstruidos","Seguridad física",4,5,"Responsable del recinto","El montaje puede dificultar el acceso o la evacuación.","Marcar áreas restringidas, validar el plano y obtener aprobación antes del montaje."],
 ["Acceso indebido a otro evento","Seguridad digital",4,5,"Equipo backend","Un usuario podría leer o modificar datos de otro evento.","Restringir acceso por rol y evento en Firestore. Probar con dos cuentas de eventos distintos."],
 ["Exposición de fotos y datos personales","Privacidad",4,5,"Administración","Podrían exponerse listas o imágenes de invitados, incluidos menores.","Reducir datos recopilados, restringir accesos y definir plazos de eliminación."],
 ["Caída de internet durante el evento","Operación móvil",4,3,"Equipo móvil","El personal pierde acceso al registro o al inventario.","Precargar datos, guardar movimientos pendientes y sincronizar tras la reconexión."],
 ["Registro duplicado de invitados","Check-in",4,3,"Equipo backend","Dos celulares registran la misma llegada y alteran el conteo.","Usar un identificador único por invitación y conciliar duplicados tras la sincronización."],
 ["Errores de escaneo de inventario","Inventario",4,3,"Jefe de inventario","Se registran artículos dos veces o se confunden entregas y devoluciones.","Registrar tipo de movimiento, hora y responsable. Permitir búsqueda por código."],
 ["Plano desactualizado en el móvil","Montaje",4,3,"Coordinación del evento","El personal monta el recinto con una versión anterior.","Versionar planos aprobados y notificar al equipo cuando cambien."],
 ["Asignación inadecuada de invitados","IA y montaje",4,3,"Organizador","Se separan grupos familiares o se asignan lugares poco accesibles.","Fijar grupos, cupos y necesidades de acceso. Permitir correcciones manuales."],
 ["Servicio de IA lento, caído o costoso","IA y montaje",4,3,"Equipo de IA","Un ajuste de última hora retrasa el montaje.","Guardar la última versión aprobada, habilitar edición manual y limitar el uso por evento."],
 ["Saturación durante la llegada","Check-in",4,3,"Coordinación del evento","Los registros simultáneos producen demoras y filas.","Simular la hora pico y medir los tiempos de registro con varios operadores."],
 ["Panel conectado a datos de ejemplo","Integración",5,3,"Equipo web","La interfaz muestra métricas, pero el flujo puede no guardar datos reales.","Completar un flujo entre web, base de datos y móvil y comprobar persistencia."],
 ["Alcance excesivo para la primera entrega","Proyecto",5,3,"Líder del proyecto","Las funciones esenciales podrían quedar a medias.","Hacer un piloto en un recinto y priorizar registro, inventario y plano verificable."],
 ["Falla de un celular o de su cámara","Operación móvil",3,2,"Personal de campo","Un punto de acceso deja de registrar llegadas.","Probar los equipos, preparar un celular de respaldo y habilitar búsqueda manual."]
];
const checkSeed = [
 ["Validar plano y circulación","IA y montaje","Comparar el plano con las medidas reales. El responsable del recinto confirma que las salidas y áreas restringidas quedan libres."],
 ["Aislar los datos por evento","Seguridad digital","Con dos cuentas de eventos distintos, comprobar que ninguna pueda leer o modificar datos de la otra."],
 ["Proteger fotos y listas de invitados","Privacidad","Verificar que una cuenta sin permisos no pueda abrir una fotografía o consultar una lista privada."],
 ["Registrar sin internet y sincronizar","Operación móvil","Activar modo avión, registrar una llegada y un movimiento, volver a conectar y verificar ambos registros en el sistema."],
 ["Evitar doble registro","Check-in","Registrar el mismo invitado desde dos celulares y verificar que el conteo final aumente solo una vez."],
 ["Conciliar inventario","Inventario","Registrar una entrega y una devolución. Comparar el saldo del sistema con el conteo físico."],
 ["Publicar un plano actualizado","Montaje","Publicar una nueva versión y verificar que el móvil muestre la versión aprobada y avise del cambio."],
 ["Verificar el flujo web → móvil → reporte","Integración","Crear un evento desde la web, registrar una llegada desde el móvil y comprobar que persista y aparezca en el reporte."],
 ["Ensayar la hora pico","Check-in","Simular 30 llegadas con dos celulares. Como meta inicial, al menos 27 se registran en cinco segundos o menos, sin duplicados."]
];
const key = "eventflow-control-v1";
const initial = {
 risks: riskSeed.map(([title,area,p,i,owner,consequence,action],n)=>({id:"R-"+String(n+1).padStart(2,"0"),title,area,p,i,owner,consequence,action,status:"Abierto"})),
 checks: checkSeed.map(([title,area,criteria],n)=>({id:"Q-"+String(n+1).padStart(2,"0"),title,area,criteria,status:"Pendiente",evidence:""}))
};
function readState(){
 try { const saved=JSON.parse(localStorage.getItem(key)); if(Array.isArray(saved?.risks)&&Array.isArray(saved?.checks)) return saved; }
 catch {}
 return initial;
}
const state=readState();
const $=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const normalize=value=>String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const score=r=>r.p*r.i;
const rating=n=>n>=16?["Crítico","critical"]:n>=10?["Alto","high"]:n>=5?["Medio","mid"]:["Bajo","low"];
let cell=null;
let editing=null;
let toastTimer;
function persist(){
 clearTimeout(toastTimer);
 try { localStorage.setItem(key,JSON.stringify(state)); $("toast").textContent="Cambios guardados en este navegador."; }
 catch { $("toast").textContent="No se pudo guardar en el navegador. Exporta el CSV."; }
 toastTimer=setTimeout(()=>{$("toast").textContent="";},3800);
}
function renderMetrics(){
 const open=state.risks.filter(r=>r.status!=="Cerrado");
 const approved=state.checks.filter(q=>q.status==="Aprobada").length;
 $("metrics").innerHTML=[[state.risks.length,"Riesgos registrados"],[open.filter(r=>score(r)>=16).length,"Críticos sin cerrar"],[open.length,"Riesgos sin cerrar"],[approved+" / "+state.checks.length,"Pruebas aprobadas"]].map(([n,label])=>'<div class="metric"><strong>'+n+'</strong><span>'+label+'</span></div>').join("");
}
function renderMatrix(){
 let html='<div class="matrix"><span title="Probabilidad / impacto">P/I</span>';
 for(let i=1;i<=5;i++) html+="<span>"+i+"</span>";
 for(let p=5;p>=1;p--){
  html+="<span>"+p+"</span>";
  for(let i=1;i<=5;i++){
   const count=state.risks.filter(r=>r.p===p&&r.i===i).length;
   const label="Probabilidad "+p+", impacto "+i+": "+count+" riesgos";
   html+='<button class="'+rating(p*i)[1]+'" data-cell="'+p+','+i+'" aria-label="'+label+'" title="'+label+'" aria-pressed="'+(cell?.[0]===p&&cell?.[1]===i)+'">'+count+'</button>';
  }
 }
 $("matrix").innerHTML=html+"</div>";
 $("clearCell").hidden=!cell;
 if(cell) $("clearCell").textContent="P "+cell[0]+" × I "+cell[1]+" ×";
}
function renderRisks(){
 const query=normalize($("search").value.trim());
 const selected=$("level").value;
 const risks=state.risks.filter(r=>(!cell||(r.p===cell[0]&&r.i===cell[1]))&&(!selected||rating(score(r))[0]===selected)&&normalize([r.id,r.title,r.area,r.owner].join(" ")).includes(query)).sort((a,b)=>score(b)-score(a));
 $("rows").innerHTML=risks.map(r=>{
  const [label,style]=rating(score(r));
  return '<tr><td><strong>'+esc(r.title)+'</strong><small>'+esc(r.id)+' · '+esc(r.area)+'</small></td><td><span class="pill '+style+'">'+label+' · '+score(r)+'</span><small>P '+r.p+' × I '+r.i+'</small></td><td>'+esc(r.owner||"Sin asignar")+'</td><td>'+esc(r.status)+'</td><td><button data-edit-risk="'+esc(r.id)+'" aria-label="Editar '+esc(r.title)+'">Editar</button></td></tr>';
 }).join("")||'<tr><td colspan="5">No hay riesgos que coincidan con los filtros.</td></tr>';
}
function renderChecks(){
 const total=state.checks.length;
 const approved=state.checks.filter(q=>q.status==="Aprobada").length;
 const failed=state.checks.filter(q=>q.status==="Fallida").length;
 const percent=total?Math.round(approved/total*100):0;
 $("qaProgress").innerHTML='<strong>'+percent+' % aprobado</strong><p class="muted">'+approved+' aprobadas · '+failed+' fallidas · '+(total-approved-failed)+' pendientes</p><progress aria-label="Porcentaje de pruebas aprobadas" max="100" value="'+percent+'"></progress>';
 $("checks").innerHTML=state.checks.map(q=>'<article class="panel check"><p class="eyebrow">'+esc(q.id)+' · '+esc(q.area)+'</p><h3>'+esc(q.title)+'</h3><p class="muted">'+esc(q.criteria)+'</p>'+(q.evidence?'<p class="muted"><strong>Evidencia:</strong> '+esc(q.evidence)+'</p>':'')+'<div class="sectionhead"><span class="pill '+(q.status==="Aprobada"?"low":q.status==="Fallida"?"critical":"mid")+'">'+esc(q.status)+'</span><button data-edit-check="'+esc(q.id)+'" aria-label="Evaluar '+esc(q.title)+'">Evaluar</button></div></article>').join("")||'<p class="muted">Agrega una prueba para empezar.</p>';
}
function render(){renderMetrics();renderMatrix();renderRisks();renderChecks();}
function selectTab(qa){
 $("risks").hidden=qa;
 $("quality").hidden=!qa;
 $("riskTab").setAttribute("aria-pressed",!qa);
 $("qaTab").setAttribute("aria-pressed",qa);
}
const riskStatuses=["Abierto","En tratamiento","Cerrado"];
const checkStatuses=["Pendiente","Aprobada","Fallida"];
function input(label,name,value,full=false,required=false){
 return '<label'+(full?' class="full"':'')+'>'+label+'<input name="'+name+'" value="'+esc(value)+'" maxlength="120"'+(required?' required':'')+'></label>';
}
function select(label,name,options,value){
 return '<label>'+label+'<select name="'+name+'">'+options.map(o=>'<option'+(String(o)===String(value)?' selected':'')+'>'+o+'</option>').join("")+'</select></label>';
}
function area(label,name,value,required=false){
 return '<label class="full">'+label+'<textarea name="'+name+'" rows="3" maxlength="700"'+(required?' required':'')+'>'+esc(value)+'</textarea></label>';
}
function openEditor(kind,id){
 const record=state[kind].find(item=>item.id===id);
 editing={kind,id};
 const r=record||{};
 const isRisk=kind==="risks";
 $("dialogTitle").textContent=record?(isRisk?"Editar riesgo":"Evaluar prueba"):(isRisk?"Nuevo riesgo":"Nueva prueba");
 $("remove").hidden=!record;
 let fields=input("Nombre","title",r.title,true,true)+input("Área","area",r.area,false,true);
 if(isRisk){
  fields+=input("Responsable","owner",r.owner)+select("Probabilidad","p",[1,2,3,4,5],r.p??3)+select("Impacto","i",[1,2,3,4,5],r.i??3)+select("Estado","status",riskStatuses,r.status??"Abierto")+area("Consecuencia","consequence",r.consequence,true)+area("Medida de mitigación","action",r.action,true);
 }else{
  fields+=select("Resultado","status",checkStatuses,r.status??"Pendiente")+area("Criterio de aceptación","criteria",r.criteria,true)+area("Evidencia u observaciones","evidence",r.evidence);
 }
 $("fields").innerHTML='<div class="formgrid">'+fields+'</div>';
 $("editor").showModal();
}
function nextId(kind){
 const prefix=kind==="risks"?"R-":"Q-";
 const greatest=Math.max(state[kind+"Counter"]||0,...state[kind].map(item=>Number(item.id.slice(2))||0));
 state[kind+"Counter"]=greatest+1;
 return prefix+String(greatest+1).padStart(2,"0");
}
$("editForm").addEventListener("submit",event=>{
 event.preventDefault();
 const form=event.currentTarget;
 for(const field of form.querySelectorAll("[required]")) {
  if(!field.value.trim()){ field.setCustomValidity("Completa este campo."); field.reportValidity(); return; }
 }
 const values=Object.fromEntries(Array.from(new FormData(form),([name,value])=>[name,value.trim()]));
 const {kind,id}=editing;
 if(kind==="risks"){values.p=Number(values.p);values.i=Number(values.i);}
 if(kind==="checks"&&values.status!=="Pendiente"&&!values.evidence){
  const evidence=form.elements.evidence;
  evidence.setCustomValidity("Registra una evidencia para este resultado.");
  evidence.reportValidity();
  return;
 }
 const index=state[kind].findIndex(item=>item.id===id);
 if(index>=0) state[kind][index]={id,...values};
 else state[kind].push({id:nextId(kind),...values});
 $("editor").close();persist();render();
});
$("editForm").addEventListener("input",event=>event.target.setCustomValidity?.(""));
$("editForm").addEventListener("change",event=>{
 if(event.target.name==="status") event.currentTarget.elements.evidence?.setCustomValidity("");
});
$("remove").onclick=()=>{
 if(!confirm("¿Eliminar este registro?"))return;
 const {kind,id}=editing;
 state[kind]=state[kind].filter(item=>item.id!==id);
 $("editor").close();persist();render();
};
$("close").onclick=()=>$("editor").close();
$("riskTab").onclick=()=>selectTab(false);
$("qaTab").onclick=()=>selectTab(true);
$("addRisk").onclick=()=>openEditor("risks");
$("addCheck").onclick=()=>openEditor("checks");
$("search").oninput=renderRisks;
$("level").onchange=renderRisks;
$("clearCell").onclick=()=>{cell=null;renderMatrix();renderRisks();};
$("matrix").onclick=event=>{
 const button=event.target.closest("[data-cell]");
 if(!button)return;
 const [p,i]=button.dataset.cell.split(",").map(Number);
 cell=cell?.[0]===p&&cell?.[1]===i?null:[p,i];
 renderMatrix();renderRisks();
 $("matrix").querySelector('[data-cell="'+p+','+i+'"]').focus();
};
$("rows").onclick=event=>{
 const button=event.target.closest("[data-edit-risk]");
 if(button)openEditor("risks",button.dataset.editRisk);
};
$("checks").onclick=event=>{
 const button=event.target.closest("[data-edit-check]");
 if(button)openEditor("checks",button.dataset.editCheck);
};
function csvField(value){
 const raw=String(value??"");
 const safe=/^[\s]*[=+@-]/.test(raw)?"'"+raw:raw;
 return '"'+safe.replace(/"/g,'""')+'"';
}
$("export").onclick=()=>{
 const lines=[
  ["Tipo","ID","Nombre","Área","Probabilidad","Impacto","Puntaje","Prioridad","Responsable","Estado","Consecuencia o criterio","Mitigación o evidencia"],
  ...state.risks.map(r=>["Riesgo",r.id,r.title,r.area,r.p,r.i,score(r),rating(score(r))[0],r.owner,r.status,r.consequence,r.action]),
  ...state.checks.map(q=>["Prueba",q.id,q.title,q.area,"","","","","",q.status,q.criteria,q.evidence])
 ];
 const blob=new Blob(["\ufeff",lines.map(row=>row.map(csvField).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 const link=document.createElement("a");
 link.href=url;link.download="EventFlow_Riesgos_y_Calidad.csv";link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
};
render();
