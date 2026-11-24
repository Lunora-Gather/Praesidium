// Product health diagnostics: converts local analytics into design risks.
// This helps prioritize commercial iteration after playtests.

import type { AnalyticsData } from './Analytics';
import { t } from './i18n';
import { towerName } from './displayText';

export type ProductRiskLevel = 'low' | 'medium' | 'high';

export interface ProductRisk {
  id: string;
  level: ProductRiskLevel;
  title: string;
  detail: string;
}

export interface ProductHealthReport {
  retentionScore: number | null;
  balanceScore: number | null;
  risks: ProductRisk[];
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function risk(id: string, level: ProductRiskLevel, title: string, detail: string): ProductRisk {
  const tower = id.startsWith('tower-dominant-') ? { type: 'dominant', id: id.slice('tower-dominant-'.length) }
    : id.startsWith('tower-') ? { type: 'rare', id: id.slice('tower-'.length) } : undefined;
  const prefix = `health.risk.${tower?.type ?? id}`;
  const localize = (part: string, fallback: string): string => {
    const key = `${prefix}.${part}`;
    const translated = t(key);
    return translated === key ? fallback : tower ? translated.replace('{tower}', towerName(tower.id, tower.id)) : translated;
  };
  return { id, level, title: localize('title', title), detail: localize('detail', detail) };
}

export function buildProductHealth(data: Readonly<AnalyticsData>): ProductHealthReport {
  const risks: ProductRisk[] = [];
  const sessions = Math.max(1, data.sessions);
  const returnRate = clamp01(data.returnDays / sessions);
  const avgMin = data.avgSessionSec / 60;
  const retentionScore = data.timedSessions >= 5 ? Math.round(clamp01(returnRate * 0.55 + Math.min(avgMin / 12, 1) * 0.45) * 100) : null;

  if (retentionScore !== null && returnRate < 0.25) {
    risks.push(risk('return-rate', 'high', 'Weak return signal', 'Players are not returning across distinct days often enough. Strengthen daily missions and visible rewards.'));
  }
  if (retentionScore !== null && avgMin < 4) {
    risks.push(risk('short-session', 'medium', 'Short average session', 'Average session length is low. Improve first-run clarity, early pacing, and visible goals.'));
  }

  const campaign = data.byMode.campaign;
  const finished = campaign?.finished ?? 0;
  const winRate = finished >= 5 ? clamp01((campaign?.won ?? 0) / finished) : null;
  const balanceScore = winRate === null ? null : Math.round(clamp01(1 - Math.abs(0.62 - winRate)) * 100);

  if (winRate !== null && winRate < 0.35) {
    risks.push(risk('low-win-rate', 'high', 'Campaign may be too hard', 'Overall win rate is below the target band. Review Level 1-3 and early upgrade economy.'));
  } else if (winRate !== null && winRate > 0.85) {
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
