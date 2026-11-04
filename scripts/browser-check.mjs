import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
import { createExampleState } from '../src/seeds.js';
import { exportCSV } from '../src/csv.js';
const base=process.env.TEST_URL||'http://127.0.0.1:4173';
await mkdir('artifacts',{recursive:true}); await mkdir('docs',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'dark',reducedMotion:'reduce'});
const page=await context.newPage(), results=[], errors=[], external=[];
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message))); page.on('pageerror',e=>errors.push(e.message));
context.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('blob:'))external.push(r.url());});
const check=async(name,fn)=>{await fn(); results.push(name); console.log('PASS '+name);};
const saved=async(p=page)=>p.evaluate(()=>JSON.parse(localStorage.getItem('eventflow-control-v1')));
const closeEditor=()=>page.locator('#close').click();
const edit=async id=>{await page.locator(`[data-edit-risk="${id}"]`).click();};
const save=async()=>{await page.locator('#editForm button[type=submit]').click(); await page.waitForFunction(()=>!document.querySelector('#editor').open);};
try {
  await page.goto(base); await page.waitForSelector('#rows tr');
  await check('Carga: 22 riesgos, 22 pruebas, 50 celdas y 7 indicadores',async()=>{
    assert.equal(await page.locator('#rows tr').count(),22); assert.equal(await page.locator('.check').count(),22);assert.equal(await page.locator('[data-cell]').count(),50);assert.equal(await page.locator('.metric').count(),7);assert.match(await page.locator('.metric').last().innerText(),/0 %/);
  });
  await page.screenshot({path:'docs/screenshot.png',fullPage:true});
  await check('Filtros, chips, celda inherente/residual y orden por columna',async()=>{
    await page.locator('#search').fill('R-03');assert.equal(await page.locator('#rows tr').count(),1);await page.locator('[data-clear=all]').click();
    await page.locator('#category').selectOption('Privacidad');assert.ok(await page.locator('#rows tr').count()<22);await page.locator('#statusFilter').selectOption('Abierto');await page.locator('#ownerFilter').selectOption('Lucía Demo');await page.locator('#level').selectOption('Alto');assert.ok(await page.locator('[data-clear]').count()>=4);await page.locator('[data-clear=all]').click();
    await page.locator('#typeFilter').selectOption('Problema actual');assert.equal(await page.locator('#rows tr').count(),2);await page.locator('[data-clear=all]').click();
    for(const mode of ['inherent','residual']) {await page.locator(`[data-cell="${mode},4,5"]`).click();assert.equal(await page.locator('#rows tr').count(),1);assert.match(await page.locator('#rows').innerText(),/R-03/);await page.locator('[data-clear=cell]').click();}
    await page.locator('[data-sort=title]').click();assert.equal(await page.locator('[data-sort=title]').locator('..').getAttribute('aria-sort'),'ascending');await page.locator('[data-sort=title]').click();assert.equal(await page.locator('[data-sort=title]').locator('..').getAttribute('aria-sort'),'descending');
  });
  await check('Validación en línea y edición con historial, persistencia y foco devuelto',async()=>{
    await edit('R-03');await page.locator('[name=owner]').fill('Equipo web');await page.locator('[name=dueDate]').fill('');await page.locator('#editForm button[type=submit]').click();assert.equal(await page.locator('[name=owner]').getAttribute('aria-invalid'),'true');assert.match(await page.locator('#formErrors').innerText(),/fecha límite/);
    await page.locator('[name=owner]').fill('Elena Demo');await page.locator('[name=dueDate]').fill('2026-12-20');await page.locator('[name=residualP]').selectOption('2');await save();
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.editRisk),'R-03');
    const r=(await saved()).risks.find(r=>r.id==='R-03');assert.equal(r.owner,'Elena Demo');assert.ok(r.history.some(h=>h.field==='owner'&&h.after==='Elena Demo'));
    await page.reload();await edit('R-03');assert.equal(await page.locator('[name=owner]').inputValue(),'Elena Demo');await page.keyboard.press('Escape');assert.equal(await page.locator('#editor').evaluate(d=>d.open),false);
  });
  await check('Alta, Ctrl+Enter, texto escapado, foco atrapado, cierre sin submit y borrado sin recrear',async()=>{
    await page.locator('#addRisk').click();await page.locator('[name=title]').fill('<img src=x onerror=alert(1)>');await page.locator('[name=area]').fill('Piloto');await page.locator('[name=consequence]').fill('Demora');await page.locator('[name=action]').fill('Revisar');await page.locator('[name=p]').selectOption('1');await page.locator('[name=i]').selectOption('1');await page.locator('[name=residualP]').selectOption('1');await page.locator('[name=residualI]').selectOption('1');
    await page.locator('#close').focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.type),'submit');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'close');
    await page.keyboard.press('Control+Enter');await page.waitForFunction(()=>!document.querySelector('#editor').open);assert.equal((await saved()).risks.length,23);assert.equal(await page.locator('#rows img').count(),0);
    await edit('R-23');await page.locator('[name=title]').fill('No guardar');await closeEditor();assert.match((await saved()).risks.find(r=>r.id==='R-23').title,/<img/);
    await edit('R-23');page.once('dialog',d=>d.dismiss());await page.locator('#remove').click();assert.equal(await page.locator('#editor').evaluate(d=>d.open),true);
    page.once('dialog',d=>d.accept());await page.locator('#remove').click();await page.waitForFunction(()=>!document.querySelector('#editor').open);await page.reload();assert.equal((await saved()).risks.length,22);assert.equal((await saved()).risksCounter,23);
  });
  await check('Calidad: vínculo bidireccional, evidencia fechada y estados Aprobada/Fallida',async()=>{
    await page.locator('[data-open-check="Q-02"]').click();assert.match(await page.locator('#dialogTitle').innerText(),/Evaluar/);await page.locator('[name=status]').selectOption('Aprobada');await page.locator('#editForm button[type=submit]').click();assert.match(await page.locator('#formErrors').innerText(),/evidencia/);
    await page.locator('[name=evidence]').fill('Ejecución ficticia para comprobar la interfaz');await page.locator('[name=evidenceDate]').fill('2026-11-04');await save();await page.locator('#qaTab').click();assert.equal(await page.locator('section[aria-label="Aprobada"] .check').count(),1);
    await page.locator('[data-edit-check="Q-01"]').click();await page.locator('[name=status]').selectOption('Fallida');await page.locator('[name=evidence]').fill('Resultado ficticio: diferencia medida');await page.locator('[name=evidenceDate]').fill('2026-11-04');await save();assert.equal(await page.locator('section[aria-label="Fallida"] .check').count(),1);
    await page.locator('[data-open-risk="R-03"]').click();assert.equal(await page.locator('#recordId').innerText(),'R-03');await closeEditor();await page.locator('#riskTab').click();
  });
  await check('Exportación real con dos separadores; importación validada, vista previa y aplicación',async()=>{
    for(const sep of [';',',']) {
      await page.locator('#delimiter').selectOption(sep); const event=page.waitForEvent('download');await page.locator('#export').click();const download=await event;await download.saveAs(`artifacts/export-${sep===';'?'semicolon':'comma'}.csv`);
      const csv=await readFile(await download.path(),'utf8');assert.match(csv,/# EVENTFLOW RISKS v2/);assert.match(csv,/# EVENTFLOW CHECKS v2/);
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem('eventflow-control-v1')).lastExportAt!==null);
      await page.locator('#import').click();await page.locator('#csvFile').setInputFiles({name:'backup.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await page.waitForFunction(()=>document.querySelector('#importPreview').textContent.length>0);assert.match(await page.locator('#importPreview').innerText(),/0 cambios/);await page.locator('#cancelImport').click();
    }
    const incoming=await saved();incoming.risks[0].title='Nombre importado ficticio'; const csv=exportCSV(incoming,',');
    await page.locator('#import').click();await page.locator('#csvFile').setInputFiles({name:'bad.csv',mimeType:'text/csv',buffer:Buffer.from('"sin cierre')});await page.waitForSelector('#importError:not([hidden])');assert.equal(await page.locator('#applyImport').isDisabled(),true);
    await page.locator('#csvFile').setInputFiles({name:'good.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await page.waitForFunction(()=>!document.querySelector('#applyImport').disabled);assert.notEqual((await saved()).risks[0].title,'Nombre importado ficticio');await page.locator('#applyImport').click();await page.waitForFunction(()=>!document.querySelector('#importDialog').open);assert.equal((await saved()).risks[0].title,'Nombre importado ficticio');assert.match(await page.locator('#backup').innerText(),/cambios sin exportar/);
  });
  await check('Sincronización entre pestañas y protección del editor ante cambios externos',async()=>{
    const other=await context.newPage();await other.goto(base);await other.waitForSelector('#rows tr');
    await edit('R-01');await page.locator('[name=title]').fill('Actualización de pestaña');await save();await other.waitForFunction(()=>document.querySelector('#rows').textContent.includes('Actualización de pestaña'));
    await edit('R-01');await page.locator('[name=title]').fill('Edición pendiente local');
    await other.locator('[data-edit-risk="R-01"]').click();await other.locator('[name=title]').fill('Cambio externo conservado');await other.locator('#editForm button[type=submit]').click();await page.waitForSelector('#reloadExternal:not([hidden])');
    await page.locator('#editForm button[type=submit]').click();assert.equal(await page.locator('#editor').evaluate(d=>d.open),true);assert.equal((await saved()).risks[0].title,'Cambio externo conservado');await closeEditor();await page.locator('#reloadExternal').click();await page.waitForFunction(()=>document.querySelector('#rows').textContent.includes('Cambio externo conservado'));await other.close();
  });
  await check('Restablecer cancela o confirma y elimina vínculos al borrar un riesgo',async()=>{
    page.once('dialog',d=>d.dismiss());await page.locator('#reset').click();assert.equal((await saved()).risks[0].title,'Cambio externo conservado');
    await edit('R-03');page.once('dialog',d=>d.accept());await page.locator('#remove').click();await page.waitForFunction(()=>!document.querySelector('#editor').open);assert.ok((await saved()).checks.every(q=>!q.risks.includes('R-03')));assert.ok((await saved()).checks.find(q=>q.id==='Q-02').history.some(h=>h.field==='risks'));
    page.once('dialog',d=>d.accept());await page.locator('#reset').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('eventflow-control-v1')).risks.length===22);
  });
  await check('Responsive 320/390/768/1440 px, claro/oscuro, axe WCAG AA y PDF',async()=>{
    for(const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Desbordamiento a ${width}px`);
    }
    for(const colorScheme of ['dark','light']) {
      await page.emulateMedia({colorScheme});await page.setViewportSize({width:390,height:900});
      for(const qa of [false,true]) {
        await page.locator(qa?'#qaTab':'#riskTab').click();const report=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();assert.deepEqual(report.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
      }
      await page.locator('#addCheck').click();const dialogReport=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(dialogReport.violations.map(v=>v.id),[]);await closeEditor();
      await page.screenshot({path:`artifacts/mobile-${colorScheme}.png`,fullPage:true});
    }
    await page.setViewportSize({width:1440,height:1320});await page.emulateMedia({colorScheme:'dark'});await page.locator('#riskTab').click();await page.screenshot({path:'docs/screenshot.png'});
    await page.emulateMedia({media:'print'});assert.equal(await page.locator('#quality').isVisible(),true);assert.equal(await page.locator('#risks').isVisible(),true);await page.pdf({path:'artifacts/EventFlow.pdf',format:'A4',printBackground:true});await page.emulateMedia({media:'screen'});
  });
  await check('Datos corruptos no se sobrescriben; recuperación y almacenamiento bloqueado',async()=>{
    const c=await browser.newContext();await c.addInitScript(()=>localStorage.setItem('eventflow-control-v1','{corrupto'));const p=await c.newPage();await p.goto(base);await p.waitForSelector('#storageNotice:not([hidden])');assert.equal(await p.evaluate(()=>localStorage.getItem('eventflow-control-v1')),'{corrupto');await p.locator('#reset').click({noWaitAfter:true}).catch(()=>{}); // confirmation is dismissed by default
    p.once('dialog',d=>d.accept());await p.locator('#reset').click();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('eventflow-control-v1')).schemaVersion===2);await c.close();
    const denied=await browser.newContext();await denied.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));const dp=await denied.newPage();await dp.goto(base);await dp.waitForSelector('#rows tr');assert.equal(await dp.locator('#rows tr').count(),22);assert.match(await dp.locator('#storageMessage').innerText(),/No se pudieron cargar/);await denied.close();
  });
  await check('Migración v1 en navegador y fallo de cuota con respaldo de memoria',async()=>{
    const s=createExampleState(), legacy={risks:s.risks.map(({id,title,area,p,i,role,consequence,action,status})=>({id,title,area,p,i,owner:role,consequence,action,status})),checks:s.checks.map(({id,title,area,criteria,status,evidence})=>({id,title,area,criteria,status,evidence}))};
    const c=await browser.newContext();await c.addInitScript(data=>localStorage.setItem('eventflow-control-v1',JSON.stringify(data)),legacy);const p=await c.newPage();await p.goto(base);await p.waitForSelector('#rows tr');assert.equal(await p.locator('#rows tr').count(),22);await p.locator('[data-edit-risk="R-03"]').click();assert.equal(await p.locator('[name=owner]').inputValue(),'');assert.equal(await p.locator('[name=role]').inputValue(),'Desarrollador de seguridad');await p.locator('#close').click();
    await p.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('QuotaExceeded','QuotaExceededError');};});p.once('dialog',d=>d.accept());await p.locator('#reset').click();await p.waitForSelector('#storageNotice:not([hidden])');assert.match(await p.locator('#storageMessage').innerText(),/solo en esta pestaña/);await c.close();
  });
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log(`${results.length} flujos verificados; sin errores JS ni solicitudes externas.`);
} catch(error) {await page.screenshot({path:'artifacts/failure.png',fullPage:true}).catch(()=>{});throw error;}
finally {await writeFile('artifacts/browser-results.json',JSON.stringify({results,errors,external},null,2));await browser.close();}
