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
  { id: 'qa-n1', q: 'How do I apply for annual leave?', expectDocs: [], grounded: false },
  { id: 'qa-n2', q: 'What is my overtime pay rate?', expectDocs: [], grounded: false },
  { id: 'qa-n3', q: 'Can I carry a baton on patrol?', expectDocs: [], grounded: false },
];

export const voiceSet = voiceClips;
export const imageSet = fixtureImages;
