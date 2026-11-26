import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
await p.goto('https://velora-6f788.web.app',{waitUntil:'networkidle'}); await p.waitForTimeout(6000);
await p.screenshot({path:'/downloads/velora-live.png'}); await b.close();
