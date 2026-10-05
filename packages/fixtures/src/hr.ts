import type { Claim, Doc, LeaveBalance, LeaveRequest, Licence, Payslip, RosterShift, ShiftSwap } from '@mozart/schema';
import { officers } from './site';

/**
 * Synthetic corporate-services data from Certis's in-house HR system (integration assumed:
 * REST, see packages/actions/src/hr.ts). Figures are illustrative, not real Certis pay or policy.
 */
const DAY = 86_400_000;
const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);

const people = officers.filter((o) => o.role !== 'hq');

export function buildHr(now: number) {
  const leaveBalances: LeaveBalance[] = people.flatMap((o, i) => [
    { officerId: o.id, type: 'annual' as const, entitled: 18, taken: o.id === 'o-faizal' ? 9 : 4 + (i % 7) },
    { officerId: o.id, type: 'medical' as const, entitled: 14, taken: o.id === 'o-faizal' ? 2 : i % 4 },
    { officerId: o.id, type: 'childcare' as const, entitled: 6, taken: o.id === 'o-faizal' ? 1 : 0 },
    { officerId: o.id, type: 'compassionate' as const, entitled: 3, taken: 0 },
  ]);

  const leaveRequests: LeaveRequest[] = [
    { id: 'LV-2611', officerId: 'o-faizal', type: 'annual', from: ymd(now - 32 * DAY), to: ymd(now - 31 * DAY), days: 2, reason: 'Family wedding', status: 'approved', approverId: 'o-meiling', decidedAt: new Date(now - 40 * DAY).toISOString(), createdAt: new Date(now - 45 * DAY).toISOString(), confirmedBy: 'o-faizal', confirmedAt: new Date(now - 45 * DAY).toISOString() },
    { id: 'LV-2674', officerId: 'o-daniel', type: 'annual', from: ymd(now + 9 * DAY), to: ymd(now + 11 * DAY), days: 3, reason: 'Trip to Penang', status: 'pending', createdAt: new Date(now - 2 * DAY).toISOString(), confirmedBy: 'o-daniel', confirmedAt: new Date(now - 2 * DAY).toISOString() },
    { id: 'LV-2680', officerId: 'o-nurul', type: 'medical', from: ymd(now - 1 * DAY), to: ymd(now - 1 * DAY), days: 1, reason: 'MC submitted (fever)', status: 'pending', createdAt: new Date(now - 20 * 3600_000).toISOString(), confirmedBy: 'o-nurul', confirmedAt: new Date(now - 20 * 3600_000).toISOString() },
  ];

  // Last three paid months for every officer; Faizal's are the ones the demo opens.
  const payslips: Payslip[] = [];
  people.forEach((o, i) => {
    for (let m = 1; m <= 3; m++) {
      const d = new Date(now);
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() - m);
      const period = d.toISOString().slice(0, 7);
      const basic = o.role === 'supervisor' ? 3600 : o.title.includes('IFM') ? 2750 : 2450;
      const otHours = o.id === 'o-faizal' ? [36, 28, 41][m - 1] : 18 + ((i * 7 + m * 5) % 30);
      const hourly = (basic * 12) / (52 * 44);
      const overtimePay = Math.round(otHours * hourly * 1.5 * 100) / 100;
      const allowances = [{ label: 'Night shift allowance', amount: o.shiftId === 'night' ? 180 : 0 }, { label: 'Uniform & grooming', amount: 30 }].filter((a) => a.amount);
      const gross = Math.round((basic + overtimePay + allowances.reduce((a, b) => a + b.amount, 0)) * 100) / 100;
      const cpf = Math.round(gross * 0.2 * 100) / 100;
      const deductions = [{ label: 'CPF (employee 20%)', amount: cpf }, { label: 'Union dues', amount: 9.5 }];
      const paid = new Date(d);
      paid.setUTCMonth(paid.getUTCMonth() + 1);
      paid.setUTCDate(7);
      payslips.push({
        id: `PS-${o.id}-${period}`, officerId: o.id, period, basic, overtimeHours: otHours, overtimePay, allowances, deductions, gross,
        net: Math.round((gross - cpf - 9.5) * 100) / 100, paidOn: paid.toISOString().slice(0, 10),
      });
    }
  });

  const claims: Claim[] = [
    { id: 'CL-1180', officerId: 'o-faizal', type: 'transport', amount: 18.4, date: ymd(now - 6 * DAY), note: 'Taxi to Seletar Medical for relief shift', status: 'approved', approverId: 'o-meiling', decidedAt: new Date(now - 4 * DAY).toISOString(), createdAt: new Date(now - 6 * DAY).toISOString(), confirmedBy: 'o-faizal', confirmedAt: new Date(now - 6 * DAY).toISOString() },
    { id: 'CL-1192', officerId: 'o-hafiz', type: 'meal', amount: 8, date: ymd(now - 1 * DAY), note: 'Shift extended 3 h (incident at L4)', status: 'submitted', createdAt: new Date(now - 18 * 3600_000).toISOString(), confirmedBy: 'o-hafiz', confirmedAt: new Date(now - 18 * 3600_000).toISOString() },
  ];

  // 14-day roster: 4 nights on, 2 off, staggered per officer.
  const roster: RosterShift[] = [];
  people.forEach((o, i) => {
    for (let d = 0; d < 14; d++) {
      const pos = (d + i) % 6;
      const base = o.shiftId === 'day' ? 'day' : o.shiftId === 'night' ? 'night' : 'off';
      roster.push({ officerId: o.id, date: ymd(now + d * DAY), shiftId: o.id === 'o-faizal' ? (d % 6 < 4 ? 'night' : 'off') : pos < 4 ? (base as RosterShift['shiftId']) : 'off', siteId: o.siteId });
    }
  });

  const shiftSwaps: ShiftSwap[] = [
    { id: 'SW-310', officerId: 'o-weijie', withOfficerId: 'o-ahmad', date: ymd(now + 3 * DAY), status: 'pending', note: 'Exam on Thursday night', createdAt: new Date(now - 5 * 3600_000).toISOString(), confirmedBy: 'o-weijie', confirmedAt: new Date(now - 5 * 3600_000).toISOString() },
  ];

  const licences: Licence[] = people.flatMap((o, i) => [
    { id: `LIC-PSIA-${o.id}`, officerId: o.id, name: 'Security Officer licence (PLRD)', number: `SO-${(48213 + i * 37).toString()}`, issuer: 'Police Licensing & Regulatory Department', expiresOn: ymd(now + (o.id === 'o-faizal' ? 41 : 120 + i * 13) * DAY) },
    { id: `LIC-CPR-${o.id}`, officerId: o.id, name: 'CPR + AED certification', number: `CPR-${(90311 + i).toString()}`, issuer: 'Singapore Resuscitation and First Aid Council', expiresOn: ymd(now + (200 + i * 9) * DAY) },
  ]);

  return { leaveBalances, leaveRequests, payslips, claims, roster, shiftSwaps, licences };
}

/** HR policy documents (grounding for HR questions in Ask). Illustrative, not Certis policy. */
export const hrDocs: Doc[] = [
  {
    id: 'HR-LEAVE', kind: 'policy', title: 'Leave Policy (Frontline Staff)', siteIds: ['CNP', 'SMC', 'MXT', 'KCH'], version: '2026.1',
    sections: [
      { id: 'annual', heading: 'Annual leave', body: 'Frontline staff get 14 days of annual leave in their first year, plus 1 day per completed year of service, up to 21 days. Apply at least 7 days before the first day of leave so the roster can be covered.' },
      { id: 'carry', heading: 'Carry forward', body: 'Up to 5 unused annual leave days carry forward to the next year and must be used by 31 March.' },
      { id: 'medical', heading: 'Medical leave', body: 'Up to 14 days of outpatient medical leave a year. Inform your supervisor before your shift starts and upload the medical certificate (MC) in the app within 48 hours.' },
      { id: 'childcare', heading: 'Childcare leave', body: 'Parents of a Singapore citizen child under 7 get 6 days of childcare leave a year.' },
      { id: 'approval', heading: 'Approval', body: 'Your site supervisor approves leave in the app. Leave on public holidays and during declared high-alert periods needs the Operations Manager’s approval.' },
    ],
  },
  {
    id: 'HR-PAY', kind: 'policy', title: 'Pay, Overtime & Allowances', siteIds: ['CNP', 'SMC', 'MXT', 'KCH'], version: '2026.2',
    sections: [
      { id: 'payday', heading: 'Pay day', body: 'Salary is credited on the 7th of the following month. Payslips appear in the app on pay day.' },
      { id: 'ot', heading: 'Overtime', body: 'Overtime is paid at 1.5 times the hourly basic rate (monthly basic × 12 ÷ (52 × 44)). Overtime is capped at 72 hours a month.' },
      { id: 'night', heading: 'Night shift allowance', body: 'Officers rostered on night shifts receive a night shift allowance of $180 a month.' },
      { id: 'cpf', heading: 'CPF', body: 'Employee CPF contributions (20% for staff aged 55 and below) are deducted from gross pay.' },
      { id: 'query', heading: 'Pay queries', body: 'Raise pay queries in the app within 30 days of pay day. HR Shared Services replies within 5 working days.' },
    ],
  },
  {
    id: 'HR-CLAIMS', kind: 'policy', title: 'Claims Policy', siteIds: ['CNP', 'SMC', 'MXT', 'KCH'], version: '2026.1',
    sections: [
      { id: 'transport', heading: 'Transport', body: 'Taxi or ride-hailing fares are claimable when you are deployed to another site or travel between 23:00 and 06:00 for duty. Attach the receipt.' },
      { id: 'meal', heading: 'Meal allowance', body: 'An $8 meal allowance is claimable when your shift is extended by more than 2 hours.' },
      { id: 'deadline', heading: 'Deadline', body: 'Submit claims within 30 days of the expense. Your supervisor approves; payment is with the next salary.' },
    ],
  },
  {
    id: 'HR-LICENCE', kind: 'policy', title: 'Licensing & Training', siteIds: ['CNP', 'SMC', 'MXT', 'KCH'], version: '2026.1',
    sections: [
      { id: 'renew', heading: 'Security officer licence renewal', body: 'Start renewing your security officer licence at least 60 days before it expires. Request renewal in the app; HR books your refresher training and submits the application.' },
      { id: 'expired', heading: 'Expired licence', body: 'An officer whose licence has expired cannot be rostered on security duties until it is renewed.' },
      { id: 'cpr', heading: 'CPR + AED', body: 'CPR + AED certification is renewed every 2 years.' },
    ],
  },
];
