// Daily missions: deterministic daily objectives that add retention beyond a single run.
// They are intentionally local/offline so GitHub Pages can support them without a backend.

import type { RunStats } from '../game/StatsTracker';

export type MissionKind = 'kills' | 'waves' | 'upgrades' | 'spells' | 'towers' | 'score';

export interface DailyMission {
  id: string;
  kind: MissionKind;
  title: string;
  description: string;
  target: number;
  reward: number;
}

export interface MissionProgress {
  mission: DailyMission;
  value: number;
  complete: boolean;
}

export interface MissionRunSnapshot {
  wave: number;
  score: number;
  stats: Pick<RunStats, 'kills' | 'upgrades' | 'spellsCast' | 'towersPlaced'>;
}

const POOL: Array<Omit<DailyMission, 'id'>> = [
  { kind: 'kills', title: 'Clean Sweep', description: 'Defeat enemies in any run.', target: 160, reward: 1 },
  { kind: 'waves', title: 'Hold the Line', description: 'Reach a target wave in any mode.', target: 8, reward: 1 },
  { kind: 'upgrades', title: 'Field Engineer', description: 'Upgrade towers during a run.', target: 4, reward: 1 },
  { kind: 'spells', title: 'Crisis Response', description: 'Use support abilities during pressure.', target: 3, reward: 1 },
  { kind: 'towers', title: 'Forward Base', description: 'Place enough towers to secure the route.', target: 5, reward: 1 },
  { kind: 'score', title: 'High Command', description: 'Reach a score target.', target: 2200, reward: 1 },
];

function mix(seed: number): number {
  let x = seed >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x >>> 0;
}

export function dailyMissions(dateStr: string): DailyMission[] {
  const numeric = parseInt(dateStr.replace(/-/g, ''), 10) || 20260101;
  let seed = mix(numeric * 2654435761);
  const pool = [...POOL];
  const result: DailyMission[] = [];
  while (result.length < 3 && pool.length > 0) {
    seed = mix(seed + result.length + 1);
    const index = seed % pool.length;
    const item = pool.splice(index, 1)[0];
    result.push({ ...item, id: `${dateStr}:${item.kind}` });
  }
  return result;
}

export function missionValue(kind: MissionKind, run: MissionRunSnapshot): number {
  switch (kind) {
    case 'kills': return run.stats.kills;
    case 'waves': return run.wave;
    case 'upgrades': return run.stats.upgrades;
    case 'spells': return run.stats.spellsCast;
    case 'towers': return run.stats.towersPlaced;
    case 'score': return run.score;
  }
}

export function evaluateMissions(missions: DailyMission[], run: MissionRunSnapshot): MissionProgress[] {
  return missions.map(mission => {
    const value = missionValue(mission.kind, run);
    return { mission, value, complete: value >= mission.target };
  });
}

export function missionSummary(progress: MissionProgress[]): string {
  const complete = progress.filter(item => item.complete).length;
  return `${complete}/${progress.length} daily objectives complete`;
}
