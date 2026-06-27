// Product health diagnostics: converts local analytics into design risks.
// This helps prioritize commercial iteration after playtests.

import type { AnalyticsData } from './Analytics';

export type ProductRiskLevel = 'low' | 'medium' | 'high';

export interface ProductRisk {
  id: string;
  level: ProductRiskLevel;
  title: string;
  detail: string;
}

export interface ProductHealthReport {
  retentionScore: number;
  balanceScore: number;
  risks: ProductRisk[];
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function risk(id: string, level: ProductRiskLevel, title: string, detail: string): ProductRisk {
  return { id, level, title, detail };
}

export function buildProductHealth(data: Readonly<AnalyticsData>): ProductHealthReport {
  const risks: ProductRisk[] = [];
  const sessions = Math.max(1, data.sessions);
  const returnRate = clamp01(data.returnDays / sessions);
  const avgMin = data.avgSessionSec / 60;
  const retentionScore = Math.round(clamp01(returnRate * 0.55 + Math.min(avgMin / 12, 1) * 0.45) * 100);

  if (data.sessions >= 3 && returnRate < 0.25) {
    risks.push(risk('return-rate', 'high', 'Weak return signal', 'Players are not returning across distinct days often enough. Strengthen daily missions and visible rewards.'));
  }
  if (data.sessions >= 3 && avgMin < 4) {
    risks.push(risk('short-session', 'medium', 'Short average session', 'Average session length is low. Improve first-run clarity, early pacing, and visible goals.'));
  }

  const attempted = Object.values(data.levelsAttempted).reduce((sum, item) => sum + item, 0);
  const completed = Object.entries(data.levelsAttempted).reduce((sum, [level, tries]) => {
    return sum + Math.min(tries, data.levelsCompleted[Number(level)] ?? 0);
  }, 0);
  const winRate = attempted > 0 ? completed / attempted : 1;
  const balanceScore = Math.round(clamp01(1 - Math.abs(0.62 - winRate)) * 100);

  if (attempted >= 5 && winRate < 0.35) {
    risks.push(risk('low-win-rate', 'high', 'Campaign may be too hard', 'Overall win rate is below the target band. Review Level 1-3 and early upgrade economy.'));
  } else if (attempted >= 5 && winRate > 0.85) {
    risks.push(risk('high-win-rate', 'medium', 'Campaign may be too easy', 'Overall win rate is very high. Add challenge later, not in Level 1.'));
  }

  const towerUses = Object.entries(data.towerUsage);
  if (towerUses.length >= 4) {
    const total = towerUses.reduce((sum, [, count]) => sum + count, 0);
    for (const [id, count] of towerUses) {
      const share = total > 0 ? count / total : 0;
      if (share < 0.04) risks.push(risk(`tower-${id}`, 'medium', `Low ${id} usage`, 'This tower may lack a clear use case or may be introduced too late.'));
      if (share > 0.45) risks.push(risk(`tower-dominant-${id}`, 'medium', `Dominant ${id} usage`, 'This tower may be too universally efficient or easier to understand than alternatives.'));
    }
  }

  if (data.churnPoints.length >= 3) {
    const earlyDeaths = data.churnPoints.filter(item => item.wave <= 2).length;
    if (earlyDeaths / data.churnPoints.length > 0.5) {
      risks.push(risk('early-churn', 'high', 'Players die too early', 'More than half of recorded deaths happen by wave 2. Improve tutorial pacing or first waves.'));
    }
  }

  return { retentionScore, balanceScore, risks };
}
