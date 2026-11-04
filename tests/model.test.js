import test from 'node:test';
import assert from 'node:assert/strict';
import { score, rating, compareRisks, migrateState, validateState, validateRecord, recordDefaults, nextId, withHistory, backupMessage, isDate } from '../src/model.js';
import { createLocalStorageAdapter } from '../src/storage.js';
import { createFirestoreAdapter } from '../src/firestore-adapter.js';
import { csvField, parseCSV, exportCSV, previewImport } from '../src/csv.js';
const risk = () => ({...recordDefaults('risks'), id:'R-01',title:'Prueba',area:'Piloto',consequence:'Consecuencia',action:'Mitigar'});
const fixture = () => ({schemaVersion:2,risks:[risk()],checks:[],revision:1,exportedRevision:0,lastExportAt:null,updatedAt:'',risksCounter:1,checksCounter:0});
test('los 25 productos y sus límites de prioridad', () => {
  for(let p=1;p<=5;p++) for(let i=1;i<=5;i++) assert.equal(score({p,i}),p*i);
  assert.deepEqual([1,4,5,9,10,15,16,25].map(n=>rating(n)[0]),['Bajo','Bajo','Medio','Medio','Alto','Alto','Crítico','Crítico']);
  assert.equal(score({residualP:2,residualI:3},true),6);
});
test('desempata producto con impacto, probabilidad e ID estable', () => {
  assert.ok(compareRisks({id:'R-01',p:3,i:4},{id:'R-02',p:4,i:3})<0);
});
test('migra v1 sin inventar persona ni reducción y conserva contadores', () => {
  const r = risk(); delete r.residualP; delete r.residualI;
  const old={risks:[{...r,p:4,i:3,owner:'Equipo móvil'}],checks:[],risksCounter:50};
  const migrated=migrateState(old);
  assert.equal(migrated.schemaVersion,2); assert.equal(migrated.risks[0].owner,''); assert.equal(migrated.risks[0].role,'Equipo móvil'); assert.equal(score(migrated.risks[0],true),12); assert.equal(migrated.risksCounter,50);
  assert.deepEqual(migrateState(migrated),migrated); assert.equal(old.schemaVersion,undefined);
});
test('rechaza ID, números fuera de rango, estado, fechas y referencias', () => {
  for(const patch of [{id:1},{p:'3'},{i:6},{p:1.5},{status:'Otro'},{reviewDate:'2026-02-30'},{history:[{}]}]) assert.ok(Object.keys(validateRecord({...risk(),...patch},'risks')).length);
  assert.equal(isDate('2024-02-29'),true); assert.equal(isDate('2025-02-29'),false);
  const s=fixture(); s.checks=[{...recordDefaults('checks'),id:'Q-01',title:'Test',area:'QA',criteria:'Medir',risks:['R-99']}]; assert.ok(validateState(s).length);
  assert.throws(()=>migrateState({schemaVersion:99,risks:[],checks:[]}));
});
test('altos requieren persona y fecha; resultados requieren evidencia fechada', () => {
  const r={...risk(),p:4,i:5,owner:'Equipo web'};
  assert.ok(validateRecord(r,'risks',true).owner); assert.ok(validateRecord(r,'risks',true).dueDate);
  assert.deepEqual(validateRecord({...r,owner:'Lucía Demo',dueDate:'2026-11-20'},'risks',true),{});
  assert.ok(validateRecord({...risk(),type:'Problema actual'},'risks',true).p);
  const q={...recordDefaults('checks'),id:'Q-01',title:'Test',area:'QA',criteria:'Medir',status:'Aprobada'};
  assert.ok(validateRecord(q,'checks',true).evidence); assert.ok(validateRecord(q,'checks',true).evidenceDate);
});
test('IDs no se reutilizan tras borrar o importar y admiten más de 99', () => {
  const s=fixture(); s.risksCounter=99; assert.equal(nextId(s,'risks'),'R-100'); s.risks=[]; assert.equal(nextId(s,'risks'),'R-101'); s.risks=[{...risk(),id:'R-300'}]; assert.equal(nextId(s,'risks'),'R-301');
});
test('historial contiene fecha, campo, anterior y nuevo; no cambia el original', () => {
  const r=risk(), changed=withHistory(r,{owner:'Ana Demo'},'2026-11-04T12:00:00Z');
  assert.deepEqual(changed.history,[{date:'2026-11-04T12:00:00Z',field:'owner',before:'',after:'Ana Demo'}]); assert.equal(r.history.length,0);
});
test('recordatorio por cambios y por más de siete días', () => {
  const s=fixture(); assert.match(backupMessage(s),/Todavía/); s.lastExportAt='2026-11-01T00:00:00Z'; assert.match(backupMessage(s),/cambios/); s.exportedRevision=1; assert.equal(backupMessage(s,Date.parse('2026-11-07T00:00:00Z')),''); assert.match(backupMessage(s,Date.parse('2026-11-09T00:00:00Z')),/7 días/);
});
test('almacenamiento conserva datos, propaga corrupción y cuota excedida', async () => {
  const map=new Map(), adapter=createLocalStorageAdapter({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)});
  assert.equal(await adapter.getState(),null); await adapter.saveState(fixture()); assert.deepEqual(await adapter.getState(),fixture()); map.set('eventflow-control-v1','{'); await assert.rejects(adapter.getState());
  await assert.rejects(createLocalStorageAdapter({setItem(){throw Error('QuotaExceeded')}}).saveState(fixture()),/Quota/);
});
test('adaptador Firestore inactivo respeta contrato con SDK simulado', async () => {
  let saved; const adapter=createFirestoreAdapter({reference:'demo',getDoc:async()=>({exists:()=>!!saved,data:()=>saved}),setDoc:async(ref,s)=>{assert.equal(ref,'demo');saved=s;}});
  assert.equal(await adapter.getState(),null); await adapter.saveState(fixture()); assert.deepEqual(await adapter.getState(),fixture());
});
test('CSV escapa comillas, saltos, separadores y fórmulas; ida y vuelta sin pérdida', () => {
  assert.equal(csvField('a"b'),'"a""b"'); assert.equal(csvField(' =1'),'"\' =1"');
  for(const sep of [',',';']) {
    const s=fixture(); s.risks[0].title='=SUM(1;2), "demo"\nsegunda línea'; s.risks[0].consequence="'texto";
    const csv=exportCSV(s,sep), blank=fixture(); blank.risks=[];
    assert.deepEqual(previewImport(csv,blank,sep).state.risks,s.risks);
    assert.equal(previewImport(csv,s,sep).changes.length,0);
  }
});
test('CSV rechaza comillas, encabezados, duplicados y puntajes corruptos', () => {
  assert.throws(()=>parseCSV('"sin cierre')); assert.throws(()=>parseCSV('"a"b'));
  const s=fixture(), csv=exportCSV(s); assert.throws(()=>previewImport(csv,s,',')); assert.throws(()=>previewImport(csv.replace('"p"','"prob"'),s));
  const rows=csv.split('\r\n'); const position=rows.findIndex(row=>row.startsWith('"R-01"')); rows.splice(position+1,0,rows[position]); assert.throws(()=>previewImport(rows.join('\r\n'),s),/duplicado/);
  assert.throws(()=>previewImport(csv.replace('"3";"3"','"8";"3"'),s));
});
test('CSV preserva contadores aunque el último ID se haya eliminado',()=>{
  const s=fixture();s.risksCounter=100;s.checksCounter=30;
  const restored=previewImport(exportCSV(s),fixture()).state;
  assert.equal(nextId(restored,'risks'),'R-101');assert.equal(nextId(restored,'checks'),'Q-31');
  assert.throws(()=>previewImport('"# EVENTFLOW RISKS v2"\n"# EVENTFLOW CHECKS v2"\n'+exportCSV(s).split('"# EVENTFLOW CHECKS v2"')[1],fixture()),/encabezados/);
});
