/**
 * v2 (chat-first) run-of-show at /v2. Three tabs = three devices on one world:
 *   F: Faizal (officer)   M: Mei Ling (supervisor)   R: Raj (HQ)
 * Covers chat Q&A, voice report, leave, payslip, friction, approvals, robot detection → officer task,
 * HQ SOP change → briefing. Usage: node scripts/run-of-show-v2.mjs [baseUrl] [runs]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:8081';
const RUNS = Number(process.argv[3] ?? 1);
const SHOTS = process.env.SHOTS ?? 'demo-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => fs.existsSync(p));
const vis = (l) => l.filter({ visible: true }).last();

async function run(n) {
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  const watch = (p, who) => {
    p.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error' && !/favicon|DevTools/.test(m.text())) errors.push(`${who} console: ${m.text()}`); });
  };
  let shot = 0;
  const snap = async (p, name) => { if (n === 1) await p.screenshot({ path: `${SHOTS}/v2-${String(++shot).padStart(2, '0')}-${name}.png` }); };
  const t0 = Date.now();
  const step = (s) => console.log(`[v2 run ${n}] ${((Date.now() - t0) / 1000).toFixed(1)}s  ${s}`);
  const say = async (p, text) => {
    await vis(p.getByLabel('Message', { exact: true })).fill(text);
    await p.keyboard.press('Enter');
  };

  const F = await ctx.newPage();
  watch(F, 'faizal');
  try {
    await F.goto(`${BASE}/v2`);
    await F.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await F.goto(`${BASE}/v2?as=o-faizal`);
    await vis(F.getByText('Hello, Faizal')).waitFor();
    await snap(F, 'hello');

    step('1 brief + acknowledge');
    await vis(F.getByText('1 to acknowledge')).click();
    await vis(F.getByRole('button', { name: 'Acknowledge', exact: true })).click();
    await vis(F.getByText('Briefing done')).waitFor();

    step('2 grounded answer + source panel');
    await say(F, 'What is the SOP if the fire panel shows a supervisory fault on L3?');
    await vis(F.getByText(/to first word/)).waitFor({ timeout: 15000 });
    await vis(F.getByRole('link').filter({ hasText: 'Tonight’s Ops Notices' })).click();
    await vis(F.getByText('Cited', { exact: true })).waitFor();
    await snap(F, 'answer-and-source');
    await vis(F.getByRole('button', { name: 'Close panel' })).click();

    step('3 voice report in chat');
    await say(F, 'Report a jammed gate at B2');
    const mic = vis(F.getByRole('button', { name: 'Hold to talk' }));
    await mic.waitFor();
    await F.waitForTimeout(800); // let the chat finish scrolling to the new card
    await mic.scrollIntoViewIfNeeded();
    const mb = await mic.boundingBox();
    await F.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2);
    await F.mouse.down();
    await F.waitForTimeout(6000);
    await F.mouse.up();
    await vis(F.getByText(/Draft in/)).waitFor({ timeout: 15000 });
    await vis(F.getByText('High', { exact: true })).click();
    await snap(F, 'report-draft');
    await vis(F.getByRole('button', { name: 'Submit to Mozart' })).click();
    await vis(F.getByText(/Submitted CWO-/)).waitFor();

    step('4 leave + payslip');
    await say(F, 'Apply annual leave next friday for 2 days');
    await vis(F.getByRole('button', { name: 'Send to supervisor' })).click();
    await vis(F.getByText('pending', { exact: true })).waitFor();
    await say(F, 'Show my payslip');
    await vis(F.getByRole('button', { name: 'Show amounts' })).click();
    await vis(F.getByText(/^S\$\d/)).waitFor();
    await snap(F, 'leave-and-payslip');

    step('5 friction');
    await say(F, 'This SOP step does not work in the field');
    await vis(F.getByText(/^Gate SOP step 4 assumes a key/)).click();
    await F.waitForTimeout(4500);
    await vis(F.getByRole('button', { name: 'Send', exact: true })).click();
    await vis(F.getByText(/Sent to your supervisor/)).waitFor();

    step('6 Mei Ling approves + forwards');
    const M = await ctx.newPage();
    watch(M, 'meiling');
    await M.goto(`${BASE}/v2?as=o-meiling`);
    await vis(M.getByText('Hello, Mei')).waitFor();
    await say(M, 'What is waiting for me to approve?');
    const leaveRow = vis(M.locator('div').filter({ hasText: /^Leave · Faizal Rahman/ }).filter({ has: M.getByRole('button', { name: 'Approve' }) }));
    await leaveRow.getByRole('button', { name: 'Approve' }).click();
    const fr = vis(M.locator('div').filter({ hasText: /^Friction · Faizal Rahman/ }).filter({ has: M.getByRole('button', { name: 'Forward to HQ' }) }));
    await fr.getByRole('button', { name: 'Forward to HQ' }).click();
    await vis(M.getByText('Forwarded to HQ')).waitFor();
    await snap(M, 'approvals');

    step('7 control tower: robot sees a spill, task Faizal');
    await vis(M.getByRole('link', { name: /Control tower/ })).click();
    await vis(M.getByText('Robot events')).waitFor();
    await vis(M.getByRole('button', { name: /CR-03: Liquid spill detected/ })).click();
    await vis(M.getByRole('button', { name: 'Task Faizal' })).click();
    await vis(M.getByText(/Tasked Faizal Rahman/)).waitFor();
    await snap(M, 'control-tower');

    step('8 Faizal handles the robot task');
    await F.bringToFront();
    await vis(F.getByText('Scrubber CR-03 needs you')).waitFor({ timeout: 15000 });
    await vis(F.getByRole('button', { name: 'Open task' })).click();
    await vis(F.getByRole('button', { name: 'Demo photo' })).click();
    await vis(F.getByLabel('Snapshot: spill')).click();
    await vis(F.getByRole('button', { name: 'Confirm and close' })).click();
    await vis(F.getByText('Handled · robot back to work')).waitFor();
    await vis(F.getByRole('button', { name: 'Close panel' })).click();
    await snap(F, 'robot-task-done');

    step('9 Raj decides at HQ');
    const R = await ctx.newPage();
    watch(R, 'raj');
    await R.goto(`${BASE}/v2?as=o-raj`);
    await vis(R.getByText('Hello, Raj')).waitFor();
    await vis(R.getByRole('link', { name: /Insights/ })).click();
    await vis(R.getByText(/6 logs · 3 sites · sop/)).waitFor({ timeout: 10000 });
    await vis(R.getByText('Gate SOP assumes an override key officers don’t carry')).click();
    await vis(R.getByRole('button', { name: 'Change SOP' })).click();
    await vis(R.getByRole('button', { name: /Publish to 3 site briefings/ })).click();
    await vis(R.getByText(/SOP changed/)).waitFor();
    await snap(R, 'hq-decided');

    step('10 Faizal: SOP update in briefing; robot to patrol');
    await F.bringToFront();
    await vis(F.getByRole('button', { name: 'New chat' })).click();
    await say(F, 'Brief me on my shift');
    await vis(F.getByText('SOP-GATE-004 v3.3: step 4 updated')).waitFor({ timeout: 10000 });
    await vis(F.getByRole('button', { name: 'Acknowledge', exact: true })).click();
    await say(F, 'Send a robot to patrol the canopy park');
    await vis(F.getByRole('button', { name: /Patrol · PR-0\d → L5 Canopy Park/ })).click();
    await vis(F.getByText(/Sent\.$/)).waitFor();
    await snap(F, 'brief-and-robot');
    step(`done, ${errors.length} page errors`);
  } catch (e) {
    for (const [i, p] of ctx.pages().entries()) await p.screenshot({ path: `${SHOTS}/v2-FAIL-run${n}-tab${i}.png` }).catch(() => {});
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
    console.error(`[v2 run ${i}] FAILED: ${e.message.split('\n').slice(0, 3).join(' | ')}`);
    failed = true;
  }
}
console.log(failed ? 'RUN-OF-SHOW v2: FAIL' : `RUN-OF-SHOW v2: PASS x${RUNS}`);
process.exit(failed ? 1 : 0);
