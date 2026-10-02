/**
 * The Phase 3 gate as a test: a friction log filed by Faizal becomes an SOP update
 * that lands in Faizal's briefing and is acknowledged. Also checks the action-layer invariants.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '@mozart/fixtures';
import { createDemoProvider } from '@mozart/ai';
import { apply, applyAll, cmd, ActionRejected, rankTasks, unackedBriefing, newRecordNumber } from '../src';

const ai = createDemoProvider({ pace: 0 });

test('top task is the nearest SLA breach', () => {
  const s = seed();
  const ranked = rankTasks(s, 'o-faizal');
  assert.equal(ranked[0].wo.id, 'CWO-240417');
  assert.ok(ranked.length >= 3);
});

test('writes without a human confirmation are rejected', () => {
  const s = seed();
  const c = cmd('o-faizal', { type: 'briefing.ack', itemId: 'BRF-1001' });
  assert.throws(() => apply(s, c), ActionRejected);
  const ok = apply(s, cmd('o-faizal', { type: 'briefing.ack', itemId: 'BRF-1001' }, { confirm: true }));
  assert.ok(ok.briefingItems.find((b) => b.id === 'BRF-1001')!.ackByOfficerId['o-faizal']);
});

test('commands are idempotent by key', () => {
  const s = seed();
  const c = cmd('o-faizal', { type: 'wo.step', woId: 'CWO-240417', stepId: 's1', done: true });
  const a = apply(s, c);
  const b = apply(a, c);
  assert.equal(a, b);
});

test('close requires evidence', () => {
  const s = seed();
  assert.throws(() => apply(s, cmd('o-faizal', { type: 'wo.requestClose', woId: 'CWO-240417', signature: 'sig' }, { confirm: true })), /evidence/);
});

test('voice report becomes a CWO assigned to the reporter', async () => {
  const s = seed();
  const ctx = { siteId: 'CNP', sites: s.sites, assets: s.assets, sops: s.sops, docs: s.docs };
  const clip = (await import('@mozart/fixtures')).voiceClips[0];
  const ex = await ai.extractReport({ transcript: clip.transcript, clipId: clip.id, officerId: 'o-faizal', ctx });
  assert.equal(ex.draft.assetId, 'A-GT-B2-04');
  assert.ok((ex.confidence.severity ?? 1) < 0.7, 'severity is low-confidence in the scripted clip');
  const id = newRecordNumber('CWO');
  const s2 = apply(s, cmd('o-faizal', {
    type: 'report.confirm', recordId: id, attachments: [], draft: { ...ex.draft, severity: 'high' },
    report: { id: 'VR-1', officerId: 'o-faizal', siteId: 'CNP', transcript: clip.transcript, extractedDraft: ex.draft, confidence: ex.confidence, syncStatus: 'pending', createdAt: new Date().toISOString(), draft: true },
  }, { confirm: true }));
  const wo = s2.workOrders.find((w) => w.id === id)!;
  assert.equal(wo.assigneeId, 'o-faizal');
  assert.equal(wo.priority, 'high');
});

test('friction → HQ SOP change → briefing → ack closes the loop', async () => {
  let s = seed();
  const log = {
    id: 'FL-T-1', officerId: 'o-faizal', siteId: 'CNP', category: 'sop' as const, text: 'Gate SOP step 4 assumes a key we don’t carry.',
    sopStepRef: { sopId: 'SOP-GATE-004', n: 4 }, assetId: 'A-GT-B2-04', attachments: [], status: 'received' as const, routedTo: 'supervisor' as const,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  s = apply(s, cmd('o-faizal', { type: 'friction.file', log }));
  const cl = await ai.clusterFriction(log, s.themes);
  assert.equal(cl.themeId, 'th-gate-key');
  s = apply(s, cmd('o-meiling', { type: 'friction.forward', logId: log.id, themeId: cl.themeId, sentiment: cl.sentiment }));
  const theme = s.themes.find((t) => t.id === 'th-gate-key')!;
  assert.equal(theme.logIds.length, 6);
  assert.equal(theme.siteIds.length, 3);
  const sop = s.sops.find((x) => x.id === 'SOP-GATE-004')!;
  const edit = await ai.draftSopEdit(theme, sop, s.frictionLogs.filter((f) => theme.logIds.includes(f.id)));
  const { state, rejected } = applyAll(s, [cmd('o-raj', { type: 'hq.decide', themeId: theme.id, decision: 'changeSop', note: 'Key stays with FCC; runner dispatched.', sopEdit: { sopId: sop.id, n: 4, text: edit.proposedText } }, { confirm: true })]);
  assert.deepEqual(rejected, []);
  s = state;
  assert.equal(s.sops.find((x) => x.id === 'SOP-GATE-004')!.version, '3.3');
  assert.equal(s.frictionLogs.find((f) => f.id === log.id)!.status, 'decided');
  const faizal = s.officers.find((o) => o.id === 'o-faizal')!;
  const pending = unackedBriefing(s, faizal).find((b) => b.sopId === 'SOP-GATE-004');
  assert.ok(pending, 'SOP update is in Faizal’s briefing');
  s = apply(s, cmd('o-faizal', { type: 'briefing.ack', itemId: pending!.id }, { confirm: true }));
  assert.equal(s.frictionLogs.find((f) => f.id === log.id)!.status, 'closed');
  // Ask Mozart now cites the updated step
  let text = '';
  for await (const c of ai.ask({ question: 'Loading bay gate 4 is stuck half open, what do I do?', officerId: 'o-faizal', siteId: 'CNP', history: [], ctx: { siteId: 'CNP', sites: s.sites, assets: s.assets, sops: s.sops, docs: s.docs } })) if (c.type === 'text') text += c.text;
  assert.match(text, /v3\.3/);
});
