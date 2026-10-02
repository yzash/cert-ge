/**
 * Design tokens: Certis Mozart navy and orange (Mobility V2 brand continuity) on a
 * 4-pt spacing scale. Dark mode is the default for night shifts.
 */
export const brand = {
  navy: '#0B2A4A',
  navyDeep: '#061A31',
  orange: '#F26B21',
  orangeSoft: '#FF8A4C',
} as const;

export type Palette = {
  bg: string; surface: string; surfaceAlt: string; border: string; text: string; textMuted: string; textInverse: string;
  primary: string; primaryText: string; accent: string; accentText: string;
  pass: string; attention: string; fail: string; info: string; passBg: string; attentionBg: string; failBg: string; infoBg: string;
  overlay: string; tabBar: string;
};

export const dark: Palette = {
  bg: '#07111F', surface: '#0F1E33', surfaceAlt: '#16294A', border: '#23395D', text: '#EEF3FA', textMuted: '#9BB0CC', textInverse: '#07111F',
  primary: brand.orange, primaryText: '#1A0D05', accent: '#4DA3FF', accentText: '#04121F',
  pass: '#3DDC84', attention: '#FFB020', fail: '#FF5A5F', info: '#4DA3FF',
  passBg: 'rgba(61,220,132,0.14)', attentionBg: 'rgba(255,176,32,0.16)', failBg: 'rgba(255,90,95,0.16)', infoBg: 'rgba(77,163,255,0.14)',
  overlay: 'rgba(3,8,16,0.72)', tabBar: '#0A1729',
};

export const light: Palette = {
  bg: '#F3F5F9', surface: '#FFFFFF', surfaceAlt: '#E9EEF6', border: '#D3DCE8', text: '#0B1B30', textMuted: '#52657F', textInverse: '#FFFFFF',
  primary: brand.orange, primaryText: '#FFFFFF', accent: brand.navy, accentText: '#FFFFFF',
  pass: '#14853F', attention: '#B26A00', fail: '#C62828', info: '#1F5FAD',
  passBg: '#E3F5EA', attentionBg: '#FFF1D6', failBg: '#FDE4E4', infoBg: '#E3EEFB',
  overlay: 'rgba(11,27,48,0.55)', tabBar: '#FFFFFF',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;
/** Body text never below 16 pt; tap targets never below 44 pt. */
export const type = { caption: 13, small: 14, body: 16, bodyLg: 17, title: 20, h2: 24, h1: 30 } as const;
export const touch = { min: 44, large: 56, mic: 76 } as const;
