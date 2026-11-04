import { score, rating, compareRisks, normalize, esc, today, recordDefaults, validateRecord, nextId, withHistory, RISK_STATUSES, CHECK_STATUSES, TYPES, backupMessage } from './src/model.js';
import { createExampleState } from './src/seeds.js';
import { createStorage, createLocalStorageAdapter, STORAGE_KEY } from './src/storage.js';
import { exportCSV, previewImport } from './src/csv.js';

const $ = id => document.getElementById(id);
const storage = createStorage(createLocalStorageAdapter({ getItem: key => window.localStorage.getItem(key), setItem: (key,value) => window.localStorage.setItem(key,value) }));
let state, persisted = null, corrupt = false, memoryOnly = false, pendingExternal = false;
let cell = null, editing = null, focusBefore = null, preview = null, sort = { field: 'score', direction: -1 }, busy = false;
let toastTimer;
const filters = ['search','category','statusFilter','ownerFilter','level','typeFilter'];
const dateLabel = value => value ? new Date(value.length === 10 ? value+'T12:00:00' : value).toLocaleDateString('es-BO') : 'Sin fecha';
const fieldNames = {title:'Nombre',area:'Área',category:'Categoría',type:'Tipo',owner:'Persona responsable',role:'Rol',status:'Estado',p:'Probabilidad',i:'Impacto',residualP:'Probabilidad residual',residualI:'Impacto residual',consequence:'Consecuencia',action:'Mitigación',contingency:'Contingencia',dueDate:'Fecha límite',reviewDate:'Próxima revisión',criteria:'Criterio',evidence:'Evidencia',evidenceDate:'Fecha de evidencia',risks:'Riesgos vinculados'};
function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; toastTimer = setTimeout(() => $('toast').textContent = '', 5500); }
function notice(message, external = false) { $('storageNotice').hidden = !message; $('storageMessage').textContent = message; $('reloadExternal').hidden = !external; }
function showError(id, message) { $(id).textContent = message; $(id).hidden = !message; }
function download(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], {type}));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function initialize() {
  try { persisted = await storage.getState(); state = persisted || createExampleState(); }
  catch (error) { state = createExampleState(); corrupt = true; notice('No se pudieron cargar los datos guardados. Se muestra una vista de ejemplo sin sobrescribirlos. Descarga la copia guardada y usa «Restablecer datos de ejemplo» para recuperarte.\n'+error.message); }
  render();
}
async function commit(next, {dataChange = true, reset = false} = {}) {
  if (busy) return false;
  if (corrupt && !reset) { toast('Restablece los datos antes de editar. La copia guardada se conserva.'); return false; }
  busy = true;
  try {
    if (!reset) {
      const latest = await storage.getState();
      if (JSON.stringify(latest) !== JSON.stringify(persisted)) {
        pendingExternal = true; notice('Otra pestaña cambió los datos. Cierra el diálogo y carga los cambios antes de guardar. Copia tu texto si deseas conservarlo.', true);
        toast('No se guardó: hay cambios de otra pestaña.'); return false;
      }
    }
    if (dataChange) { next.revision = Math.max(state.revision,next.revision)+1; next.updatedAt = new Date().toISOString(); }
    await storage.saveState(next);
    state = next; persisted = structuredClone(next); corrupt = memoryOnly = pendingExternal = false;
    notice(''); render(); toast('Guardado en este navegador.'); return true;
  } catch (error) {
    if (!corrupt) { state = next; memoryOnly = true; render(); }
    notice('No se pudo guardar. Los cambios están solo en esta pestaña: cierra el editor y exporta un CSV antes de salir.\n'+error.message);
    toast('No se pudo guardar en el navegador.'); return false;
  } finally { busy = false; }
}
function renderMetrics() {
  const open = state.risks.filter(r=>r.status!=='Cerrado');
  const inherent = state.risks.reduce((sum,r)=>sum+score(r),0), residual = state.risks.reduce((sum,r)=>sum+score(r,true),0);
  const reduction = inherent ? Math.round((inherent-residual)/inherent*100) : 0;
  const metrics = [
    [state.risks.length,'Riesgos y problemas',`${state.risks.filter(r=>r.type==='Problema actual').length} problemas actuales`],
    [open.filter(r=>score(r)>=16).length,'Críticos sin cerrar','Prioridad inherente'],
    [open.filter(r=>!r.owner.trim()).length,'Sin responsable','Registros abiertos'],
    [open.filter(r=>r.reviewDate && r.reviewDate<today()).length,'Revisión vencida','Según fecha local'],
    [`${state.checks.filter(q=>q.status==='Aprobada').length}/${state.checks.length}`,'Pruebas aprobadas','Resultados registrados'],
    [state.risks.filter(r=>!state.checks.some(q=>q.risks.includes(r.id))).length,'Riesgos sin prueba','Vínculo de cobertura'],
    [`${reduction} %`,'Reducción estimada',`${inherent} → ${residual} puntos`]
  ];
  $('metrics').innerHTML = metrics.map(([n,label,detail],i)=>`<div class="metric ${i===1?'emphasis':''}"><strong>${n}</strong><span>${label}</span><small>${detail}</small></div>`).join('');
  $('metrics').setAttribute('aria-busy','false');
  $('asOf').textContent = `Actualizado · ${dateLabel(state.updatedAt)}`;
  $('backup').textContent = memoryOnly ? 'Cambios solo en memoria. Exporta antes de salir.' : backupMessage(state) || `Respaldo exportado · ${dateLabel(state.lastExportAt)}`;
}
function renderMatrix() {
  $('matrix').innerHTML = [false,true].map(residual=>{
    const mode=residual?'residual':'inherent';
    let html=`<div><h3 class="matrix-title">${residual?'02 · Residual':'01 · Inherente'}</h3><p class="matrix-axis">Probabilidad ↑</p><div class="matrix"><span>P/I</span>${[1,2,3,4,5].map(i=>`<span>${i}</span>`).join('')}`;
    for(let p=5;p>=1;p--) {
      html+=`<span>${p}</span>`;
      for(let i=1;i<=5;i++) {
        const matches=state.risks.filter(r=>(residual?r.residualP:r.p)===p&&(residual?r.residualI:r.i)===i);
        const [level,css]=rating(p*i), list=matches.map(r=>r.id+' '+r.title).join('; ');
        const symbol={Bajo:'B',Medio:'M',Alto:'A','Crítico':'!'}[level];
        const label=`${matches.length} ${symbol} · ${residual?'Residual':'Inherente'} · ${level} · Probabilidad ${p}, impacto ${i}: ${matches.length} registros${list?' · '+list:''}`;
        html+=`<button type="button" class="${css}" data-cell="${mode},${p},${i}" aria-label="${esc(label)}" title="${esc(label)}" aria-pressed="${cell?.mode===mode&&cell.p===p&&cell.i===i}">${matches.length} <small>${symbol}</small></button>`;
      }
    }
    return html+'</div><p class="matrix-axis">Impacto →</p></div>';
  }).join('');
}
function refreshOptions(id, values, label) {
  const selected=$(id).value;
  $(id).innerHTML=`<option value="">${label}</option>`+[...new Set(values)].sort((a,b)=>a.localeCompare(b,'es')).map(v=>`<option value="${esc(v)}">${esc(v==='_unassigned'?'Sin asignar':v)}</option>`).join('');
  $(id).value=[...$(id).options].some(option=>option.value===selected)?selected:'';
}
function renderRisks() {
  const query=normalize($('search').value.trim());
  const risks=state.risks.filter(r=>{
    const p=cell?.mode==='residual'?r.residualP:r.p, i=cell?.mode==='residual'?r.residualI:r.i;
    return (!cell||(p===cell.p&&i===cell.i))&&(!$('category').value||r.category===$('category').value)&&(!$('statusFilter').value||r.status===$('statusFilter').value)&&(!$('ownerFilter').value||(r.owner||'_unassigned')===$('ownerFilter').value)&&(!$('level').value||rating(score(r))[0]===$('level').value)&&(!$('typeFilter').value||r.type===$('typeFilter').value)&&normalize([r.id,r.title,r.area,r.owner,r.role].join(' ')).includes(query);
  }).sort((a,b)=>{
    if(sort.field==='score') return sort.direction===-1?compareRisks(a,b):compareRisks(b,a);
    return sort.direction*String(a[sort.field]).localeCompare(String(b[sort.field]),'es')||compareRisks(a,b);
  });
  $('riskCount').textContent=`${risks.length} / ${state.risks.length}`;
  $('rows').innerHTML=risks.map(r=>{
    const [level,css]=rating(score(r)), [residual,rcss]=rating(score(r,true));
    const covered=state.checks.filter(q=>q.risks.includes(r.id));
    return `<tr><td>${r.type==='Problema actual'?'<span class="kind-label">PROBLEMA ACTUAL</span><br>':''}<strong>${esc(r.title)}</strong><small>${esc(r.id)} · ${esc(r.category)} · ${esc(r.area)}</small><small>${covered.length?covered.map(q=>`<a href="#quality" data-open-check="${q.id}">${q.id}</a>`).join(' · '):'Sin prueba vinculada'}</small></td><td data-label="Exposición"><span class="pill ${css}">${level} · ${score(r)}</span><small>P ${r.p} × I ${r.i}</small><small>Residual <span class="pill ${rcss}">${residual} · ${score(r,true)}</span></small></td><td data-label="Responsable">${esc(r.owner||'Sin asignar')}<small>${esc(r.role||'Sin rol')}</small></td><td data-label="Estado">${esc(r.status)}</td><td data-label="Seguimiento">Límite · ${dateLabel(r.dueDate)}<small>Revisión · ${dateLabel(r.reviewDate)}${r.reviewDate&&r.reviewDate<today()&&r.status!=='Cerrado'?' · VENCIDA':''}</small><small>Actualizado · ${dateLabel(r.updatedAt)}</small></td><td><button type="button" data-edit-risk="${r.id}" aria-label="Editar ${esc(r.id)}: ${esc(r.title)}">Editar ↗</button></td></tr>`;
  }).join('')||'<tr><td colspan="6" class="empty">No hay registros que coincidan con los filtros.</td></tr>';
  for(const th of document.querySelectorAll('th[data-unused], th[aria-sort]')) { const active=th.querySelector('button')?.dataset.sort===sort.field; th.setAttribute('aria-sort',active?(sort.direction===1?'ascending':'descending'):'none'); }
  renderChips();
}
function renderChips() {
  const labels={search:'Búsqueda',category:'Categoría',statusFilter:'Estado',ownerFilter:'Responsable',level:'Prioridad inherente',typeFilter:'Tipo'};
  let html=filters.filter(id=>$(id).value).map(id=>`<button type="button" data-clear="${id}" aria-label="Quitar filtro ${labels[id]}">${labels[id]}: ${esc($(id).value==='_unassigned'?'Sin asignar':$(id).value)} ×</button>`).join('');
  if(cell) html+=`<button type="button" data-clear="cell">${cell.mode==='residual'?'Residual':'Inherente'} · P${cell.p} × I${cell.i} ×</button>`;
  if(html) html+='<button type="button" data-clear="all">Limpiar filtros</button>';
  $('activeFilters').innerHTML=html;
}
function renderChecks() {
  const approved=state.checks.filter(q=>q.status==='Aprobada').length;
  const failed=state.checks.filter(q=>q.status==='Fallida').length;
  const percent=state.checks.length?Math.round(approved/state.checks.length*100):0;
  $('qaProgress').innerHTML=`<div class="progress-heading"><strong>${percent} % aprobado</strong><span class="muted">${approved} aprobadas · ${failed} fallidas · ${state.checks.length-approved-failed} pendientes</span></div><progress aria-label="Porcentaje de pruebas aprobadas" max="100" value="${percent}"></progress>`;
  $('checks').innerHTML=CHECK_STATUSES.map(status=>{
    const checks=state.checks.filter(q=>q.status===status);
    return `<section class="kanban-column" aria-label="${status}"><h3>${status} <span>${checks.length}</span></h3>${checks.map(q=>`<article class="panel check"><p class="eyebrow">${esc(q.id)} · ${esc(q.area)}</p><h3>${esc(q.title)}</h3><p class="muted">${esc(q.criteria)}</p>${q.evidence?`<p class="evidence">${esc(q.evidence)}<small>Evidencia · ${dateLabel(q.evidenceDate)}</small></p>`:''}<div class="risk-links">${q.risks.map(id=>`<button type="button" class="risk-link" data-open-risk="${esc(id)}" aria-label="Abrir riesgo ${esc(id)}">↗ ${esc(id)}</button>`).join('')||'<span class="caption">Sin riesgos vinculados</span>'}</div><div class="checkfoot"><span class="pill ${status==='Aprobada'?'low':status==='Fallida'?'critical':'mid'}">${status}</span><button type="button" data-edit-check="${esc(q.id)}" aria-label="Evaluar ${esc(q.id)}">Evaluar</button></div><p class="caption">Actualizado · ${dateLabel(q.updatedAt)}</p></article>`).join('')||'<p class="empty">Todavía no hay pruebas en este estado.</p>'}</section>`;
  }).join('');
}
function render() {
  renderMetrics();renderMatrix();
  refreshOptions('category',state.risks.map(r=>r.category),'Toda categoría');
  refreshOptions('statusFilter',RISK_STATUSES,'Todo estado');
  refreshOptions('ownerFilter',state.risks.map(r=>r.owner||'_unassigned'),'Todo responsable');
  renderRisks();renderChecks();
}
function selectTab(qa) { $('risks').hidden=qa; $('quality').hidden=!qa; $('riskTab').setAttribute('aria-pressed',String(!qa)); $('qaTab').setAttribute('aria-pressed',String(qa)); }
const errorSlot=name=>`<span class="field-error" id="error-${name}"></span>`;
function input(label,name,value, {full=false,required=false,type='text'}={}) {
  return `<label class="${full?'full':''}">${label}${required?' *':''}<input name="${name}" type="${type}" value="${esc(value)}" ${type==='text'?'maxlength="4000"':''} ${required?'required':''} aria-describedby="error-${name}">${errorSlot(name)}</label>`;
}
function select(label,name,options,value) {
  return `<label>${label}<select name="${name}" aria-describedby="error-${name}">${options.map(o=>`<option value="${esc(o)}" ${String(o)===String(value)?'selected':''}>${esc(o)}</option>`).join('')}</select>${errorSlot(name)}</label>`;
}
function textarea(label,name,value,required=false) { return `<label class="full">${label}${required?' *':''}<textarea name="${name}" rows="3" maxlength="4000" ${required?'required':''} aria-describedby="error-${name}">${esc(value)}</textarea>${errorSlot(name)}</label>`; }
function openEditor(kind,id) {
  const record=state[kind].find(r=>r.id===id), r=record||recordDefaults(kind), risk=kind==='risks';
  editing={kind,id}; focusBefore=document.activeElement;
  $('dialogTitle').textContent=record?(risk?'Editar riesgo':'Evaluar prueba'):(risk?'Nuevo riesgo':'Nueva prueba');
  $('recordId').textContent=id||'NUEVO REGISTRO'; $('remove').hidden=!record; showError('formErrors','');
  let fields=input('Nombre','title',r.title,{full:true,required:true})+input('Área','area',r.area,{required:true});
  if(risk) {
    fields+=input('Categoría','category',r.category,{required:true})+select('Tipo','type',TYPES,r.type)+select('Estado','status',RISK_STATUSES,r.status)+input('Persona responsable (nombre y apellido)','owner',r.owner)+input('Rol responsable','role',r.role);
    fields+=`<fieldset><legend>Riesgo inherente · P × I</legend><div class="score-fields">${select('Probabilidad','p',[1,2,3,4,5],r.p)}${select('Impacto','i',[1,2,3,4,5],r.i)}</div></fieldset><fieldset><legend>Riesgo residual · P × I</legend><div class="score-fields">${select('Probabilidad residual','residualP',[1,2,3,4,5],r.residualP)}${select('Impacto residual','residualI',[1,2,3,4,5],r.residualI)}</div></fieldset>`;
    fields+=input('Fecha límite de mitigación','dueDate',r.dueDate,{type:'date'})+input('Próxima revisión','reviewDate',r.reviewDate,{type:'date'})+textarea('Consecuencia','consequence',r.consequence,true)+textarea('Medida de mitigación','action',r.action,true)+textarea('Plan de contingencia','contingency',r.contingency);
    fields+=`<p class="full caption">Pruebas que cubren este riesgo: ${state.checks.filter(q=>q.risks.includes(r.id)).map(q=>esc(q.id)+' · '+esc(q.title)).join('; ')||'Sin pruebas vinculadas. Vincula desde el editor de una prueba.'}</p>`;
  } else {
    fields+=select('Resultado','status',CHECK_STATUSES,r.status)+textarea('Criterio medible de aceptación','criteria',r.criteria,true)+textarea('Evidencia u observaciones','evidence',r.evidence)+input('Fecha de evidencia','evidenceDate',r.evidenceDate,{type:'date'});
    fields+=`<fieldset class="full"><legend>Riesgos que cubre</legend><div class="check-options">${state.risks.map(risk=>`<label><input type="checkbox" name="risks" value="${risk.id}" ${r.risks.includes(risk.id)?'checked':''}>${risk.id} · ${esc(risk.title)}</label>`).join('')}</div>${errorSlot('risks')}</fieldset>`;
  }
  $('fields').innerHTML=`<div class="formgrid">${fields}</div>`;
  $('history').innerHTML=`<p class="caption">Última actualización · ${dateLabel(r.updatedAt)}</p><details><summary>Historial de cambios (${r.history.length})</summary>${r.history.length?`<ul>${r.history.slice().reverse().map(h=>`<li>${esc(dateLabel(h.date))} · ${esc(fieldNames[h.field]||h.field)}: ${esc(h.before||'vacío')} → ${esc(h.after||'vacío')}</li>`).join('')}</ul>`:'<p class="caption">Sin cambios registrados desde la creación o migración.</p>'}</details>`;
  $('editor').showModal(); $('editForm').elements.title.focus();
}
function restoreFocus() {
  if(focusBefore?.isConnected) { focusBefore.focus(); return; }
  for(const name of ['editRisk','editCheck','openRisk','openCheck']) {
    const value=focusBefore?.dataset?.[name];
    if(value) { const attr=name.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()), target=document.querySelector(`[data-${attr}="${value}"]`); if(target) {target.focus();return;} }
  }
  ($('quality').hidden?$('addRisk'):$('addCheck')).focus();
}
function fieldErrors(errors) {
  for(const slot of $('fields').querySelectorAll('.field-error')) slot.textContent='';
  for(const field of $('fields').querySelectorAll('[aria-invalid]')) field.removeAttribute('aria-invalid');
  for(const [name,message] of Object.entries(errors)) { const field=$('editForm').elements.namedItem(name); if(field?.setAttribute) field.setAttribute('aria-invalid','true'); if($('error-'+name)) $('error-'+name).textContent=message; }
  showError('formErrors',Object.values(errors).join('\n'));
  const first=$('fields').querySelector('[aria-invalid=true]'); if(first) first.focus();
}
$('editForm').addEventListener('submit',async event=>{
  event.preventDefault(); if(!editing||busy) return;
  const {kind,id}=editing, next=structuredClone(state), previous=state[kind].find(r=>r.id===id);
  const data=new FormData(event.currentTarget), values=Object.fromEntries([...data].map(([k,v])=>[k,String(v).trim()]));
  if(kind==='risks') for(const f of ['p','i','residualP','residualI']) values[f]=Number(values[f]);
  else values.risks=data.getAll('risks');
  const record=withHistory(previous,{...recordDefaults(kind),...previous,...values,id:id||nextId(next,kind)});
  const errors=validateRecord(record,kind,true); fieldErrors(errors); if(Object.keys(errors).length) return;
  const index=next[kind].findIndex(r=>r.id===id); if(index<0) next[kind].push(record); else next[kind][index]=record;
  if(await commit(next)) $('editor').close(); else showError('formErrors','No se guardó en el navegador. Consulta el aviso de almacenamiento; los campos siguen disponibles.');
});
$('editForm').addEventListener('input',event=>{ event.target.removeAttribute('aria-invalid'); if($('error-'+event.target.name)) $('error-'+event.target.name).textContent=''; });
$('remove').onclick=async()=>{
  if(!editing||!confirm('¿Eliminar este registro? Se quitarán también sus vínculos. Exporta un respaldo si lo necesitas.')) return;
  const {kind,id}=editing,next=structuredClone(state); next[kind]=next[kind].filter(r=>r.id!==id);
  if(kind==='risks') next.checks=next.checks.map(q=>q.risks.includes(id)?withHistory(q,{risks:q.risks.filter(r=>r!==id)}):q);
  if(await commit(next)) $('editor').close();
};
$('close').onclick=()=>$('editor').close();
$('editor').addEventListener('close',()=>{ editing=null; restoreFocus(); });
for(const id of ['editor','importDialog']) $(id).addEventListener('keydown',event=>{
  if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)&&id==='editor') { event.preventDefault(); $('editForm').requestSubmit(); }
  if(event.key==='Tab') {
    const nodes=[...$(id).querySelectorAll('button,input,select,textarea,a[href],summary')].filter(n=>!n.disabled&&n.getClientRects().length);
    const first=nodes[0],last=nodes.at(-1);
    if(event.shiftKey&&document.activeElement===first) {event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last) {event.preventDefault();first.focus();}
  }
});
$('riskTab').onclick=()=>selectTab(false); $('qaTab').onclick=()=>selectTab(true);
$('addRisk').onclick=()=>openEditor('risks'); $('addCheck').onclick=()=>openEditor('checks');
for(const id of filters) $(id).addEventListener(id==='search'?'input':'change',renderRisks);
$('activeFilters').onclick=event=>{
  const button=event.target.closest('[data-clear]'); if(!button) return; const id=button.dataset.clear;
  if(id==='all') {filters.forEach(f=>$(f).value='');cell=null;} else if(id==='cell') cell=null; else $(id).value='';
  renderMatrix();renderRisks(); $('search').focus();
};
$('matrix').onclick=event=>{
  const button=event.target.closest('[data-cell]'); if(!button) return;
  const [mode,p,i]=button.dataset.cell.split(','), value={mode,p:Number(p),i:Number(i)};
  cell=JSON.stringify(cell)===JSON.stringify(value)?null:value; renderMatrix();renderRisks();
  $('matrix').querySelector(`[data-cell="${button.dataset.cell}"]`).focus();
};
document.querySelector('thead').onclick=event=>{const button=event.target.closest('[data-sort]');if(!button)return; sort={field:button.dataset.sort,direction:sort.field===button.dataset.sort?-sort.direction:1};renderRisks();};
document.addEventListener('click',event=>{
  const risk=event.target.closest('[data-edit-risk],[data-open-risk]'),check=event.target.closest('[data-edit-check],[data-open-check]');
  if(risk) {event.preventDefault();openEditor('risks',risk.dataset.editRisk||risk.dataset.openRisk);}
  else if(check) {event.preventDefault();openEditor('checks',check.dataset.editCheck||check.dataset.openCheck);}
});
$('export').onclick=async()=>{
  download(exportCSV(state,$('delimiter').value),`EventFlow_Respaldo_${today()}.csv`,'text/csv;charset=utf-8');
  if(corrupt) {toast('Se exportó la vista de ejemplo; los datos corruptos se conservan por separado.');return;}
  const next=structuredClone(state); next.lastExportAt=new Date().toISOString(); next.exportedRevision=next.revision;
  if(await commit(next,{dataChange:false})) toast('CSV generado con riesgos y pruebas. Comprueba la descarga.');
};
$('import').onclick=()=>{
  focusBefore=document.activeElement;preview=null;$('csvFile').value='';$('applyImport').disabled=true;$('importPreview').textContent='';showError('importError','');
  $('importSeparator').textContent=`Separador seleccionado: ${$('delimiter').value===';'?'punto y coma':'coma'}. Cambia CSV en la barra principal si tu archivo usa otro.`;
  $('importDialog').showModal();
};
let importRead=0;
$('csvFile').onchange=async()=>{
  const read=++importRead;preview=null;$('applyImport').disabled=true;$('importPreview').textContent='';showError('importError','');
  const file=$('csvFile').files[0];if(!file)return;
  try {
    if(file.size>2*1024*1024)throw new Error('El archivo supera 2 MB.');
    const text=await file.text();if(read!==importRead)return;
    preview=previewImport(text,state,$('delimiter').value);
    $('importPreview').innerHTML=`<p>${preview.changes.length} cambios propuestos. No se ha guardado nada.</p>`+(preview.changes.length?`<ul>${preview.changes.map(c=>`<li>${c.action} ${esc(c.id)} · ${esc(c.title)}</li>`).join('')}</ul>`:'<p class="muted">El archivo coincide con los datos actuales.</p>');
    $('applyImport').disabled=!preview.changes.length;
  } catch(error) {showError('importError',error.message);}
};
$('applyImport').onclick=async()=>{if(preview&&await commit(preview.state))$('importDialog').close();};
for(const id of ['closeImport','cancelImport'])$(id).onclick=()=>$('importDialog').close();
$('importDialog').addEventListener('close',()=>{preview=null;importRead++;restoreFocus();});
$('reset').onclick=async()=>{
  if(!confirm('¿Restablecer los datos de ejemplo? Se reemplazarán todos los registros locales. Exporta primero si quieres conservarlos.'))return;
  if(await commit(createExampleState(),{reset:true})) {cell=null;filters.forEach(id=>$(id).value='');render();}
};
$('downloadRaw').onclick=()=>{
  try{download(localStorage.getItem(STORAGE_KEY)||'null',`EventFlow_datos_guardados_${today()}.json`,'application/json');}catch(error){toast(error.message);}
};
async function syncExternal(force=false) {
  if(!force&&($('editor').open||$('importDialog').open||memoryOnly)) {pendingExternal=true;notice('Otra pestaña cambió los datos. Conserva tus campos y cierra el diálogo antes de cargar la nueva versión.',true);return;}
  try {persisted=await storage.getState();if(!persisted)throw new Error('Otra pestaña eliminó el almacenamiento. Restablece para continuar.');state=structuredClone(persisted);corrupt=memoryOnly=pendingExternal=false;notice('');render();toast('Datos sincronizados desde otra pestaña.');}
  catch(error){corrupt=true;notice('No se pudo cargar el cambio de otra pestaña. Tu vista actual se conserva. Descarga la copia guardada o restablece.\n'+error.message);}
}
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY||event.key===null)syncExternal();});
$('reloadExternal').onclick=()=>{if($('editor').open||$('importDialog').open){toast('Cierra primero el diálogo para conservar el control de tus cambios.');return;}if(memoryOnly&&!confirm('Hay cambios solo en memoria. ¿Descartarlos y cargar la otra pestaña? Exporta antes si los necesitas.'))return;syncExternal(true);};
window.addEventListener('beforeunload',event=>{if(memoryOnly){event.preventDefault();event.returnValue='';}});
const printDetails=[];
window.addEventListener('beforeprint',()=>{for(const d of document.querySelectorAll('.guide details')){printDetails.push([d,d.open]);d.open=true;}});
window.addEventListener('afterprint',()=>{for(const [d,open]of printDetails.splice(0))d.open=open;});
$('print').onclick=()=>window.print();
setInterval(()=>{if(state)renderMetrics();},60000);
await initialize();
