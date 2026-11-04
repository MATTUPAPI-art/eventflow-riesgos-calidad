import { mkdir, writeFile } from 'node:fs/promises';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
await mkdir('artifacts',{recursive:true});
const chrome=await launch({chromeFlags:['--headless','--disable-gpu','--no-first-run'],chromePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
  const result=await lighthouse(process.env.TEST_URL||'http://127.0.0.1:4173',{port:chrome.port,output:['html','json'],onlyCategories:['performance','accessibility','best-practices'],logLevel:'error'});
  await writeFile('artifacts/lighthouse.html',result.report[0]);await writeFile('artifacts/lighthouse.json',result.report[1]);
  const scores=Object.fromEntries(Object.entries(result.lhr.categories).map(([key,value])=>[key,Math.round(value.score*100)]));console.log(JSON.stringify({scores,formFactor:result.lhr.configSettings.formFactor,fetchTime:result.lhr.fetchTime},null,2));
  for(const [key,score]of Object.entries(scores))if(score<=90)throw new Error(`${key}: ${score} no supera 90`);
} finally {await chrome.kill();}
