import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1320},colorScheme:'dark'});
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173');await page.waitForSelector('[data-cell]');
  await page.screenshot({path:'docs/screenshot.png'});
  for(const colorScheme of ['dark','light']) {
    await page.setViewportSize({width:390,height:900});await page.emulateMedia({colorScheme});await page.screenshot({path:`artifacts/overview-mobile-${colorScheme}.png`});
  }
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({media:'print'});await page.screenshot({path:'artifacts/print-preview.png'});
} finally {await browser.close();}
