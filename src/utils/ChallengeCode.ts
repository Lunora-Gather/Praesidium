import type { Difficulty } from '../config/Difficulty';
import { isTalentLoadout, type TalentLoadout } from '../game/Talents';
import { isWeekKey } from './WeeklyMode';
import { CURRENT_RULES, CURRENT_RUN_VERSION, CURRENT_SCORE, type RunVersion } from './RunRecords';

export interface ChallengeRules {
  seed: number;
  difficulty: Difficulty;
  weeklyKey: string | null;
  talentRanks: TalentLoadout;
  variedOpener: boolean;
  version?: RunVersion | null;
}

const DIFFICULTIES = { N: 'normal', H: 'hard', B: 'brutal' } as const;
const CODE_CHAR: Record<Difficulty, string> = { normal: 'N', hard: 'H', brutal: 'B' };

export function encodeChallenge(rules: ChallengeRules): string {
  const hex = rules.seed.toString(16).padStart(8, '0').toUpperCase();
  const version = rules.version === undefined ? CURRENT_RUN_VERSION : rules.version;
  const prefix = version ? `P2-R${version.rules}-S${version.score}` : 'P1';
  return `${prefix}-${hex}-${CODE_CHAR[rules.difficulty]}${rules.variedOpener ? 'V' : ''}-${rules.weeklyKey ?? 'NONE'}-${rules.talentRanks.join('')}`;
}

export function unsupportedChallengeVersion(value: string): boolean {
  const match = /^P(\d+)(?:-R(\d+)-S(\d+))?-/i.exec(value.trim());
  return !!match && match[1] !== '1' && (match[1] !== '2' || (match[2] !== undefined
    && (match[2] !== String(CURRENT_RULES) || match[3] !== String(CURRENT_SCORE))));
}

export function decodeChallenge(value: string): ChallengeRules | { seed: number } | null {
  const input = value.trim().toUpperCase();
  if (/^(?:0X)?[0-9A-F]{1,8}$/.test(input)) {
    const seed = Number.parseInt(input, 16);
    return seed === 0 ? null : { seed };
  }

  if (unsupportedChallengeVersion(input)) return null;
  const match = /^P(1|2(?:-R\d+-S\d+))-([0-9A-F]{8})-([NHB])(V?)-(NONE|\d{4}-W\d{2})-(\d+)$/.exec(input);
  if (!match) return null;
  const [, version, hex, difficulty, varied, week, ranks] = match;
  const seed = Number.parseInt(hex, 16);
  const talentRanks = Array.from(ranks, Number);
  if (seed === 0 || (week !== 'NONE' && !isWeekKey(week)) || !isTalentLoadout(talentRanks)) return null;
  return {
    seed, difficulty: DIFFICULTIES[difficulty as keyof typeof DIFFICULTIES],
    weeklyKey: week === 'NONE' ? null : week, talentRanks, variedOpener: varied === 'V',
    version: version === '1' ? null : CURRENT_RUN_VERSION,
  };
}
