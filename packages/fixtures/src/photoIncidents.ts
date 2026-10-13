import type { PhotoCategory, ReportDraft } from '@mozart/schema';

export type PhotoIncidentCategory = PhotoCategory;

/**
 * Pregenerated responses for "take a photo and report it" in DEMO mode. The photo itself is not
 * analysed in DEMO (the card says so); LIVE sends it to Gemini multimodal via POST /reports/photo.
 */
export const photoIncidentDrafts: Record<PhotoIncidentCategory, {
  label: string;
  label_zh: string;
  draft: Omit<ReportDraft, 'zoneId' | 'location'>;
  observations: string[];
  confidence: Partial<Record<keyof ReportDraft, number>>;
}> = {
  suspicious_item: {
    label: 'Suspicious item', label_zh: '可疑物品',
    draft: { type: 'incident', title: 'Unattended bag reported with photo', assetId: null, severity: 'medium', recommendedSopId: 'SOP-SEC-010',
      description: 'Unattended bag photographed on site. No owner visible in the frame. Item not concealed; no wires, liquids or odour reported. Area being watched; HOT assessment in progress.' },
    observations: ['Bag or package on the floor or a bench', 'No person within arm’s reach in the frame', 'Item is not hidden'],
    confidence: { type: 0.86, title: 0.82, severity: 0.64, description: 0.8, recommendedSopId: 0.9 },
  },
  suspicious_person: {
    label: 'Suspicious person', label_zh: '可疑人员',
    draft: { type: 'incident', title: 'Suspicious person observed', assetId: null, severity: 'medium', recommendedSopId: 'SOP-SEC-011',
      description: 'Person photographed loitering after hours and watching the service corridor entrance. Officer observing from a safe distance; not approached. Description sent to FCC for CCTV pickup.' },
    observations: ['One person in frame', 'Area appears closed to the public', 'No weapon visible'],
    confidence: { type: 0.84, title: 0.78, severity: 0.62, description: 0.76, recommendedSopId: 0.88 },
  },
  forced_entry: {
    label: 'Forced entry / trespass', label_zh: '强行闯入',
    draft: { type: 'incident', title: 'Signs of forced entry at door', assetId: null, severity: 'high', recommendedSopId: 'SOP-SEC-011',
      description: 'Door photographed with damage around the lock and the frame pried open. No one seen inside. Area cordoned; FCC informed to check CCTV and the access log for the last 2 hours.' },
    observations: ['Damage near the lock or latch', 'Door not fully closed', 'No person visible'],
    confidence: { type: 0.88, title: 0.8, severity: 0.72, description: 0.78, recommendedSopId: 0.7 },
  },
  vandalism: {
    label: 'Vandalism / damage', label_zh: '破坏公物',
    draft: { type: 'incident', title: 'Vandalism to property', assetId: null, severity: 'low', recommendedSopId: 'SOP-OPS-006',
      description: 'Damage to fixtures photographed (graffiti / broken panel). No one present. Photo kept as evidence; FCC to review CCTV for the time window.' },
    observations: ['Visible damage or markings', 'No person present'],
    confidence: { type: 0.82, title: 0.8, severity: 0.68, description: 0.78, recommendedSopId: 0.66 },
  },
  theft: {
    label: 'Theft', label_zh: '盗窃',
    draft: { type: 'incident', title: 'Theft reported by tenant', assetId: null, severity: 'medium', recommendedSopId: 'SOP-SEC-018',
      description: 'Tenant reports items taken; display area photographed. Suspect not detained (per SOP). CCTV preservation requested from FCC; tenant advised to make a police report.' },
    observations: ['Display or shelf with missing items', 'Store area'],
    confidence: { type: 0.84, title: 0.76, severity: 0.66, description: 0.74, recommendedSopId: 0.92 },
  },
  aggression: {
    label: 'Fight / aggression', label_zh: '打架/冲突',
    draft: { type: 'incident', title: 'Aggressive behaviour, police may be needed', assetId: null, severity: 'high', recommendedSopId: 'SOP-SEC-020',
      description: 'Two people in a heated argument photographed from a safe distance. Second officer requested; FCC to call police if violence is threatened. Body-worn camera on.' },
    observations: ['Two or more people in close confrontation', 'Public area'],
    confidence: { type: 0.86, title: 0.78, severity: 0.7, description: 0.76, recommendedSopId: 0.9 },
  },
};

function phone(inner: string, bg = '#3a3f46'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 480" width="360" height="480"><rect width="360" height="480" fill="${bg}"/>${inner}</svg>`;
}

/** Phone-camera stand-ins for presenting on a laptop (portrait, like a real phone photo). */
export const securityPhotos: { id: string; label: string; category: PhotoIncidentCategory; svg: string }[] = [
  {
    id: 'photo-bag', label: 'Bag left by the lift lobby', category: 'suspicious_item',
    svg: phone(`<rect x="0" y="300" width="360" height="180" fill="#8d8a84"/><rect x="40" y="40" width="120" height="250" fill="#b9c0c8"/><rect x="200" y="40" width="120" height="250" fill="#b9c0c8"/><rect x="96" y="150" width="8" height="40" fill="#556"/><rect x="40" y="290" width="280" height="10" fill="#666"/><rect x="150" y="330" width="80" height="96" rx="16" fill="#1d1f22"/><rect x="170" y="316" width="40" height="22" rx="10" fill="none" stroke="#1d1f22" stroke-width="7"/><rect x="160" y="370" width="60" height="30" rx="6" fill="#2b2e33"/>`),
  },
  {
    id: 'photo-door', label: 'Service door, lock pried', category: 'forced_entry',
    svg: phone(`<rect x="70" y="40" width="220" height="420" fill="#5d6b78"/><rect x="84" y="56" width="192" height="404" fill="#7f8f9e"/><rect x="236" y="230" width="28" height="44" rx="4" fill="#c7cbd0"/><path d="M228 214 L276 206 L270 296 L224 290 Z" fill="none" stroke="#e9e3d0" stroke-width="3"/><path d="M250 190 L262 220 L246 240 L266 262" stroke="#2a2a2a" stroke-width="4" fill="none"/><rect x="276" y="60" width="14" height="400" fill="#2a2f36"/><text x="180" y="120" font-family="Arial" font-size="16" fill="#e8edf2" text-anchor="middle">STAFF ONLY</text>`, '#2b3138'),
  },
  {
    id: 'photo-graffiti', label: 'Graffiti on stairwell wall', category: 'vandalism',
    svg: phone(`<rect width="360" height="480" fill="#d5d1c8"/><rect x="0" y="380" width="360" height="100" fill="#9b968c"/><path d="M40 160 C90 90 140 230 190 150 S280 120 320 200" stroke="#d6336c" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M60 250 L120 210 L150 270 L210 220 L250 280" stroke="#1c7ed6" stroke-width="12" fill="none" stroke-linecap="round"/><text x="180" y="340" font-family="Arial" font-size="22" font-weight="bold" fill="#333" text-anchor="middle" transform="rotate(-6 180 340)">XRZ</text><text x="300" y="60" font-family="Arial" font-size="14" fill="#555">B2</text>`),
  },
  {
    id: 'photo-person', label: 'Person by the loading bay after hours', category: 'suspicious_person',
    svg: phone(`<rect width="360" height="480" fill="#1f2730"/><rect x="0" y="330" width="360" height="150" fill="#3a4048"/><rect x="20" y="80" width="200" height="250" fill="#4a5560"/><rect x="30" y="90" width="180" height="230" fill="none" stroke="#6b7682" stroke-width="4"/><circle cx="270" cy="210" r="22" fill="#b08d6e"/><rect x="246" y="234" width="48" height="110" rx="12" fill="#2f3d52"/><rect x="250" y="340" width="16" height="60" fill="#22252a"/><rect x="274" y="340" width="16" height="60" fill="#22252a"/><circle cx="300" cy="30" r="18" fill="#ffe8a3" opacity="0.6"/>`),
  },
];

/** DEMO: which pregenerated draft a demo photo maps to. */
export const securityPhotoCategory = (uri: string): PhotoIncidentCategory | undefined =>
  securityPhotos.find((p) => uri === `fixture://${p.id}`)?.category ?? (uri === 'fixture://snap-bag' ? 'suspicious_item' : uri === 'fixture://snap-person' ? 'suspicious_person' : undefined);
