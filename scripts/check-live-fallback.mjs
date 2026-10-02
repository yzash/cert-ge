/** LIVE flag with a BFF that has no Google tenant: answers must still appear, with a fallback badge; writes sync via the BFF. */
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.argv[2] ?? 'http://localhost:8081';
const BFF = process.argv[3] ?? 'http://localhost:8787';
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => fs.existsSync(p));
const b = await chromium.launch(exe ? { executablePath: exe } : {});
const p = await b.newPage({ viewport: { width: 1400, height: 920 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(BASE);
await p.evaluate(([bff]) => {
  localStorage.clear();
  sessionStorage.setItem('mozart.device.v3', JSON.stringify({ settings: { theme: 'dark', lang: 'en', airplane: false, aiMode: 'LIVE', backend: 'bff', bffUrl: bff } }));
}, [BFF]);
await p.goto(`${BASE}/?as=o-faizal`);
await p.getByText(/Good (evening|morning|afternoon), Faizal/).waitFor();
const seq0 = (await (await fetch(`${BFF}/api/v1/state`)).json()).seq;
await p.getByRole('button', { name: 'Acknowledge', exact: true }).filter({ visible: true }).first().click();
await p.waitForTimeout(2500);
const seq1 = (await (await fetch(`${BFF}/api/v1/state`)).json()).seq;
console.log('BFF seq', seq0, '->', seq1);
await p.getByText('Ask', { exact: true }).filter({ visible: true }).first().click();
await p.getByText('Any notices for tonight?').click();
await p.getByText('LIVE failed · DEMO answer').filter({ visible: true }).first().waitFor({ timeout: 15000 });
await p.screenshot({ path: (process.env.SHOTS ?? 'demo-shots') + '/live-fallback.png' });
console.log(seq1 > seq0 && !errs.length ? 'LIVE-FALLBACK: PASS' : `LIVE-FALLBACK: FAIL ${errs.join(';')}`);
await b.close();
