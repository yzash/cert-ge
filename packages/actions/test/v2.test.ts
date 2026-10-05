/** HR and robot rules: confirm-before-write, balances, approvals, the robot → officer → robot loop. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed, robotEventPresets } from '@mozart/fixtures';
import { apply, cmd, ActionRejected, leaveSummary, robotPose, approvalsFor, newRecordNumber } from '../src';

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const leave = (days: number) => ({
  id: `LV-T${days}`, officerId: 'o-faizal', type: 'annual' as const, from: day(10), to: day(9 + days), days, reason: 'test',
  status: 'pending' as const, createdAt: new Date().toISOString(),
});

test('leave needs a confirmation and enough balance; approval updates the balance', () => {
  let s = seed();
  assert.throws(() => apply(s, cmd('o-faizal', { type: 'leave.apply', request: leave(2) })), ActionRejected);
  assert.throws(() => apply(s, cmd('o-faizal', { type: 'leave.apply', request: leave(20) }, { confirm: true })), /Not enough annual leave/);
  s = apply(s, cmd('o-faizal', { type: 'leave.apply', request: leave(2) }, { confirm: true }));
  assert.equal(leaveSummary(s, 'o-faizal').find((b) => b.type === 'annual')!.remaining, 18 - 9 - 2);
  assert.ok(approvalsFor(s, 'o-meiling').leave.some((r) => r.id === 'LV-T2'));
  assert.throws(() => apply(s, cmd('o-faizal', { type: 'leave.decide', requestId: 'LV-T2', decision: 'approved' }, { confirm: true })), /supervisor/);
  s = apply(s, cmd('o-meiling', { type: 'leave.decide', requestId: 'LV-T2', decision: 'approved' }, { confirm: true }));
  const annual = leaveSummary(s, 'o-faizal').find((b) => b.type === 'annual')!;
  assert.equal(annual.taken, 11);
  assert.equal(annual.pending, 0);
});

test('robots move over time and a paused robot holds position', () => {
  const s = seed();
  const t0 = Date.now();
  const a = robotPose(s, 'PR-01', t0);
  const b = robotPose(s, 'PR-01', t0 + 30_000);
  assert.equal(a.status, 'patrolling');
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 1, 'patrol robot moved');
  const s2 = apply(s, cmd('o-meiling', { type: 'robot.command', robotId: 'PR-01', action: 'pause', missionId: 'x' }, { confirm: true }));
  const p1 = robotPose(s2, 'PR-01', Date.now() + 1000);
  const p2 = robotPose(s2, 'PR-01', Date.now() + 60_000);
  assert.equal(p1.status, 'paused');
  assert.deepEqual([p1.x, p1.y], [p2.x, p2.y]);
  assert.equal(robotPose(s, 'CR-02').status, 'charging');
});

test('robot detection → officer task → officer closes → robot resumes', () => {
  let s = seed();
  const preset = robotEventPresets[0];
  s = apply(s, cmd('o-meiling', { type: 'robot.event', event: { ...preset, id: 'RE-T1', at: new Date().toISOString(), status: 'open' } }));
  assert.equal(robotPose(s, 'CR-03').status, 'paused');
  assert.throws(() => apply(s, cmd('o-meiling', { type: 'robot.task', eventId: 'RE-T1', officerId: 'o-faizal', recordId: 'CWO-T1' })), ActionRejected);
  const id = newRecordNumber('CWO');
  s = apply(s, cmd('o-meiling', { type: 'robot.task', eventId: 'RE-T1', officerId: 'o-faizal', recordId: id }, { confirm: true }));
  const wo = s.workOrders.find((w) => w.id === id)!;
  assert.equal(wo.assigneeId, 'o-faizal');
  assert.ok(wo.attachments.length, 'robot snapshot attached as evidence context');
  s = apply(s, cmd('o-faizal', { type: 'wo.requestClose', woId: id, signature: 'tap:Faizal' }, { confirm: true }));
  assert.equal(s.robotEvents.find((e) => e.id === 'RE-T1')!.status, 'resolved');
  assert.equal(robotPose(s, 'CR-03').status, 'cleaning');
});
