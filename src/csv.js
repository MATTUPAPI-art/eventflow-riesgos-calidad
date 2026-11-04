import { validateState, withHistory } from './model.js';
export const COLUMNS = {
  risks: ['id','title','area','category','type','p','i','residualP','residualI','owner','role','status','consequence','action','contingency','dueDate','reviewDate','updatedAt','history'],
  checks: ['id','title','area','status','criteria','evidence','evidenceDate','risks','updatedAt','history']
};
const MARKERS = { risks: '# EVENTFLOW RISKS v2', checks: '# EVENTFLOW CHECKS v2' };
export function csvField(value) {
  let raw = String(value ?? '');
  if (/^(?:\s*[=+@-]|')/.test(raw)) raw = "'" + raw;
  return '"' + raw.replace(/"/g, '""') + '"';
}
const decode = value => /^'(?:\s*[=+@-]|')/.test(value) ? value.slice(1) : value;
export function exportCSV(state, delimiter = ';') {
  if (![',',';'].includes(delimiter)) throw new Error('Separador inválido.');
  const rows = [['# EVENTFLOW META v2'], ['risksCounter','checksCounter'], [state.risksCounter,state.checksCounter], []];
  for (const kind of ['risks', 'checks']) {
    rows.push([MARKERS[kind]], COLUMNS[kind]);
    for (const r of state[kind]) rows.push(COLUMNS[kind].map(k => Array.isArray(r[k]) ? JSON.stringify(r[k]) : r[k]));
    rows.push([]);
  }
  return '\ufeff' + rows.map(row => row.map(csvField).join(delimiter)).join('\r\n');
}
export function parseCSV(source, delimiter = ';') {
  if (![',',';'].includes(delimiter)) throw new Error('Separador inválido.');
  const text = source.replace(/^\ufeff/, '');
  const rows = []; let row = [], field = '', quoted = false, closed = false;
  function finishField() { row.push(field); field = ''; closed = false; }
  function finishRow() { finishField(); rows.push(row); row = []; }
  for (let n = 0; n < text.length; n++) {
    const c = text[n];
    if (quoted) {
      if (c === '"' && text[n + 1] === '"') { field += '"'; n++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === '"') {
      if (field || closed) throw new Error('Comillas CSV mal formadas.');
      quoted = true;
    } else if (c === delimiter) finishField();
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[n + 1] === '\n') n++; finishRow(); }
    else { if (closed) throw new Error('Contenido después de comillas de cierre.'); field += c; }
  }
  if (quoted) throw new Error('Hay comillas CSV sin cerrar.');
  if (field || row.length || closed) finishRow();
  return rows;
}
// Import merges by ID; it never removes records omitted from the file.
// Existing history is retained and the import is recorded as an ordinary edit.
export function previewImport(source, state, delimiter = ';') {
  const rows = parseCSV(source, delimiter), next = structuredClone(state);
  let importedCounters = null;
  if (rows[0]?.length === 1 && rows[0][0] === '# EVENTFLOW META v2') {
    if (JSON.stringify(rows[1]) !== JSON.stringify(['risksCounter','checksCounter']) || rows[2]?.length !== 2 || rows[2].some(n=>!/^\d+$/.test(n)||!Number.isSafeInteger(Number(n)))) throw new Error('Contadores CSV inválidos.');
    importedCounters = rows[2].map(Number); rows.splice(0,3);
  }
  let kind, header, sections = new Set(); const seen = new Set(); const changes = [];
  for (const row of rows) {
    if (row.every(value => value === '')) continue;
    const marker = Object.keys(MARKERS).find(k => row.length === 1 && row[0] === MARKERS[k]);
    if (marker) { if (kind && !header) throw new Error('Faltan encabezados de una sección.'); if (sections.has(marker)) throw new Error('Sección repetida.'); kind = marker; header = null; sections.add(kind); continue; }
    if (!kind) throw new Error('Usa el CSV v2 exportado por EventFlow, con sus dos secciones.');
    if (!header) {
      if (JSON.stringify(row) !== JSON.stringify(COLUMNS[kind])) throw new Error(`Columnas incorrectas en ${kind}. Revisa el separador.`);
      header = row; continue;
    }
    if (row.length !== header.length) throw new Error('Número de columnas incorrecto.');
    const r = Object.fromEntries(header.map((k,i) => [k, decode(row[i])]));
    for (const k of ['p','i','residualP','residualI']) if (k in r) r[k] = /^\d+$/.test(r[k]) ? Number(r[k]) : NaN;
    for (const k of ['risks','history']) if (k in r) { try { r[k] = JSON.parse(r[k]); } catch { throw new Error(`${r.id}: ${k} debe ser un array JSON.`); } }
    const key = `${kind}:${r.id}`;
    if (seen.has(key)) throw new Error(`ID duplicado en CSV: ${r.id}`); seen.add(key);
    // Validate the actual incoming history too, before replacing it for existing rows.
    const probe = { ...next, [kind]: [r], ...(kind === 'checks' ? { risks: next.risks } : { checks: [] }) };
    const validation = validateState(probe);
    // Cross references are validated after both sections, so checks can precede risks.
    const structural = validation.filter(e => !e.includes('riesgo inexistente'));
    if (structural.length) throw new Error(structural.slice(0,5).join('\n'));
    const index = next[kind].findIndex(item => item.id === r.id);
    const old = next[kind][index];
    const fields = COLUMNS[kind].filter(k => !['history','updatedAt'].includes(k));
    const changed = !old || fields.some(k => JSON.stringify(old[k]) !== JSON.stringify(r[k]));
    if (changed) {
      const updated = old ? withHistory(old, Object.fromEntries(fields.map(k => [k,r[k]]))) : r;
      if (index < 0) next[kind].push(updated); else next[kind][index] = updated;
      changes.push({ id: r.id, title: r.title, action: old ? 'Actualizar' : 'Agregar', kind });
    }
  }
  if (sections.size !== 2 || !header) throw new Error('Faltan las dos secciones de riesgos y pruebas.');
  const errors = validateState(next, true);
  if (errors.length) throw new Error(errors.slice(0,10).join('\n'));
  for (const [index,k] of ['risks','checks'].entries()) {
    const before = next[k+'Counter'];
    next[k+'Counter'] = Math.max(before,importedCounters?.[index]||0,...next[k].map(r=>Number(r.id.slice(2))));
    if(next[k+'Counter']>before) changes.push({id:k+'Counter',title:'Contador de identificadores',action:'Actualizar',kind:k});
  }
  return { state: next, changes };
}
