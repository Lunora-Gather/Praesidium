import type { AnalyticsData } from './Analytics';
import { buildProductHealth } from './ProductHealth';
import type { SaveData } from './SaveSystem';
import { CURRENT_SCORE, runRecordKey } from './RunRecords';
import { dailyDateStr } from './DailyChallenge';
import { version } from '../../package.json';

export interface PlaytestReport {
  schema: 2;
  game: 'Praesidium';
  version: string;
  exportedAt: string;
  metrics: Readonly<AnalyticsData>;
  progress: {
    maxLevelReached: number;
    totalStars: number;
    missionCredits: number;
    endlessMaxWave: number;
    dailyDate: string;
    dailyMaxWave: number;
  };
  health: ReturnType<typeof buildProductHealth>;
}

export function buildPlaytestReport(data: Readonly<AnalyticsData>, save: Readonly<SaveData>): PlaytestReport {
  const totalStars = Object.values(save.levelStars).reduce((sum, stars) => sum + stars, 0);
  const date = dailyDateStr();
  return {
    schema: 2,
    game: 'Praesidium',
    version,
    exportedAt: new Date().toISOString(),
    metrics: data,
    progress: {
      maxLevelReached: save.maxLevelReached,
      totalStars,
      missionCredits: save.missionCredits,
      endlessMaxWave: save.records[runRecordKey({ kind: 'endless' }, CURRENT_SCORE)]?.furthestWave ?? 0,
      dailyDate: date,
      dailyMaxWave: save.records[runRecordKey({ kind: 'daily', period: date }, CURRENT_SCORE)]?.furthestWave ?? 0,
    },
    health: buildProductHealth(data),
  };
}

export function formatPlaytestReport(report: PlaytestReport): string {
  const risks = report.health.risks.map(item => `${item.level.toUpperCase()}: ${item.title}`).join('; ') || 'None';
  return [
    `Praesidium playtest report (${report.version})`,
    `Exported: ${report.exportedAt}`,
    `Sessions: ${report.metrics.sessions}`,
    `Average active session: ${Math.round(report.metrics.avgSessionSec)}s`,
    `Total active: ${Math.round(report.metrics.totalPlaySec)}s`,
    `Total simulation: ${Math.round(report.metrics.simulatedSec)}s`,
    `Return days: ${report.metrics.returnDays}`,
    `Max level reached: ${report.progress.maxLevelReached}`,
    `Total stars: ${report.progress.totalStars}`,
    `Mission credits: ${report.progress.missionCredits}`,
    `Endless max wave: ${report.progress.endlessMaxWave}`,
    `Daily max wave: ${report.progress.dailyDate || 'none'} / ${report.progress.dailyMaxWave}`,
    `Retention score: ${report.health.retentionScore === null ? 'insufficient sample' : `${report.health.retentionScore}/100`}`,
    `Balance score: ${report.health.balanceScore === null ? 'insufficient sample' : `${report.health.balanceScore}/100`}`,
    `Risks: ${risks}`,
    '',
    JSON.stringify(report, null, 2),
  ].join('\n');
}
