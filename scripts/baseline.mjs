import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4173');
  console.log(JSON.stringify({ title: await page.title(), risks: await page.locator('#rows tr').count(), cells: await page.locator('#matrix button').count(), remove: await page.locator('#remove').getAttribute('type'), close: await page.locator('#close').getAttribute('type') }));
  await page.locator('#rows button').first().click();
  await page.locator('#close').click();
  await page.locator('#qaTab').click();
  console.log(`Pruebas iniciales visibles: ${await page.locator('.check').count()}`);
} finally { await browser.close(); }
