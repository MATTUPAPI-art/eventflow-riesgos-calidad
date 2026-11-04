import test from 'node:test';
import assert from 'node:assert/strict';
import { createExampleState } from '../src/seeds.js';
import { validateState, score } from '../src/model.js';
test('22 escenarios y 22 pruebas válidas, cobertura total y sin resultados inventados',()=>{
  const s=createExampleState(new Date('2026-11-04T12:00:00Z'));
  assert.deepEqual(validateState(s,true),[]); assert.equal(s.risks.length,22); assert.equal(s.checks.length,22);
  assert.ok(s.risks.every(r=>s.checks.some(q=>q.risks.includes(r.id))));
  assert.deepEqual([...new Set(s.risks.map(r=>r.p))].sort(),[1,2,3,4,5]);
  assert.deepEqual([...new Set(s.risks.map(r=>r.i))].sort(),[1,2,3,4,5]);
  assert.ok(s.risks.every(r=>score(r)===score(r,true))); assert.ok(s.checks.every(q=>q.status==='Pendiente'));
  assert.equal(s.risks.filter(r=>r.type==='Problema actual').length,2);
});
