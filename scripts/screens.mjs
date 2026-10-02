/** Visual QA: screenshot every screen (incl. emergency takeover and phone-width layout). */
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.argv[2] ?? 'http://localhost:8081';
const OUT = process.env.SHOTS ?? 'demo-shots';
fs.mkdirSync(OUT, { recursive: true });
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => fs.existsSync(p));
const b = await chromium.launch(exe ? { executablePath: exe } : {});
const ctx = await b.newContext({ viewport: { width: 1400, height: 920 } });
const errs = [];
const A = await ctx.newPage();
A.on('pageerror', (e) => errs.push(e.message));
await A.goto(BASE);
await A.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
await A.goto(`${BASE}/?as=o-faizal`);
const v = (l) => l.filter({ visible: true }).first();
await v(A.getByText(/Good (evening|morning|afternoon), Faizal/)).waitFor();
for (const [tab, name] of [['Tasks', 'tasks'], ['Tour', 'tour'], ['Me', 'me']]) {
  await v(A.getByText(tab, { exact: true })).click();
  await A.waitForTimeout(500);
  await A.screenshot({ path: `${OUT}/s-${name}.png` });
}
await v(A.getByText('Ask', { exact: true })).click();
await v(A.getByText('Malay: gate stuck', { exact: true })).click();
await v(A.getByText('Sources')).waitFor({ timeout: 15000 });
await A.screenshot({ path: `${OUT}/s-ask-malay.png` });
await v(A.getByText('Tour', { exact: true })).click();
await v(A.getByRole('button', { name: 'Scan tag (NFC/QR)' })).click();
await v(A.getByText('Checkpoint: Canopy bridge')).click().catch(() => {});
await A.waitForTimeout(5000);
await A.screenshot({ path: `${OUT}/s-tour-note.png` });

const B = await ctx.newPage();
B.on('pageerror', (e) => errs.push(e.message));
await B.goto(`${BASE}/?as=o-meiling`);
await v(B.getByText('Shift board')).waitFor();
await B.screenshot({ path: `${OUT}/s-team-board.png` });
await v(B.getByText('Alerts', { exact: true })).click();
await v(B.getByRole('button', { name: 'Send high-priority alert' })).click();
await A.bringToFront();
await v(A.getByRole('button', { name: 'Acknowledge', exact: true })).waitFor({ timeout: 10000 });
await A.screenshot({ path: `${OUT}/s-alert-takeover.png` });
await v(A.getByRole('button', { name: 'Acknowledge', exact: true })).click();
await B.bringToFront();
await v(B.getByText(/1 of 14 acknowledged/)).waitFor({ timeout: 10000 });
await B.screenshot({ path: `${OUT}/s-alert-acks.png` });

const C = await ctx.newPage();
C.on('pageerror', (e) => errs.push(e.message));
await C.setViewportSize({ width: 1440, height: 1000 });
await C.goto(`${BASE}/hq`);
await v(C.getByText('Mozart Frontline · HQ feedback')).waitFor();
await C.waitForTimeout(800);
await C.screenshot({ path: `${OUT}/s-hq.png` });
await v(C.getByText('Light', { exact: true })).click();
await C.waitForTimeout(400);
await C.screenshot({ path: `${OUT}/s-hq-light.png` });

const M = await ctx.newPage();
M.on('pageerror', (e) => errs.push(e.message));
await M.setViewportSize({ width: 390, height: 844 });
await M.goto(`${BASE}/?as=o-faizal`);
await v(M.getByText(/Good (evening|morning|afternoon), Faizal/)).waitFor();
await M.screenshot({ path: `${OUT}/s-phone-width-home.png` });
console.log(errs.length ? `ERRORS:\n${errs.join('\n')}` : 'SCREENS: OK');
await b.close();
