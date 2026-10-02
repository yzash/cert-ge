import type { Officer, Site } from '@mozart/schema';

export const PRIMARY_SITE_ID = 'CNP';

/** Synthetic Jewel-like mall plus three other sites that feed the HQ themes. */
export const sites: Site[] = [
  {
    id: 'CNP',
    name: 'Canopy Mall, Changi',
    short: 'Canopy Mall',
    kind: 'Lifestyle mall & airport link (Jewel-like demo site)',
    supervisorIds: ['o-meiling'],
    zones: [
      { id: 'z-l1-atrium', name: 'L1 Vortex Atrium', level: 'L1', x: 0, y: 0 },
      { id: 'z-l1-link', name: 'L1 Terminal Link Bridge', level: 'L1', x: 90, y: 10 },
      { id: 'z-fcc', name: 'L1 Fire Command Centre', level: 'L1', x: 25, y: 30 },
      { id: 'z-l2-north', name: 'L2 Retail North', level: 'L2', x: 10, y: 70 },
      { id: 'z-l3-south', name: 'L3 Retail South', level: 'L3', x: 0, y: -70 },
      { id: 'z-l4-dining', name: 'L4 Dining Terrace', level: 'L4', x: -40, y: 20 },
      { id: 'z-l5-canopy', name: 'L5 Canopy Park', level: 'L5', x: 0, y: 0 },
      { id: 'z-b2-loading', name: 'B2 Loading Bay', level: 'B2', x: 70, y: -50 },
      { id: 'z-b3-carpark', name: 'B3 Carpark', level: 'B3', x: 20, y: -20 },
      { id: 'z-roof-plant', name: 'Roof Plant Room', level: 'R', x: -60, y: -30 },
    ],
  },
  {
    id: 'SMC',
    name: 'Seletar Medical Centre',
    short: 'Seletar Medical',
    kind: 'Hospital',
    supervisorIds: [],
    zones: [
      { id: 'z-smc-ae', name: 'A&E Entrance', level: 'L1', x: 0, y: 0 },
      { id: 'z-smc-dock', name: 'Service Dock', level: 'B1', x: 50, y: -30 },
    ],
  },
  {
    id: 'MXT',
    name: 'Marina Exchange Tower',
    short: 'Marina Exchange',
    kind: 'Grade-A office tower',
    supervisorIds: [],
    zones: [
      { id: 'z-mxt-lobby', name: 'Main Lobby', level: 'L1', x: 0, y: 0 },
      { id: 'z-mxt-dock', name: 'B1 Loading Dock', level: 'B1', x: 40, y: -20 },
    ],
  },
  {
    id: 'KCH',
    name: 'Kallang Civic Hub',
    short: 'Kallang Civic',
    kind: 'Civic & community district',
    supervisorIds: [],
    zones: [
      { id: 'z-kch-plaza', name: 'Civic Plaza', level: 'L1', x: 0, y: 0 },
      { id: 'z-kch-yard', name: 'Service Yard', level: 'L1', x: 60, y: -10 },
    ],
  },
];

const base = { siteId: 'CNP', languages: ['en'] as Officer['languages'], geSeatStatus: 'assigned' as const, status: 'patrol' as const };

export const officers: Officer[] = [
  { ...base, id: 'o-faizal', name: 'Faizal Rahman', initials: 'FR', title: 'Security Officer', role: 'officer', shiftId: 'night', languages: ['en', 'ms'], zoneId: 'z-l2-north', persona: true },
  { ...base, id: 'o-meiling', name: 'Mei Ling Tan', initials: 'MT', title: 'Site Supervisor', role: 'supervisor', shiftId: 'night', languages: ['en', 'zh'], zoneId: 'z-fcc', persona: true, geSeatStatus: 'standard' },
  { ...base, id: 'o-raj', name: 'Raj Kumar', initials: 'RK', title: 'Head of Security Operations', role: 'hq', siteId: 'HQ', shiftId: 'office', languages: ['en', 'ta'], persona: true, geSeatStatus: 'standard' },
  { ...base, id: 'o-arun', name: 'Arun Pillai', initials: 'AP', title: 'Security Officer (day shift)', role: 'officer', shiftId: 'day', languages: ['en', 'ta'], zoneId: 'z-fcc', persona: true, status: 'off' },
  { ...base, id: 'o-siti', name: 'Siti Aminah', initials: 'SA', title: 'Senior Security Officer', role: 'officer', shiftId: 'day', languages: ['en', 'ms'], zoneId: 'z-fcc', status: 'off' },
  { ...base, id: 'o-daniel', name: 'Daniel Lim', initials: 'DL', title: 'Security Officer', role: 'officer', shiftId: 'night', zoneId: 'z-l1-atrium', currentTaskId: 'CWO-240412' },
  { ...base, id: 'o-kumar', name: 'Kumar Selvam', initials: 'KS', title: 'IFM Technician', role: 'officer', shiftId: 'night', zoneId: 'z-roof-plant', languages: ['en', 'ta'], status: 'task', currentTaskId: 'CWO-240398' },
  { ...base, id: 'o-weijie', name: 'Wei Jie Ong', initials: 'WO', title: 'Security Officer', role: 'officer', shiftId: 'night', zoneId: 'z-b3-carpark', languages: ['en', 'zh'] },
  { ...base, id: 'o-nurul', name: 'Nurul Huda', initials: 'NH', title: 'Security Officer', role: 'officer', shiftId: 'night', zoneId: 'z-l1-link', languages: ['en', 'ms'] },
  { ...base, id: 'o-ravi', name: 'Ravi Chandran', initials: 'RC', title: 'IFM Technician', role: 'officer', shiftId: 'night', zoneId: 'z-b2-loading', status: 'blocked', blockedReason: 'Waiting on override key for Gate 4 — FCC key press empty', languages: ['en', 'ta'] },
  { ...base, id: 'o-hafiz', name: 'Hafiz Ismail', initials: 'HI', title: 'Security Officer', role: 'officer', shiftId: 'night', zoneId: 'z-l4-dining', languages: ['en', 'ms'] },
  { ...base, id: 'o-grace', name: 'Grace Tan', initials: 'GT', title: 'Security Officer', role: 'officer', shiftId: 'night', zoneId: 'z-fcc', status: 'task', languages: ['en', 'zh'] },
  { ...base, id: 'o-marcus', name: 'Marcus Teo', initials: 'MT', title: 'Security Officer', role: 'officer', shiftId: 'night', zoneId: 'z-l5-canopy', status: 'responding', currentTaskId: 'INC-240091' },
  { ...base, id: 'o-aisyah', name: 'Aisyah Rahim', initials: 'AR', title: 'Security Officer', role: 'officer', shiftId: 'night', zoneId: 'z-l3-south', languages: ['en', 'ms'] },
  { ...base, id: 'o-junhao', name: 'Jun Hao Lee', initials: 'JL', title: 'IFM Technician', role: 'officer', shiftId: 'night', zoneId: 'z-l2-north', status: 'break', languages: ['en', 'zh'] },
  { ...base, id: 'o-priya', name: 'Priya Nair', initials: 'PN', title: 'Security Officer', role: 'officer', shiftId: 'night', zoneId: 'z-l1-atrium', languages: ['en', 'ta'] },
  { ...base, id: 'o-ahmad', name: 'Ahmad Yusof', initials: 'AY', title: 'Security Officer', role: 'officer', shiftId: 'night', zoneId: 'z-b3-carpark', languages: ['en', 'ms'] },
  { ...base, id: 'o-sarah', name: 'Sarah Goh', initials: 'SG', title: 'Security Officer', role: 'officer', shiftId: 'night', zoneId: 'z-l1-link', geSeatStatus: 'pending' },
];

export const SHIFT = {
  night: { id: 'night', label: 'Night shift', start: '19:00', end: '07:00' },
  day: { id: 'day', label: 'Day shift', start: '07:00', end: '19:00' },
  office: { id: 'office', label: 'Office hours', start: '09:00', end: '18:00' },
} as const;
