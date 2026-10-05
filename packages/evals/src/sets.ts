import { qaPairs, voiceClips, fixtureImages } from '@mozart/fixtures';

export interface QaCase { id: string; q: string; expectDocs: string[]; grounded: boolean }

/** 50-question grounded Q&A eval: the 40 scripted pairs plus 10 paraphrases and unanswerables. */
export const qaSet: QaCase[] = [
  ...qaPairs.map((p) => ({ id: p.id, q: p.q, expectDocs: [...new Set(p.cites.map((c) => c.docId))], grounded: true })),
  { id: 'qa-p1', q: 'sub-panel on level 3 has the amber supervisory light on, what now?', expectDocs: ['SOP-FIRE-007', 'NOTICE-TODAY'], grounded: true },
  { id: 'qa-p2', q: 'shutter at the loading bay jammed', expectDocs: ['SOP-GATE-004', 'MAN-RS500', 'RULE-CNP'], grounded: true },
  { id: 'qa-p3', q: 'who resets the main fire panel?', expectDocs: ['SOP-FIRE-001', 'MAN-FP2000', 'SOP-FIRE-007'], grounded: true },
  { id: 'qa-p4', q: 'contractor wants to come in at 1am', expectDocs: ['SOP-ACC-002', 'RULE-CNP'], grounded: true },
  { id: 'qa-p5', q: 'how long is the grace period for a guard tour checkpoint', expectDocs: ['SOP-PAT-003'], grounded: true },
  { id: 'qa-p6', q: 'what pressure should the sprinkler gauge read', expectDocs: ['MAN-PUMP', 'SOP-FIRE-015'], grounded: true },
  { id: 'qa-p7', q: 'escalator stopped after someone fell, can I restart it', expectDocs: ['SOP-ESC-001', 'NOTICE-TODAY'], grounded: true },
  { id: 'qa-p8', q: 'How do I apply for annual leave?', expectDocs: ['HR-LEAVE'], grounded: true },
  { id: 'qa-n1', q: 'Who won the football match last night?', expectDocs: [], grounded: false },
  { id: 'qa-p9', q: 'What is my overtime pay rate?', expectDocs: ['HR-PAY'], grounded: true },
  { id: 'qa-n2', q: 'What will the weather be tomorrow?', expectDocs: [], grounded: false },
  { id: 'qa-n3', q: 'Can I carry a baton on patrol?', expectDocs: [], grounded: false },
];

export const voiceSet = voiceClips;
export const imageSet = fixtureImages;

export interface RouteCase { text: string; role: 'officer' | 'supervisor' | 'hq'; kind: string; slots?: Record<string, unknown> }

/** Chat router eval: sentence → expected card (and key slots). */
export const routeSet: RouteCase[] = [
  { text: 'What is the SOP if the fire panel shows a supervisory fault on L3?', role: 'officer', kind: 'ask' },
  { text: 'How many days of annual leave do I get?', role: 'officer', kind: 'ask' },
  { text: 'How is my overtime calculated?', role: 'officer', kind: 'ask' },
  { text: 'When should I renew my security officer licence?', role: 'officer', kind: 'ask' },
  { text: 'Apply annual leave on 20 and 21 Oct', role: 'officer', kind: 'leave_apply', slots: { type: 'annual' } },
  { text: 'I need leave next friday for 2 days', role: 'officer', kind: 'leave_apply', slots: { type: 'annual' } },
  { text: 'I am sick today, apply MC', role: 'officer', kind: 'leave_apply', slots: { type: 'medical' } },
  { text: 'How much leave do I have left?', role: 'officer', kind: 'leave_balance' },
  { text: 'Show my payslip', role: 'officer', kind: 'payslip' },
  { text: 'my last salary', role: 'officer', kind: 'payslip' },
  { text: 'Claim $18.40 taxi to Seletar for relief shift', role: 'officer', kind: 'claim', slots: { type: 'transport', amount: 18.4 } },
  { text: 'I want to claim a meal, shift extended', role: 'officer', kind: 'claim', slots: { type: 'meal' } },
  { text: 'Swap my night shift on 9 Oct with Ahmad', role: 'officer', kind: 'swap' },
  { text: 'When is my next shift?', role: 'officer', kind: 'roster' },
  { text: 'Check my licence', role: 'officer', kind: 'licence' },
  { text: 'Where are the robots?', role: 'officer', kind: 'robots_status' },
  { text: 'Send a robot to patrol the canopy park', role: 'officer', kind: 'robot_command', slots: { action: 'patrol', zoneId: 'z-l5-canopy' } },
  { text: 'Get a cleaning robot to scrub the dining terrace', role: 'supervisor', kind: 'robot_command', slots: { action: 'clean', zoneId: 'z-l4-dining' } },
  { text: 'Pause CR-01', role: 'supervisor', kind: 'robot_command', slots: { action: 'pause', robotId: 'CR-01' } },
  { text: 'Send PR-02 back to dock', role: 'supervisor', kind: 'robot_command', slots: { action: 'return_dock', robotId: 'PR-02' } },
  { text: 'Report a jammed gate at B2', role: 'officer', kind: 'report' },
  { text: 'Water is leaking from the ceiling here', role: 'officer', kind: 'report' },
  { text: 'Verify this panel', role: 'officer', kind: 'verify' },
  { text: 'Start my handover', role: 'officer', kind: 'handover' },
  { text: 'This SOP step does not work in the field', role: 'officer', kind: 'friction' },
  { text: 'What are my tasks?', role: 'officer', kind: 'tasks' },
  { text: 'Brief me on my shift', role: 'officer', kind: 'brief' },
  { text: 'What is waiting for me to approve?', role: 'supervisor', kind: 'approvals' },
  { text: 'Who is blocked on my team?', role: 'supervisor', kind: 'team' },
  { text: 'Send an evacuation drill alert', role: 'supervisor', kind: 'alert' },
  { text: 'Which friction themes need a decision?', role: 'hq', kind: 'themes' },
  { text: 'Where is the override key for the loading bay gates?', role: 'officer', kind: 'ask' },
];
