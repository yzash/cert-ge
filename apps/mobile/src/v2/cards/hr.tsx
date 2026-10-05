/**
 * Corporate services in chat: drafts from what the officer said, sent to the in-house HR system
 * only after a confirm tap. Pay amounts stay masked until the officer reveals them, and are
 * never written into the chat history.
 */
import { latestPayslip, leaveSummary, licenceStatus, newId, upcomingRoster } from '@mozart/actions';
import type { Attachment, Claim, LeaveType } from '@mozart/schema';
import { v2 } from '@mozart/ui';
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { SceneImage } from '@/components/media';
import { useMe, useView } from '@/lib/hooks';
import { useApp } from '@/store/app';
import { useChat } from '../chatStore';
import { PhotoButton } from '../photo';
import { Badge, Btn, Chip, Col, Divider, Field, Icon, KV, Meter, Row, Surface, T, useV2 } from '../ui';
import type { CardProps } from './core';
import { streamAnswer } from '../engine';

const TYPES: [LeaveType, string][] = [['annual', 'Annual'], ['medical', 'Medical'], ['childcare', 'Childcare'], ['compassionate', 'Compassionate'], ['unpaid', 'Unpaid']];
const fmtDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) + 1;
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'approved' || status === 'paid' ? 'pass' : status === 'rejected' || status === 'cancelled' ? 'fail' : 'warn';
  return <Badge tone={tone} label={status} />;
}

export function LeaveApplyCard({ threadId, msg }: CardProps) {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const dispatch = useApp((x) => x.dispatch);
  const d = (msg.data ?? {}) as { type?: LeaveType; from?: string | null; to?: string | null; requestId?: string; utterance?: string };
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState<LeaveType>(d.type ?? 'annual');
  const [from, setFrom] = useState(d.from ?? addDays(today, 7));
  const [to, setTo] = useState(d.to ?? d.from ?? addDays(today, 7));
  const [reason, setReason] = useState('');
  const req = d.requestId ? s.leaveRequests.find((r) => r.id === d.requestId) : undefined;
  if (req) {
    return (
      <Surface style={{ gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}><T v="bodyStrong">{req.days} day{req.days > 1 ? 's' : ''} {req.type} leave</T><StatusBadge status={req.status} /></Row>
        <T v="small">{fmtDate(req.from)}{req.to !== req.from ? ` → ${fmtDate(req.to)}` : ''}</T>
        <T v="caption">{req.status === 'pending' ? 'With your supervisor. You’ll get the decision here.' : `Decided by ${s.officers.find((o) => o.id === req.approverId)?.name ?? 'supervisor'}${req.note ? `: ${req.note}` : ''}`}</T>
      </Surface>
    );
  }
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to;
  const days = valid ? daysBetween(from, to) : 0;
  const bal = leaveSummary(s, me.id).find((b) => b.type === type);
  const rostered = valid ? s.roster.filter((r) => r.officerId === me.id && r.date >= from && r.date <= to && r.shiftId !== 'off') : [];
  const short = bal && type !== 'unpaid' && bal.remaining < days;
  const policy = type === 'annual' && valid && daysBetween(today, from) - 1 < 7;
  return (
    <Surface style={{ gap: 12 }}>
      <Row wrap gap={6}>{TYPES.map(([k, l]) => <Chip key={k} label={l} selected={type === k} onPress={() => setType(k)} />)}</Row>
      <Row gap={10} wrap>
        <View style={{ flex: 1, minWidth: 140 }}><Field label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" hint={valid ? fmtDate(from) : undefined} /></View>
        <View style={{ flex: 1, minWidth: 140 }}><Field label="To" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" hint={valid ? fmtDate(to) : undefined} /></View>
      </Row>
      <Row wrap gap={6}>
        {[1, 2, 3].map((n) => <Chip key={n} label={`${n} day${n > 1 ? 's' : ''}`} selected={days === n} onPress={() => setTo(addDays(from, n - 1))} />)}
      </Row>
      {type === 'medical' ? <PhotoButton label="Attach MC" onPick={() => setReason('MC attached')} /> : <Field value={reason} onChangeText={setReason} placeholder="Reason (optional)" />}
      <View style={{ padding: 12, borderRadius: 14, backgroundColor: c.sunken, gap: 6 }}>
        {bal ? <KV k={`${type[0].toUpperCase()}${type.slice(1)} balance`} v={`${bal.remaining} of ${bal.entitled} days left`} strong /> : null}
        {valid ? <KV k="This request" v={`${days} day${days > 1 ? 's' : ''}`} /> : <T v="caption" color={c.warn}>Check the dates.</T>}
        {rostered.length ? <KV k="Shifts to cover" v={rostered.map((r) => `${fmtDate(r.date)} ${r.shiftId}`).join(', ')} /> : valid ? <KV k="Roster" v="No rostered shifts on these days" /> : null}
      </View>
      {short ? <Badge tone="fail" label={`Only ${bal!.remaining} day(s) left`} /> : null}
      {policy ? <Badge tone="warn" label="Annual leave needs 7 days’ notice (HR-LEAVE). Your supervisor can still approve." /> : null}
      <Btn size="lg" icon="paper-plane-outline" label="Send to supervisor" disabled={!valid || !!short}
        onPress={() => {
          const id = newId('LV');
          const r = dispatch({ type: 'leave.apply', request: { id, officerId: me.id, type, from, to, days, reason, status: 'pending', createdAt: new Date().toISOString() } }, { confirm: true });
          if (r.ok) useChat.getState().patchData(threadId, msg.id, { requestId: id });
        }} />
    </Surface>
  );
}

export function LeaveBalanceCard() {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const bals = leaveSummary(s, me.id);
  const reqs = s.leaveRequests.filter((r) => r.officerId === me.id).slice(0, 3);
  return (
    <Surface style={{ gap: 12 }}>
      {bals.map((b) => (
        <Col key={b.type} gap={4}>
          <Row style={{ justifyContent: 'space-between' }}><T v="smallStrong">{b.type[0].toUpperCase() + b.type.slice(1)}</T><T v="small" color={c.text}>{b.remaining} / {b.entitled} days left{b.pending ? ` · ${b.pending} pending` : ''}</T></Row>
          <Meter value={b.remaining / b.entitled} tone={b.remaining / b.entitled < 0.25 ? 'warn' : 'navy'} />
        </Col>
      ))}
      {reqs.length ? <Divider /> : null}
      {reqs.map((r) => <Row key={r.id} style={{ justifyContent: 'space-between' }}><T v="small" color={c.text}>{r.days}d {r.type} · {fmtDate(r.from)}</T><StatusBadge status={r.status} /></Row>)}
    </Surface>
  );
}

export function PayslipCard({ threadId }: CardProps) {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const slips = s.payslips.filter((p) => p.officerId === me.id).sort((a, b) => b.period.localeCompare(a.period));
  const [period, setPeriod] = useState(latestPayslip(s, me.id)?.period);
  const [shown, setShown] = useState(false);
  const p = slips.find((x) => x.period === period);
  if (!p) return <Surface><T v="small">No payslips yet.</T></Surface>;
  const money = (n: number) => (shown ? `S$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'S$ ••••');
  const month = new Date(`${p.period}-01T00:00:00Z`).toLocaleDateString([], { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <Surface style={{ gap: 12 }}>
      <Row wrap gap={6}>{slips.map((x) => <Chip key={x.period} label={new Date(`${x.period}-01T00:00:00Z`).toLocaleDateString([], { month: 'short', timeZone: 'UTC' })} selected={x.period === period} onPress={() => setPeriod(x.period)} />)}</Row>
      <Row style={{ justifyContent: 'space-between' }} align="flex-end">
        <Col gap={2}><T v="label">Net pay · {month}</T><Text style={{ fontSize: 30, fontFamily: v2.font.semibold, color: c.text, letterSpacing: -0.5 }}>{money(p.net)}</Text><T v="caption">Paid {fmtDate(p.paidOn)}</T></Col>
        <Btn size="sm" kind="soft" icon={shown ? 'eye-off-outline' : 'eye-outline'} label={shown ? 'Hide' : 'Show amounts'} onPress={() => setShown(!shown)} />
      </Row>
      <View style={{ padding: 12, borderRadius: 14, backgroundColor: c.sunken, gap: 6 }}>
        <KV k="Basic" v={money(p.basic)} />
        <KV k={`Overtime · ${p.overtimeHours} h`} v={money(p.overtimePay)} />
        {p.allowances.map((a) => <KV key={a.label} k={a.label} v={money(a.amount)} />)}
        <Divider />
        <KV k="Gross" v={money(p.gross)} strong />
        {p.deductions.map((a) => <KV key={a.label} k={a.label} v={`− ${money(a.amount)}`} />)}
      </View>
      <Row wrap>
        <Btn size="sm" kind="ghost" icon="help-circle-outline" label="How is overtime calculated?" onPress={() => {
          useChat.getState().push(threadId, { role: 'user', text: 'How is my overtime calculated?' });
          void streamAnswer(threadId, 'How is my overtime calculated?', me);
        }} />
        <Btn size="sm" kind="ghost" icon="download-outline" label="Download PDF" onPress={() => useApp.getState().toast({ kind: 'info', title: 'Payslip PDF', body: 'Downloaded from the HR system in production; not available on demo data.' })} />
      </Row>
    </Surface>
  );
}

export function ClaimCard({ threadId, msg }: CardProps) {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const dispatch = useApp((x) => x.dispatch);
  const d = (msg.data ?? {}) as { type?: Claim['type'] | null; amount?: number | null; claimId?: string; utterance?: string };
  const [type, setType] = useState<Claim['type']>(d.type ?? 'transport');
  const [amount, setAmount] = useState(d.amount ? String(d.amount) : type === 'meal' ? '8.00' : '');
  const [note, setNote] = useState(d.utterance ?? '');
  const [receipt, setReceipt] = useState<Attachment | null>(null);
  const claim = d.claimId ? s.claims.find((x) => x.id === d.claimId) : undefined;
  if (claim) return <Surface style={{ gap: 6 }}><Row style={{ justifyContent: 'space-between' }}><T v="bodyStrong">${claim.amount.toFixed(2)} {claim.type} claim</T><StatusBadge status={claim.status} /></Row><T v="caption">{claim.status === 'submitted' ? 'With your supervisor. Paid with your next salary once approved.' : 'Decided.'}</T></Surface>;
  const amt = Number(amount);
  return (
    <Surface style={{ gap: 12 }}>
      <Row wrap gap={6}>{(['transport', 'meal', 'medical', 'uniform', 'training'] as const).map((k) => <Chip key={k} label={k[0].toUpperCase() + k.slice(1)} selected={type === k} onPress={() => { setType(k); if (k === 'meal' && !amount) setAmount('8.00'); }} />)}</Row>
      <Row gap={10} wrap>
        <View style={{ width: 160 }}><Field label="Amount (S$)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" /></View>
        <View style={{ flex: 1, minWidth: 180 }}><Field label="What for" value={note} onChangeText={setNote} /></View>
      </Row>
      {receipt ? <View style={{ width: 160 }}><SceneImage uri={receipt.uri} height={100} /></View> : <PhotoButton receipts label="Photo of receipt" onPick={setReceipt} />}
      {type === 'meal' ? <T v="caption">Meal allowance is $8 when a shift runs more than 2 hours over (HR-CLAIMS).</T> : null}
      <Btn size="lg" icon="paper-plane-outline" label="Submit claim" disabled={!(amt > 0) || (type !== 'meal' && !receipt)}
        onPress={() => {
          const id = newId('CL');
          const r = dispatch({ type: 'claim.submit', claim: { id, officerId: me.id, type, amount: amt, date: new Date().toISOString().slice(0, 10), note, receiptUri: receipt?.uri, status: 'submitted', createdAt: new Date().toISOString() } }, { confirm: true });
          if (r.ok) useChat.getState().patchData(threadId, msg.id, { claimId: id });
        }} />
      {type !== 'meal' && !receipt ? <T v="caption" color={c.textFaint}>A receipt is required for this claim type.</T> : null}
    </Surface>
  );
}

export function SwapCard({ threadId, msg }: CardProps) {
  const s = useView();
  const me = useMe();
  const dispatch = useApp((x) => x.dispatch);
  const d = (msg.data ?? {}) as { date?: string | null; swapId?: string };
  const mine = upcomingRoster(s, me.id).filter((r) => r.shiftId !== 'off');
  const [date, setDate] = useState(d.date && mine.some((r) => r.date === d.date) ? d.date : mine[0]?.date);
  const [withId, setWithId] = useState<string | null>(null);
  const free = useMemo(() => s.roster.filter((r) => r.date === date && r.shiftId === 'off' && r.officerId !== me.id && s.officers.find((o) => o.id === r.officerId)?.role === 'officer').map((r) => s.officers.find((o) => o.id === r.officerId)!), [s, date]);
  const sw = d.swapId ? s.shiftSwaps.find((x) => x.id === d.swapId) : undefined;
  if (sw) return <Surface style={{ gap: 6 }}><Row style={{ justifyContent: 'space-between' }}><T v="bodyStrong">Swap {fmtDate(sw.date)} with {s.officers.find((o) => o.id === sw.withOfficerId)?.name}</T><StatusBadge status={sw.status} /></Row></Surface>;
  return (
    <Surface style={{ gap: 12 }}>
      <T v="label">Your shift</T>
      <Row wrap gap={6}>{mine.slice(0, 8).map((r) => <Chip key={r.date} label={`${fmtDate(r.date)} · ${r.shiftId}`} selected={date === r.date} onPress={() => { setDate(r.date); setWithId(null); }} />)}</Row>
      <T v="label">Off that day</T>
      <Row wrap gap={6}>{free.map((o) => <Chip key={o.id} label={o.name} selected={withId === o.id} onPress={() => setWithId(o.id)} />)}{!free.length ? <T v="small">No one is off that day.</T> : null}</Row>
      <Btn size="lg" icon="swap-horizontal" label="Ask to swap" disabled={!withId || !date} onPress={() => {
        const id = newId('SW');
        const r = dispatch({ type: 'swap.request', swap: { id, officerId: me.id, withOfficerId: withId!, date: date!, status: 'pending', note: '', createdAt: new Date().toISOString() } }, { confirm: true });
        if (r.ok) useChat.getState().patchData(threadId, msg.id, { swapId: id });
      }} />
    </Surface>
  );
}

export function RosterCard() {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const days = upcomingRoster(s, me.id, 14);
  return (
    <Surface>
      <Row wrap gap={6}>
        {days.map((r) => (
          <View key={r.date} style={{ width: 64, paddingVertical: 8, borderRadius: 12, alignItems: 'center', gap: 2, backgroundColor: r.shiftId === 'off' ? c.sunken : r.shiftId === 'night' ? c.navy : c.orangeSoft }}>
            <T v="caption" color={r.shiftId === 'night' ? c.onNavy : c.textMuted}>{fmtDate(r.date).split(' ')[0]}</T>
            <T v="smallStrong" color={r.shiftId === 'night' ? c.onNavy : c.text}>{r.date.slice(8)}</T>
            <T v="caption" color={r.shiftId === 'night' ? c.onNavy : c.textMuted}>{r.shiftId}</T>
          </View>
        ))}
      </Row>
    </Surface>
  );
}

export function LicenceCard() {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const dispatch = useApp((x) => x.dispatch);
  const lics = s.licences.filter((l) => l.officerId === me.id);
  return (
    <Surface style={{ gap: 12 }}>
      {lics.map((l) => {
        const st = licenceStatus(l.expiresOn);
        return (
          <Row key={l.id} align="flex-start" gap={12}>
            <Icon name={st.status === 'valid' ? 'shield-checkmark' : 'alert-circle'} size={22} color={st.status === 'valid' ? c.pass : st.status === 'expiring' ? c.warn : c.fail} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="smallStrong">{l.name}</T>
              <T v="caption">{l.number} · expires {fmtDate(l.expiresOn)} ({st.daysLeft} days)</T>
              {st.status !== 'valid' && !l.renewalRequestedAt ? (
                <Row style={{ marginTop: 6 }}><Btn size="sm" icon="refresh" label="Request renewal" onPress={() => dispatch({ type: 'licence.renew', licenceId: l.id }, { confirm: true })} /></Row>
              ) : l.renewalRequestedAt ? <Badge tone="info" label="Renewal requested · HR booking training" /> : null}
            </View>
          </Row>
        );
      })}
    </Surface>
  );
}

export function useHrPending(officerId: string) {
  const s = useView();
  return s.leaveRequests.filter((r) => r.officerId === officerId && r.status === 'pending').length + s.claims.filter((x) => x.officerId === officerId && x.status === 'submitted').length;
}

export function RequestsList() {
  const s = useView();
  const me = useMe();
  const items = [
    ...s.leaveRequests.filter((r) => r.officerId === me.id).map((r) => ({ id: r.id, at: r.createdAt, title: `${r.days}d ${r.type} leave · ${fmtDate(r.from)}`, status: r.status, icon: 'calendar-outline' as const })),
    ...s.claims.filter((r) => r.officerId === me.id).map((r) => ({ id: r.id, at: r.createdAt, title: `$${r.amount.toFixed(2)} ${r.type} claim`, status: r.status, icon: 'receipt-outline' as const })),
    ...s.shiftSwaps.filter((r) => r.officerId === me.id).map((r) => ({ id: r.id, at: r.createdAt, title: `Shift swap · ${fmtDate(r.date)}`, status: r.status, icon: 'swap-horizontal' as const })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <Surface style={{ gap: 10 }}>
      {items.map((i) => <Row key={i.id} gap={10}><Icon name={i.icon} /><T v="small" style={{ flex: 1 }} color={undefined}>{i.title}</T><StatusBadge status={i.status} /></Row>)}
      {!items.length ? <T v="small">No requests yet.</T> : null}
    </Surface>
  );
}
