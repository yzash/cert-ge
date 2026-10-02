/**
 * Automated run-of-show (PRD "12-minute demo") against the web build.
 * Three tabs in one browser = three devices sharing one Mozart world:
 *   A: Faizal (officer, starts in airplane mode)  B: Mei Ling (supervisor)  C: Raj (HQ web)
 *
 * Usage: pnpm build:web && npx serve -s apps/mobile/dist -l 8081 &  then  node scripts/run-of-show.mjs [baseUrl] [runs]
 * Screenshots go to ./demo-shots (or $SHOTS).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:8081';
const RUNS = Number(process.argv[3] ?? 1);
const SHOTS = process.env.SHOTS ?? 'demo-shots';
fs.mkdirSync(SHOTS, { recursive: true });

const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => fs.existsSync(p));

async function signature(page) {
  const pad = page.getByLabel('Signature pad').first();
  await pad.scrollIntoViewIfNeeded();
  const b = await pad.boundingBox();
  await page.mouse.move(b.x + 30, b.y + b.height * 0.6);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(b.x + 30 + i * 20, b.y + b.height * (0.6 + Math.sin(i) * 0.2), { steps: 2 });
  await page.mouse.up();
}

async function run(n) {
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 920 } });
  const errors = [];
  const watch = (p, who) => {
    p.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error' && !/favicon|DevTools/.test(m.text())) errors.push(`${who} console: ${m.text()}`); });
  };
  let shot = 0;
  const snap = async (p, name) => { if (n === 1) await p.screenshot({ path: `${SHOTS}/${String(++shot).padStart(2, '0')}-${name}.png` }); };
  const t0 = Date.now();
  const step = (s) => console.log(`[run ${n}] ${((Date.now() - t0) / 1000).toFixed(1)}s  ${s}`);

  const A = await ctx.newPage();
  watch(A, 'faizal');
  try {
  await A.goto(BASE);
  await A.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await A.goto(BASE);

  // 1. Sign in, airplane mode on, acknowledge the policy update
  step('1 sign in + airplane + acknowledge');
  await A.getByText('Faizal Rahman').filter({ visible: true }).last().click();
  await A.getByText('Good evening, Faizal').filter({ visible: true }).or(A.getByText(/Good (morning|afternoon), Faizal/).filter({ visible: true })).waitFor();
  await A.getByText('Airplane mode off').filter({ visible: true }).click();
  await A.getByText(/Offline \(airplane mode\)/).filter({ visible: true }).waitFor();
  await A.getByText(/Handover from Siti/).filter({ visible: true }).click();
  await A.getByRole('button', { name: 'I have read this. Acknowledge' }).filter({ visible: true }).click();
  await A.getByRole('button', { name: 'Acknowledge', exact: true }).filter({ visible: true }).first().click();
  await A.getByText(/Acknowledged .* pending sync/).filter({ visible: true }).waitFor();
  await snap(A, 'home-offline-acknowledged');

  // 2. Ask by voice; answer streams with citations; open the cited SOP section
  step('2 ask by voice');
  await A.getByRole('tab', { name: /Ask/ }).filter({ visible: true }).or(A.getByText('Ask', { exact: true }).filter({ visible: true })).first().click();
  await A.getByText('Supervisory fault on L3', { exact: true }).filter({ visible: true }).click();
  await A.getByText('Sources').filter({ visible: true }).waitFor({ timeout: 15000 });
  await A.getByText('Offline, cached').filter({ visible: true }).waitFor();
  await snap(A, 'ask-cited-answer');
  await A.getByRole('link').filter({ visible: true }).filter({ hasText: 'Fire alarm panel: supervisory fault' }).first().click();
  await A.getByText('Cited', { exact: true }).filter({ visible: true }).waitFor();
  await snap(A, 'doc-cited-section');
  await A.getByRole('button', { name: 'Back' }).filter({ visible: true }).click();

  // 3. Verify the L3 panel and attach to the work order, then sign and close
  step('3 verify panel');
  await A.getByText('Home', { exact: true }).filter({ visible: true }).click();
  await A.getByText('Fire panel L3 South: supervisory fault (Z14)').filter({ visible: true }).first().click();
  await A.getByRole('button', { name: 'Acknowledge', exact: true }).filter({ visible: true }).click();
  await A.getByRole('button', { name: 'Verify with camera' }).filter({ visible: true }).nth(2).click();
  await A.getByRole('button', { name: 'Capture and verify' }).filter({ visible: true }).click();
  await A.getByText('Attention', { exact: true }).filter({ visible: true }).waitFor({ timeout: 10000 });
  await snap(A, 'verify-attention');
  await A.getByRole('button', { name: 'Attach to CWO-240417' }).filter({ visible: true }).click();
  await A.getByText('Evidence attached.').filter({ visible: true }).waitFor();
  await signature(A);
  await A.getByRole('button', { name: 'Sign and close' }).filter({ visible: true }).click();
  await A.getByText('Awaiting supervisor approval').filter({ visible: true }).waitFor();
  await snap(A, 'wo-closed-pending');
  await A.getByRole('button', { name: 'Back' }).filter({ visible: true }).click();

  // 4. Hold the mic, speak the jammed-gate report, fix severity, add photo, save offline
  step('4 voice report');
  await A.getByRole('button', { name: 'Report by voice' }).filter({ visible: true }).click();
  const mic = A.getByRole('button', { name: 'Hold to talk' }).filter({ visible: true });
  const mb = await mic.boundingBox();
  await A.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2);
  await A.mouse.down();
  await A.waitForTimeout(6500);
  await A.mouse.up();
  await A.getByText(/Draft ready in/).filter({ visible: true }).waitFor({ timeout: 15000 });
  await snap(A, 'report-draft-low-confidence');
  await A.getByText('High', { exact: true }).filter({ visible: true }).click();
  await A.getByRole('button', { name: 'Demo photo' }).filter({ visible: true }).click();
  await A.getByLabel('Gate 4: jammed half open').filter({ visible: true }).or(A.getByText('Gate 4: jammed half open').filter({ visible: true })).first().click();
  await A.getByRole('button', { name: 'Save offline' }).filter({ visible: true }).click();
  await A.getByText('Pending sync').filter({ visible: true }).first().waitFor();
  await snap(A, 'tasks-new-cwo-pending');

  // 5. Friction log
  step('5 friction log');
  await A.getByText('Home', { exact: true }).filter({ visible: true }).click();
  await A.getByRole('button', { name: 'Flag a problem' }).filter({ visible: true }).click();
  await A.getByText('SOP step', { exact: true }).filter({ visible: true }).click();
  await A.getByText(/Demo: Gate SOP step 4/).filter({ visible: true }).click();
  await A.waitForTimeout(4500);
  await A.getByRole('button', { name: 'Send' }).filter({ visible: true }).click();
  await A.getByText('Friction log filed').filter({ visible: true }).waitFor();
  await snap(A, 'friction-filed');

  // 6. Reconnect (queue replays), generate + sign handover
  step('6 reconnect + handover');
  await A.getByText(/Airplane mode ON/).filter({ visible: true }).click();
  await A.waitForFunction(() => !document.body.innerText.includes('pending sync'), null, { timeout: 15000 });
  await A.getByRole('button', { name: 'Back' }).filter({ visible: true }).click();
  await A.getByRole('button', { name: 'Handover' }).filter({ visible: true }).click();
  await A.getByRole('button', { name: 'Generate handover' }).filter({ visible: true }).click();
  await A.getByText(/Drafted in/).filter({ visible: true }).waitFor({ timeout: 15000 });
  await snap(A, 'handover-draft');
  await signature(A);
  await A.getByRole('button', { name: 'Sign and submit' }).filter({ visible: true }).click();
  await A.getByText('Signed', { exact: false }).filter({ visible: true }).first().waitFor();

  // Mei Ling: approve closure with the verification photo, forward the friction log
  const B = await ctx.newPage();
  watch(B, 'meiling');
  await B.goto(`${BASE}/?as=o-meiling`);
  await B.getByText('Shift board').filter({ visible: true }).waitFor();
  await B.getByText(/^Closures · /).filter({ visible: true }).click();
  await B.getByText('Fire panel L3 South: supervisory fault (Z14)').filter({ visible: true }).waitFor();
  await snap(B, 'supervisor-closure-evidence');
  await B.getByRole('button', { name: 'Approve' }).filter({ visible: true }).first().click();
  await B.getByText(/^Friction · /).filter({ visible: true }).click();
  const card = B.locator('div').filter({ hasText: /^.*Gate SOP step 4 assumes a key.*$/ }).filter({ has: B.getByRole('button', { name: 'Forward to HQ' }).filter({ visible: true }) }).last();
  await card.getByRole('button', { name: 'Forward to HQ' }).click();
  await B.getByText('Forwarded to HQ').filter({ visible: true }).waitFor();
  await snap(B, 'supervisor-forwarded');

  // 7. Raj on the web: theme has 6 logs across 3 sites; Change SOP; publish
  step('7 HQ decision');
  const C = await ctx.newPage();
  watch(C, 'raj');
  await C.setViewportSize({ width: 1440, height: 1000 });
  await C.goto(`${BASE}/hq`);
  await C.getByText('Mozart Frontline · HQ feedback').filter({ visible: true }).waitFor();
  await C.getByText(/6 logs · 3 sites · sop/).filter({ visible: true }).first().waitFor({ timeout: 10000 });
  await C.getByText('Gate SOP assumes an override key officers don’t carry').filter({ visible: true }).first().click();
  await C.getByRole('button', { name: 'Change SOP' }).filter({ visible: true }).click();
  await C.getByRole('button', { name: /Publish SOP-GATE-004 v3.3/ }).filter({ visible: true }).waitFor({ timeout: 10000 });
  await snap(C, 'hq-change-sop');
  await C.getByRole('button', { name: /Publish SOP-GATE-004 v3.3/ }).filter({ visible: true }).click();
  await C.getByText(/Decided .* SOP changed/).filter({ visible: true }).waitFor();
  await snap(C, 'hq-decided');

  // 8. Faizal: updated SOP lands in the briefing; acknowledge; loop closed
  step('8 loop closed');
  await A.bringToFront();
  await A.getByRole('button', { name: 'Back' }).filter({ visible: true }).click();
  await A.getByText('Home', { exact: true }).filter({ visible: true }).click();
  await A.getByText('SOP-GATE-004 v3.3: step 4 updated').filter({ visible: true }).waitFor({ timeout: 10000 });
  await snap(A, 'home-new-sop-briefing');
  await A.getByRole('button', { name: 'Acknowledge', exact: true }).filter({ visible: true }).first().click();
  await A.getByRole('button', { name: 'Flag a problem' }).filter({ visible: true }).click();
  await A.getByText(/SOP changed: SOP-GATE-004 v3.3/).filter({ visible: true }).first().waitFor();
  await snap(A, 'friction-decided');

  step(`done, ${errors.length} page errors`);
  } catch (e) {
    for (const [i, p] of ctx.pages().entries()) await p.screenshot({ path: `${SHOTS}/FAIL-run${n}-tab${i}.png` }).catch(() => {});
    console.log(errors.join('\n'));
    await browser.close();
    throw e;
  }
  await browser.close();
  return errors;
}

let failed = false;
for (let i = 1; i <= RUNS; i++) {
  try {
    const errs = await run(i);
    if (errs.length) { console.log(errs.join('\n')); failed = true; }
  } catch (e) {
    console.error(`[run ${i}] FAILED: ${e.message.split('\n').slice(0, 3).join(' | ')}`);
    failed = true;
  }
}
console.log(failed ? 'RUN-OF-SHOW: FAIL' : `RUN-OF-SHOW: PASS x${RUNS}`);
process.exit(failed ? 1 : 0);
