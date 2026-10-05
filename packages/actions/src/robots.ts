/**
 * Robot simulation as a pure function of (state, now): every device and the server compute the
 * same pose without any telemetry ticking through the outbox. In production these values come
 * from the Mozart robotics fleet API; the screens read the same RobotPose shape.
 */
import type { DemoState, Robot, RobotMission, Zone } from '@mozart/schema';

export interface RobotPose {
  robot: Robot;
  x: number;
  y: number;
  zone?: Zone;
  status: 'patrolling' | 'cleaning' | 'paused' | 'moving' | 'returning' | 'holding' | 'docked' | 'charging';
  battery: number;
  mission?: RobotMission;
  /** cleaning: m² cleaned on this mission; patrol: laps completed */
  progress: number;
  pausedReason?: string;
}

type P = { x: number; y: number };

const SPEED = { patrol: 0.9, clean: 0.5, goto: 1.2, return: 1.2 } as const; // m/s
const DRAIN = { patrol: 0.05, clean: 0.08, goto: 0.05, return: 0.05 } as const; // % per minute

function zonesOf(s: DemoState, siteId: string): Zone[] {
  return s.sites.find((x) => x.id === siteId)?.zones ?? [];
}

function offsetFor(id: string): P {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return { x: ((h % 9) - 4) * 1.5, y: ((Math.floor(h / 9) % 9) - 4) * 1.5 };
}

function lengthOf(pts: P[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return L;
}

function along(pts: P[], d: number): P {
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (d <= seg || i === pts.length - 1) {
      const t = seg ? Math.min(1, d / seg) : 1;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
    }
    d -= seg;
  }
  return pts[pts.length - 1];
}

/** Lawnmower sweep inside a zone for cleaning missions. */
function sweep(c: P): P[] {
  const pts: P[] = [];
  for (let i = 0; i < 6; i++) {
    const y = c.y - 10 + i * 4;
    pts.push(i % 2 ? { x: c.x + 14, y } : { x: c.x - 14, y }, i % 2 ? { x: c.x - 14, y } : { x: c.x + 14, y });
  }
  pts.push(pts[0]);
  return pts;
}

export function missionPath(s: DemoState, m: RobotMission, siteId: string): P[] {
  const zones = zonesOf(s, siteId);
  const off = offsetFor(m.robotId);
  const pts = m.waypoints.map((id) => zones.find((z) => z.id === id)).filter(Boolean).map((z) => ({ x: z!.x + off.x, y: z!.y + off.y }));
  if (!pts.length) return [];
  if (m.kind === 'clean') return sweep(pts[0]);
  if (m.loop) return [...pts, pts[0]];
  return m.from ? [m.from, ...pts] : pts;
}

export function nearestZone(zones: Zone[], p: P): Zone | undefined {
  let best: Zone | undefined;
  let bd = Infinity;
  for (const z of zones) {
    const d = Math.hypot(z.x - p.x, z.y - p.y);
    if (d < bd) { bd = d; best = z; }
  }
  return best;
}

export function currentMission(s: DemoState, robotId: string): RobotMission | undefined {
  return s.robotMissions
    .filter((m) => m.robotId === robotId && (m.status === 'active' || m.status === 'paused'))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
}

export function robotPose(s: DemoState, robotId: string, now = Date.now()): RobotPose {
  const robot = s.robots.find((r) => r.id === robotId)!;
  const zones = zonesOf(s, robot.siteId);
  const dock = zones.find((z) => z.id === robot.dockZoneId) ?? zones[0];
  const off = offsetFor(robot.id);
  const m = currentMission(s, robotId);
  const seed = Date.parse(s.seededAt);
  if (!m) {
    // docked: charge from whenever the last mission ended (or the seed)
    const last = s.robotMissions.filter((x) => x.robotId === robotId).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    const since = Math.max(seed, last ? Date.parse(last.startedAt) : seed);
    const battery = Math.min(100, robot.batteryAtSeed + 0.6 * ((now - since) / 60000));
    return { robot, x: dock.x + off.x, y: dock.y + off.y, zone: dock, status: battery < 100 ? 'charging' : 'docked', battery: Math.round(battery), progress: 0 };
  }
  const started = Date.parse(m.startedAt);
  const until = m.status === 'paused' && m.pausedAt ? Date.parse(m.pausedAt) : now;
  const elapsed = Math.max(0, (until - started - (m.pausedMs ?? 0)) / 1000);
  const path = missionPath(s, m, robot.siteId);
  const L = Math.max(1, lengthOf(path));
  const dist = elapsed * SPEED[m.kind];
  const reached = !m.loop && dist >= L;
  const p = path.length ? along(path, m.loop ? dist % L : Math.min(dist, L)) : { x: dock.x, y: dock.y };
  const activeMin = (Math.min(now, until) - Math.max(seed, started)) / 60000;
  const battery = Math.max(5, Math.round(robot.batteryAtSeed - DRAIN[m.kind] * Math.max(0, activeMin)));
  let status: RobotPose['status'];
  if (m.status === 'paused') status = 'paused';
  else if (m.kind === 'return') status = reached ? 'docked' : 'returning';
  else if (m.kind === 'goto') status = reached ? 'holding' : 'moving';
  else status = m.kind === 'clean' ? 'cleaning' : 'patrolling';
  const progress = m.kind === 'clean' ? Math.round(dist * 0.6) : Math.floor(dist / L);
  return { robot, x: p.x, y: p.y, zone: nearestZone(zones, p), status, battery, mission: m, progress, pausedReason: m.pausedReason };
}

export function fleet(s: DemoState, siteId: string, now = Date.now()): RobotPose[] {
  return s.robots.filter((r) => r.siteId === siteId).map((r) => robotPose(s, r.id, now));
}

export function fleetSummary(s: DemoState, siteId: string, now = Date.now()) {
  const poses = fleet(s, siteId, now);
  return {
    total: poses.length,
    working: poses.filter((p) => ['patrolling', 'cleaning', 'moving', 'returning'].includes(p.status)).length,
    paused: poses.filter((p) => p.status === 'paused').length,
    charging: poses.filter((p) => p.status === 'charging' || p.status === 'docked').length,
    lowBattery: poses.filter((p) => p.battery < 25).length,
    openEvents: s.robotEvents.filter((e) => s.robots.find((r) => r.id === e.robotId)?.siteId === siteId && e.status === 'open').length,
    areaCleaned: poses.filter((p) => p.robot.kind === 'cleaning').reduce((a, p) => a + p.progress, 0),
  };
}
