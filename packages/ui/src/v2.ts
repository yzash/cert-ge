/**
 * v2 tokens: Certis navy + orange, cleaner. Light-first with a dark variant for night shift.
 * Orange is reserved for the primary action and the mic; navy carries text and structure.
 */
export interface V2Palette {
  mode: 'light' | 'dark';
  bg: string; surface: string; raised: string; sunken: string; border: string; borderStrong: string;
  text: string; textMuted: string; textFaint: string;
  navy: string; navySoft: string; onNavy: string;
  orange: string; orangeSoft: string; onOrange: string;
  pass: string; passSoft: string; warn: string; warnSoft: string; fail: string; failSoft: string; info: string; infoSoft: string;
  shadow: string; scrim: string;
}

export const v2Light: V2Palette = {
  mode: 'light',
  bg: '#F6F7FA', surface: '#FFFFFF', raised: '#FFFFFF', sunken: '#EEF1F5', border: '#E4E8EF', borderStrong: '#CBD3DF',
  text: '#0B1F3A', textMuted: '#55657D', textFaint: '#8A97AB',
  navy: '#0B2A4A', navySoft: '#E7EEF7', onNavy: '#FFFFFF',
  orange: '#F26B21', orangeSoft: '#FFF0E6', onOrange: '#FFFFFF',
  pass: '#15803D', passSoft: '#E7F6EC', warn: '#B45309', warnSoft: '#FEF3E2', fail: '#C2410C', failSoft: '#FDECE6', info: '#1D4ED8', infoSoft: '#E8EEFD',
  shadow: 'rgba(11,31,58,0.08)', scrim: 'rgba(11,31,58,0.35)',
};

export const v2Dark: V2Palette = {
  mode: 'dark',
  bg: '#0A1322', surface: '#0F1A2D', raised: '#15223A', sunken: '#0C1627', border: '#1E2C45', borderStrong: '#2C3E5E',
  text: '#ECF1F8', textMuted: '#9AAAC2', textFaint: '#6D7D96',
  navy: '#9DB8DC', navySoft: '#17263F', onNavy: '#0A1322',
  orange: '#FF7A33', orangeSoft: '#2A1A10', onOrange: '#140A04',
  pass: '#4ADE80', passSoft: '#10291C', warn: '#FBBF24', warnSoft: '#2A2210', fail: '#FB7A55', failSoft: '#2C1612', info: '#7AA2FF', infoSoft: '#141F3B',
  shadow: 'rgba(0,0,0,0.4)', scrim: 'rgba(0,0,0,0.55)',
};

export const v2 = {
  radius: { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40 },
  font: { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' },
  size: { caption: 13, small: 14, body: 16, lead: 18, title: 20, h2: 26, display: 40 },
  touch: 44,
  chatWidth: 760,
} as const;
