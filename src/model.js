export const SCHEMA_VERSION = 2;
export const RISK_STATUSES = ['Abierto', 'En tratamiento', 'Cerrado'];
export const CHECK_STATUSES = ['Pendiente', 'Aprobada', 'Fallida'];
export const TYPES = ['Riesgo', 'Problema actual'];
export const score = (r, residual = false) => residual ? r.residualP * r.residualI : r.p * r.i;
export const rating = n => n >= 16 ? ['Crítico', 'critical'] : n >= 10 ? ['Alto', 'high'] : n >= 5 ? ['Medio', 'mid'] : ['Bajo', 'low'];
export const compareRisks = (a, b) => score(b) - score(a) || b.i - a.i || b.p - a.p || a.id.localeCompare(b.id);
export const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
const isTimestamp = v => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const text = (v, max = 4000) => typeof v === 'string' && v.length <= max;
export function recordDefaults(kind) {
  const common = { title: '', area: '', updatedAt: '', history: [] };
  return kind === 'risks' ? { ...common, category: 'Operación', type: 'Riesgo', p: 3, i: 3, residualP: 3, residualI: 3, owner: '', role: '', consequence: '', action: '', contingency: '', dueDate: '', reviewDate: '', status: 'Abierto' } : { ...common, criteria: '', status: 'Pendiente', evidence: '', evidenceDate: '', risks: [] };
}
export function validateRecord(r, kind, enforce = false) {
  const errors = {};
  if (!r || typeof r !== 'object' || Array.isArray(r)) return { record: 'Registro inválido.' };
  if (typeof r.id !== 'string' || !(kind === 'risks' ? /^R-\d{2,}$/ : /^Q-\d{2,}$/).test(r.id) || !Number.isSafeInteger(Number(r.id.slice(2)))) errors.id = 'ID inválido.';
  for (const field of ['title', 'area', ...(kind === 'risks' ? ['category', 'type', 'owner', 'role', 'consequence', 'action', 'contingency'] : ['criteria', 'evidence'])]) if (!text(r[field])) errors[field] = 'Texto inválido o demasiado largo (máximo 4000).';
  for (const field of ['title', 'area', ...(kind === 'risks' ? ['category', 'consequence', 'action'] : ['criteria'])]) if (typeof r[field] !== 'string' || !r[field].trim()) errors[field] = 'Completa este campo.';
  if (!(kind === 'risks' ? RISK_STATUSES : CHECK_STATUSES).includes(r.status)) errors.status = 'Estado no permitido.';
  if (r.updatedAt !== '' && !isTimestamp(r.updatedAt)) errors.updatedAt = 'Fecha de actualización inválida.';
  if (!Array.isArray(r.history) || r.history.length > 10000 || r.history.some(h => !h || !isTimestamp(h.date) || !text(h.field, 100) || !text(h.before, 10000) || !text(h.after, 10000))) errors.history = 'Historial inválido.';
  if (kind === 'risks') {
    if (!TYPES.includes(r.type)) errors.type = 'Tipo no permitido.';
    for (const f of ['p', 'i', 'residualP', 'residualI']) if (!Number.isInteger(r[f]) || r[f] < 1 || r[f] > 5) errors[f] = 'Selecciona un entero entre 1 y 5.';
    for (const f of ['dueDate', 'reviewDate']) if (r[f] !== '' && !isDate(r[f])) errors[f] = 'Fecha inválida.';
    if (enforce && Math.max(score(r), score(r, true)) >= 10) {
      if (!text(r.owner) || !/^\p{L}[\p{L}\p{M}'’.-]*(?:\s+[\p{L}\p{M}'’.-]+)+$/u.test(r.owner.trim()) || /equipo|responsable|administraci[oó]n|sin asignar|coordinaci[oó]n/i.test(r.owner)) errors.owner = 'Alto y Crítico requieren nombre y apellido de una persona.';
      if (!isDate(r.dueDate)) errors.dueDate = 'Alto y Crítico requieren fecha límite de mitigación.';
    }
  } else {
    if (!Array.isArray(r.risks) || r.risks.some(id => typeof id !== 'string' || !/^R-\d{2,}$/.test(id)) || new Set(r.risks).size !== r.risks.length) errors.risks = 'Referencias a riesgos inválidas o repetidas.';
    if (r.evidenceDate !== '' && !isDate(r.evidenceDate)) errors.evidenceDate = 'Fecha de evidencia inválida.';
    if (enforce && r.status !== 'Pendiente') {
      if (!r.evidence?.trim()) errors.evidence = 'Registra evidencia para este resultado.';
      if (!isDate(r.evidenceDate)) errors.evidenceDate = 'Indica la fecha de la evidencia.';
    }
  }
  return errors;
}
export function validateState(s, enforce = false) {
  const errors = [];
  if (!s || s.schemaVersion !== SCHEMA_VERSION || !Array.isArray(s.risks) || !Array.isArray(s.checks)) return ['Estructura o versión de esquema no compatible.'];
  for (const key of ['revision', 'exportedRevision', 'risksCounter', 'checksCounter']) if (!Number.isSafeInteger(s[key]) || s[key] < 0) errors.push(`Metadato inválido: ${key}`);
  if (s.lastExportAt !== null && !isTimestamp(s.lastExportAt)) errors.push('Fecha de respaldo inválida.');
  if (s.updatedAt !== '' && !isTimestamp(s.updatedAt)) errors.push('Fecha del estado inválida.');
  for (const kind of ['risks', 'checks']) {
    const ids = new Set();
    for (const r of s[kind]) {
      for (const [field, error] of Object.entries(validateRecord(r, kind, enforce))) errors.push(`${r?.id ?? kind} · ${field}: ${error}`);
      if (ids.has(r?.id)) errors.push(`ID duplicado: ${r?.id}`);
      ids.add(r?.id);
    }
  }
  const riskIds = new Set(s.risks.map(r => r?.id));
  for (const q of s.checks) if (Array.isArray(q?.risks)) for (const id of q.risks) if (!riskIds.has(id)) errors.push(`${q.id}: riesgo inexistente ${id}`);
  return errors;
}
export function migrateState(raw) {
  const s = structuredClone(raw);
  if (!s || (s.schemaVersion !== undefined && ![1, 2].includes(s.schemaVersion))) throw new Error('Versión de datos no compatible.');
  if (!Array.isArray(s.risks) || !Array.isArray(s.checks)) throw new Error('Faltan riesgos o pruebas.');
  if (s.schemaVersion !== 2) {
    for (const kind of ['risks', 'checks']) s[kind] = s[kind].map(r => {
      if (!r || typeof r !== 'object') throw new Error('Registro corrupto.');
      return { ...recordDefaults(kind), ...(kind === 'risks' ? { category: r.area || 'Operación', residualP: r.p, residualI: r.i } : {}), ...r, ...(kind === 'risks' ? { role: r.owner || '', owner: '' } : {}) };
    });
    s.schemaVersion = 2; s.revision = 1; s.exportedRevision = 0; s.lastExportAt = null; s.updatedAt = '';
    for (const kind of ['risks', 'checks']) s[kind + 'Counter'] = Math.max(s[kind + 'Counter'] || 0, 0, ...s[kind].map(r => Number(String(r.id).slice(2)) || 0));
  }
  const errors = validateState(s);
  if (errors.length) throw new Error(errors.slice(0, 5).join('\n'));
  return s;
}
export function nextId(state, kind) {
  if (!['risks', 'checks'].includes(kind)) throw new Error('Tipo de registro inválido.');
  const n = Math.max(state[kind + 'Counter'], 0, ...state[kind].map(r => Number(r.id.slice(2)))) + 1;
  if (!Number.isSafeInteger(n)) throw new Error('Se agotó el rango de IDs.');
  state[kind + 'Counter'] = n;
  return `${kind === 'risks' ? 'R' : 'Q'}-${String(n).padStart(2, '0')}`;
}
export function withHistory(previous, values, date = new Date().toISOString()) {
  const history = [...(previous?.history || [])];
  for (const [field, value] of Object.entries(values)) {
    if (['history', 'updatedAt', 'id'].includes(field)) continue;
    const before = previous?.[field] ?? '';
    if (JSON.stringify(before) !== JSON.stringify(value)) history.push({ date, field, before: typeof before === 'string' ? before : JSON.stringify(before), after: typeof value === 'string' ? value : JSON.stringify(value) });
  }
  return { ...previous, ...values, updatedAt: date, history };
}
export function backupMessage(s, now = Date.now()) {
  if (!s.lastExportAt) return 'Todavía no hay un respaldo CSV. Exporta antes del piloto.';
  if (s.revision > s.exportedRevision) return 'Hay cambios sin exportar. Actualiza tu respaldo CSV.';
  if (now - Date.parse(s.lastExportAt) > 7 * 86400000) return 'Tu último respaldo tiene más de 7 días. Exporta una copia actualizada.';
  return '';
}
