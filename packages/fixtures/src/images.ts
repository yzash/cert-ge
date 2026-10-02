import type { Verdict } from '@mozart/schema';

/**
 * 10 synthetic "camera" images (SVG) with scripted DEMO verdicts for Visual SOP Verification.
 * They stand in for photos of real Canopy Mall equipment.
 */
export interface FixtureImage {
  id: string;
  label: string;
  assetId: string;
  qr: boolean; // a QR tag is visible in frame
  svg: string;
  verdict: Verdict;
  reason: string;
  observed: { indicator: string; expected: string; observed: string; ok: boolean }[];
  nextStep: { sopId: string; n: number } | null;
  confidence: number;
}

const W = 360;
const H = 480;

function frame(inner: string, bg = '#1b2027', blur = false): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
<radialGradient id="vig" cx="50%" cy="45%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.65"/></radialGradient>
<filter id="blur"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect width="${W}" height="${H}" fill="${bg}"/>
<g ${blur ? 'filter="url(#blur)"' : ''}>${inner}</g>
<rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`;
}

function qrTag(x: number, y: number, label: string): string {
  let cells = '';
  // deterministic pseudo-QR pattern
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
    const on = (i * 7 + j * 3 + label.length) % 3 === 0 || i === 0 || j === 0 || i === 6 || j === 6;
    if (on) cells += `<rect x="${x + 4 + j * 5}" y="${y + 4 + i * 5}" width="5" height="5" fill="#111"/>`;
  }
  return `<rect x="${x}" y="${y}" width="43" height="43" fill="#fff" rx="2"/>${cells}<text x="${x + 21}" y="${y + 55}" font-size="8" fill="#ddd" text-anchor="middle" font-family="monospace">${label}</text>`;
}

function led(x: number, y: number, color: string, on: boolean, label: string): string {
  const fill = on ? color : '#2a2f36';
  return `<circle cx="${x}" cy="${y}" r="9" fill="${fill}" ${on ? 'filter="url(#glow)"' : ''} stroke="#0d0f12" stroke-width="2"/>
<text x="${x + 18}" y="${y + 4}" font-size="11" fill="#cfd5dc" font-family="Arial, sans-serif">${label}</text>`;
}

function panel(opts: { power: boolean; fire: boolean; fault: boolean; supv: boolean; lcd: string; tag: string }): string {
  return `
<rect x="0" y="380" width="${W}" height="100" fill="#3a3f46"/>
<rect x="40" y="40" width="280" height="360" rx="10" fill="#b7342e" stroke="#7d1f1b" stroke-width="4"/>
<rect x="56" y="58" width="248" height="22" fill="#7d1f1b" rx="3"/>
<text x="180" y="74" font-size="13" fill="#fff" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold">FP-2000 FIRE ALARM</text>
<rect x="62" y="96" width="236" height="56" rx="4" fill="#9fd28a" stroke="#333" stroke-width="3"/>
<text x="74" y="120" font-size="14" fill="#123" font-family="monospace">${opts.lcd.split('|')[0] ?? ''}</text>
<text x="74" y="140" font-size="14" fill="#123" font-family="monospace">${opts.lcd.split('|')[1] ?? ''}</text>
<rect x="62" y="166" width="236" height="140" rx="6" fill="#262a30"/>
${led(86, 190, '#3ddc5a', opts.power, 'POWER')}
${led(86, 220, '#ff3b30', opts.fire, 'FIRE')}
${led(86, 250, '#ffd60a', opts.fault, 'FAULT')}
${led(86, 280, '#ff9f0a', opts.supv, 'SUPERVISORY')}
<rect x="196" y="182" width="88" height="22" rx="4" fill="#444"/><text x="240" y="197" font-size="10" fill="#ccc" text-anchor="middle" font-family="Arial">SILENCE</text>
<rect x="196" y="214" width="88" height="22" rx="4" fill="#444"/><text x="240" y="229" font-size="10" fill="#ccc" text-anchor="middle" font-family="Arial">RESET</text>
<rect x="196" y="246" width="88" height="22" rx="4" fill="#444"/><text x="240" y="261" font-size="10" fill="#ccc" text-anchor="middle" font-family="Arial">EVACUATE</text>
<circle cx="240" cy="288" r="8" fill="#888"/><text x="254" y="292" font-size="9" fill="#aaa" font-family="Arial">KEY</text>
${qrTag(250, 320, opts.tag)}`;
}

function gate(openPct: number, lamp: 'off' | 'amber' | 'red', tag: string): string {
  const shutterH = 300 * (1 - openPct);
  const lampColor = lamp === 'amber' ? '#ff9f0a' : lamp === 'red' ? '#ff3b30' : '#2a2f36';
  let slats = '';
  for (let y = 70; y < 70 + shutterH; y += 14) slats += `<rect x="40" y="${y}" width="280" height="12" fill="#a8adb3"/>`;
  return `
<rect x="0" y="0" width="${W}" height="${H}" fill="#2b2f33"/>
<rect x="0" y="380" width="${W}" height="100" fill="#55575a"/>
<rect x="30" y="40" width="300" height="340" fill="#121417"/>
<rect x="30" y="40" width="300" height="30" fill="#4a4f55"/>
<text x="180" y="60" font-size="13" fill="#ffd60a" text-anchor="middle" font-family="Arial" font-weight="bold">SERVICE GATE 4 · B2</text>
${slats}
<rect x="40" y="${70 + shutterH}" width="280" height="8" fill="#ffcc00"/>
${openPct > 0.2 && openPct < 0.9 ? `<line x1="40" y1="${78 + shutterH}" x2="320" y2="${78 + shutterH}" stroke="#ff3b30" stroke-width="2" stroke-dasharray="6 4"/>` : ''}
<rect x="300" y="300" width="50" height="70" rx="4" fill="#d9d9d9"/>
<circle cx="325" cy="320" r="9" fill="${lampColor}" ${lamp !== 'off' ? 'filter="url(#glow)"' : ''}/>
<text x="325" y="345" font-size="8" fill="#333" text-anchor="middle" font-family="Arial">FAULT</text>
<polygon points="70,420 85,380 100,420" fill="#ff6a00"/><polygon points="250,420 265,380 280,420" fill="#ff6a00"/>
${qrTag(8, 300, tag)}`;
}

function gauge(bar: number, tag: string): string {
  const angle = -120 + (bar / 12) * 240;
  const rad = (angle - 90) * Math.PI / 180;
  const nx = 180 + Math.cos(rad) * 95;
  const ny = 220 + Math.sin(rad) * 95;
  let ticks = '';
  for (let v = 0; v <= 12; v++) {
    const a = (-120 + (v / 12) * 240 - 90) * Math.PI / 180;
    ticks += `<line x1="${180 + Math.cos(a) * 105}" y1="${220 + Math.sin(a) * 105}" x2="${180 + Math.cos(a) * 118}" y2="${220 + Math.sin(a) * 118}" stroke="#222" stroke-width="${v % 2 ? 1.5 : 3}"/>`;
    if (v % 2 === 0) ticks += `<text x="${180 + Math.cos(a) * 88}" y="${224 + Math.sin(a) * 88}" font-size="13" text-anchor="middle" font-family="Arial" fill="#222">${v}</text>`;
  }
  const g0 = (-120 + (6 / 12) * 240 - 90) * Math.PI / 180;
  const g1 = (-120 + (8 / 12) * 240 - 90) * Math.PI / 180;
  return `
<rect width="${W}" height="${H}" fill="#3b4148"/>
<rect x="160" y="350" width="40" height="130" fill="#8a9097"/>
<circle cx="180" cy="220" r="135" fill="#c9ced3"/>
<circle cx="180" cy="220" r="125" fill="#f7f7f2"/>
<path d="M ${180 + Math.cos(g0) * 112} ${220 + Math.sin(g0) * 112} A 112 112 0 0 1 ${180 + Math.cos(g1) * 112} ${220 + Math.sin(g1) * 112}" stroke="#34c759" stroke-width="10" fill="none"/>
${ticks}
<text x="180" y="290" font-size="16" text-anchor="middle" font-family="Arial" fill="#333">bar</text>
<text x="180" y="315" font-size="11" text-anchor="middle" font-family="Arial" fill="#666">SPRINKLER MAIN</text>
<line x1="180" y1="220" x2="${nx}" y2="${ny}" stroke="#d00" stroke-width="5" stroke-linecap="round"/>
<circle cx="180" cy="220" r="10" fill="#222"/>
${qrTag(290, 400, tag)}`;
}

function fireDoor(wedged: boolean): string {
  return `
<rect width="${W}" height="${H}" fill="#d8d4cc"/>
<rect x="0" y="400" width="${W}" height="80" fill="#8c8478"/>
<rect x="70" y="60" width="200" height="340" fill="#3b3b3b"/>
${wedged
    ? `<polygon points="70,60 200,90 200,420 70,400" fill="#9e6b3a" stroke="#5a3a1c" stroke-width="3"/><rect x="185" y="392" width="40" height="22" fill="#c8a165" transform="rotate(-8 205 403)"/><text x="205" y="406" font-size="8" fill="#5a3a1c" text-anchor="middle">BOX</text>`
    : `<rect x="70" y="60" width="200" height="340" fill="#9e6b3a" stroke="#5a3a1c" stroke-width="3"/><rect x="235" y="220" width="22" height="8" fill="#ccc"/>`}
<rect x="110" y="110" width="${wedged ? 60 : 120}" height="34" fill="#fff"/>
<text x="${wedged ? 140 : 170}" y="132" font-size="${wedged ? 9 : 14}" text-anchor="middle" font-family="Arial" font-weight="bold" fill="#c00">FIRE DOOR</text>
<text x="180" y="40" font-size="13" text-anchor="middle" font-family="Arial" fill="#333">FD-L2-12 · KEEP SHUT</text>
${qrTag(290, 160, 'FD-L2-12')}`;
}

function aed(): string {
  return `
<rect width="${W}" height="${H}" fill="#e9ecef"/>
<rect x="80" y="70" width="200" height="300" rx="10" fill="#fff" stroke="#2e7d32" stroke-width="6"/>
<rect x="80" y="70" width="200" height="50" rx="10" fill="#2e7d32"/>
<text x="180" y="103" font-size="22" text-anchor="middle" font-family="Arial" font-weight="bold" fill="#fff">AED</text>
<path d="M180 190 l-30 -30 a20 20 0 0 1 30 -25 a20 20 0 0 1 30 25 z" fill="#d32f2f"/>
<polyline points="150,165 168,165 175,150 185,185 192,165 210,165" stroke="#fff" stroke-width="4" fill="none"/>
<circle cx="250" cy="140" r="9" fill="#34c759" filter="url(#glow)"/>
<text x="250" y="160" font-size="8" text-anchor="middle" fill="#333" font-family="Arial">STATUS</text>
<rect x="170" y="330" width="20" height="10" fill="#d32f2f"/><text x="180" y="356" font-size="8" text-anchor="middle" fill="#666">SEAL</text>
${qrTag(20, 400, 'AED-L1-01')}`;
}

export const fixtureImages: FixtureImage[] = [
  {
    id: 'img-fp-l3-supv', label: 'Fire panel L3: supervisory lit', assetId: 'A-FP-L3-01', qr: true,
    svg: frame(panel({ power: true, fire: false, fault: false, supv: true, lcd: 'SUPV Z14 L3S|SPR VALVE TAMPER', tag: 'CNP-FP-L3-01' })),
    verdict: 'attention',
    reason: 'Supervisory LED is lit (amber) for zone Z14, the L3 South sprinkler valve. Tonight’s notice lists planned sprinkler works on this valve (PTW-26-1182), so this is expected but protection in L3 South is impaired.',
    observed: [
      { indicator: 'Power LED', expected: 'Green, steady', observed: 'Green, steady', ok: true },
      { indicator: 'Supervisory LED', expected: 'Off', observed: 'Amber, lit (Z14 valve tamper)', ok: false },
      { indicator: 'Fault LED', expected: 'Off', observed: 'Off', ok: true },
      { indicator: 'Fire alarm LED', expected: 'Off', observed: 'Off', ok: true },
    ],
    nextStep: { sopId: 'SOP-FIRE-007', n: 2 }, confidence: 0.93,
  },
  {
    id: 'img-fp-l3-normal', label: 'Fire panel L3: normal', assetId: 'A-FP-L3-01', qr: true,
    svg: frame(panel({ power: true, fire: false, fault: false, supv: false, lcd: 'SYSTEM NORMAL|02:14  ZONES 64 OK', tag: 'CNP-FP-L3-01' })),
    verdict: 'pass', reason: 'Panel shows normal state: power green, no fire, fault or supervisory indications.',
    observed: [
      { indicator: 'Power LED', expected: 'Green, steady', observed: 'Green, steady', ok: true },
      { indicator: 'Supervisory LED', expected: 'Off', observed: 'Off', ok: true },
      { indicator: 'Fault LED', expected: 'Off', observed: 'Off', ok: true },
      { indicator: 'Fire alarm LED', expected: 'Off', observed: 'Off', ok: true },
    ],
    nextStep: { sopId: 'SOP-FIRE-007', n: 6 }, confidence: 0.96,
  },
  {
    id: 'img-fp-main-fault', label: 'Main panel: earth fault', assetId: 'A-FP-MAIN', qr: true,
    svg: frame(panel({ power: true, fire: false, fault: true, supv: false, lcd: 'FAULT Z03 EARTH|LOOP 2 CARD 1', tag: 'CNP-FP-MAIN' })),
    verdict: 'fail', reason: 'Fault LED lit with an earth fault on loop 2. Detection on that loop may be compromised; this needs a corrective work order and possibly a fire watch.',
    observed: [
      { indicator: 'Power LED', expected: 'Green, steady', observed: 'Green, steady', ok: true },
      { indicator: 'Supervisory LED', expected: 'Off', observed: 'Off', ok: true },
      { indicator: 'Fault LED', expected: 'Off', observed: 'Yellow, lit (earth fault Z03)', ok: false },
      { indicator: 'Fire alarm LED', expected: 'Off', observed: 'Off', ok: true },
    ],
    nextStep: { sopId: 'SOP-FIRE-008', n: 2 }, confidence: 0.9,
  },
  {
    id: 'img-gate-jammed', label: 'Gate 4: jammed half open', assetId: 'A-GT-B2-04', qr: true,
    svg: frame(gate(0.5, 'amber', 'CNP-GT-B2-04')),
    verdict: 'fail', reason: 'Gate is stopped about half open with the fault lamp flashing amber, which the RS-500 guide lists as a limit-switch fault.',
    observed: [
      { indicator: 'Gate position', expected: 'Fully closed when idle', observed: 'Stopped ~50% open', ok: false },
      { indicator: 'Motor fault lamp', expected: 'Off', observed: 'Flashing amber', ok: false },
      { indicator: 'Safety edge', expected: 'Clear, no obstruction', observed: 'Clear', ok: true },
    ],
    nextStep: { sopId: 'SOP-GATE-004', n: 3 }, confidence: 0.92,
  },
  {
    id: 'img-gate-closed', label: 'Gate 4: closed', assetId: 'A-GT-B2-04', qr: true,
    svg: frame(gate(0, 'off', 'CNP-GT-B2-04')),
    verdict: 'pass', reason: 'Gate fully closed, fault lamp off, safety edge clear.',
    observed: [
      { indicator: 'Gate position', expected: 'Fully closed when idle', observed: 'Fully closed', ok: true },
      { indicator: 'Motor fault lamp', expected: 'Off', observed: 'Off', ok: true },
      { indicator: 'Safety edge', expected: 'Clear, no obstruction', observed: 'Clear', ok: true },
    ],
    nextStep: { sopId: 'SOP-GATE-004', n: 6 }, confidence: 0.95,
  },
  {
    id: 'img-gauge-ok', label: 'Sprinkler gauge: 7.1 bar', assetId: 'A-PG-RF-01', qr: true,
    svg: frame(gauge(7.1, 'CNP-PG-RF-01')),
    verdict: 'pass', reason: 'Gauge reads about 7.1 bar, inside the 6.0–8.0 bar band.',
    observed: [{ indicator: 'Pressure gauge', expected: '6.0 to 8.0 bar', observed: '≈ 7.1 bar', ok: true }],
    nextStep: { sopId: 'SOP-FIRE-015', n: 2 }, confidence: 0.88,
  },
  {
    id: 'img-gauge-low', label: 'Sprinkler gauge: 5.2 bar', assetId: 'A-PG-RF-01', qr: true,
    svg: frame(gauge(5.2, 'CNP-PG-RF-01')),
    verdict: 'attention', reason: 'Gauge reads about 5.2 bar, below the 6.0 bar minimum but above the 4.0 bar impairment threshold.',
    observed: [{ indicator: 'Pressure gauge', expected: '6.0 to 8.0 bar', observed: '≈ 5.2 bar', ok: false }],
    nextStep: { sopId: 'SOP-FIRE-015', n: 3 }, confidence: 0.86,
  },
  {
    id: 'img-door-wedged', label: 'Fire door FD-L2-12: wedged', assetId: 'A-FD-L2-12', qr: true,
    svg: frame(fireDoor(true)),
    verdict: 'fail', reason: 'Fire door is held open by a cardboard box; it cannot self-close.',
    observed: [
      { indicator: 'Door leaf', expected: 'Closed, self-closer engaged', observed: 'Open ~40°', ok: false },
      { indicator: 'Obstruction', expected: 'None', observed: 'Cardboard box at base', ok: false },
    ],
    nextStep: { sopId: 'SOP-FIRE-012', n: 1 }, confidence: 0.94,
  },
  {
    id: 'img-aed-ok', label: 'AED cabinet L1', assetId: 'A-AED-L1-01', qr: true,
    svg: frame(aed()),
    verdict: 'pass', reason: 'Status indicator green and cabinet seal intact.',
    observed: [
      { indicator: 'AED status indicator', expected: 'Green', observed: 'Green', ok: true },
      { indicator: 'Cabinet seal', expected: 'Intact', observed: 'Intact', ok: true },
    ],
    nextStep: null, confidence: 0.93,
  },
  {
    id: 'img-blurry', label: 'Panel (blurry, low light)', assetId: 'A-FP-L3-01', qr: false,
    svg: frame(panel({ power: true, fire: false, fault: false, supv: true, lcd: 'SUPV Z14 L3S|SPR VALVE TAMPER', tag: '' }), '#101215', true),
    verdict: 'attention', reason: 'Image is blurred and the indicator labels are not readable. An amber light may be lit but I cannot confirm which.',
    observed: [{ indicator: 'Supervisory LED', expected: 'Off', observed: 'Unclear, possibly lit', ok: false }],
    nextStep: null, confidence: 0.41,
  },
];

export function fixtureImageUri(id: string): string {
  return `fixture://${id}`;
}
