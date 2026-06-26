// Level visual themes: gameplay stays the same, but each campaign level gets a distinct mood.

export interface LevelTheme {
  id: string;
  name: string;
  background: string;
  buildable: string;
  buildableHighlight: string;
  blocked: string;
  path: string;
  pathGlow: string;
  pathCore: string;
  spawn: string;
  spawnRing: string;
  goal: string;
  goalRing: string;
  gridLine: string;
  accent: string;
  ambient: string;
}

const THEMES: LevelTheme[] = [
  {
    id: 'blue-frontier',
    name: 'Blue Frontier',
    background: '#08111f',
    buildable: '#182946',
    buildableHighlight: 'rgba(147,197,253,0.08)',
    blocked: '#07101d',
    path: '#23365a',
    pathGlow: '#3b82f6',
    pathCore: '#93c5fd',
    spawn: '#10b981',
    spawnRing: '#064e3b',
    goal: '#ef4444',
    goalRing: '#7f1d1d',
    gridLine: '#06101d',
    accent: '#60a5fa',
    ambient: 'rgba(96,165,250,0.16)',
  },
  {
    id: 'ember-foundry',
    name: 'Ember Foundry',
    background: '#180b07',
    buildable: '#2a1a14',
    buildableHighlight: 'rgba(251,146,60,0.09)',
    blocked: '#120704',
    path: '#4a2514',
    pathGlow: '#f97316',
    pathCore: '#fed7aa',
    spawn: '#f59e0b',
    spawnRing: '#78350f',
    goal: '#dc2626',
    goalRing: '#7f1d1d',
    gridLine: '#1b0a05',
    accent: '#fb923c',
    ambient: 'rgba(249,115,22,0.16)',
  },
  {
    id: 'frost-array',
    name: 'Frost Array',
    background: '#06151a',
    buildable: '#16323a',
    buildableHighlight: 'rgba(125,211,252,0.1)',
    blocked: '#041014',
    path: '#1d3d47',
    pathGlow: '#06b6d4',
    pathCore: '#a5f3fc',
    spawn: '#22d3ee',
    spawnRing: '#164e63',
    goal: '#f43f5e',
    goalRing: '#881337',
    gridLine: '#06222a',
    accent: '#67e8f9',
    ambient: 'rgba(103,232,249,0.16)',
  },
  {
    id: 'violet-ruins',
    name: 'Violet Ruins',
    background: '#110a20',
    buildable: '#25163d',
    buildableHighlight: 'rgba(196,181,253,0.1)',
    blocked: '#0b0715',
    path: '#332052',
    pathGlow: '#8b5cf6',
    pathCore: '#ddd6fe',
    spawn: '#a78bfa',
    spawnRing: '#4c1d95',
    goal: '#fb7185',
    goalRing: '#881337',
    gridLine: '#160d25',
    accent: '#c4b5fd',
    ambient: 'rgba(196,181,253,0.16)',
  },
  {
    id: 'toxic-marsh',
    name: 'Toxic Marsh',
    background: '#06150b',
    buildable: '#132b1b',
    buildableHighlight: 'rgba(134,239,172,0.09)',
    blocked: '#041008',
    path: '#23411f',
    pathGlow: '#22c55e',
    pathCore: '#bbf7d0',
    spawn: '#84cc16',
    spawnRing: '#365314',
    goal: '#ef4444',
    goalRing: '#7f1d1d',
    gridLine: '#061707',
    accent: '#86efac',
    ambient: 'rgba(134,239,172,0.15)',
  },
  {
    id: 'crimson-core',
    name: 'Crimson Core',
    background: '#16060b',
    buildable: '#2c1018',
    buildableHighlight: 'rgba(248,113,113,0.09)',
    blocked: '#0f0306',
    path: '#47131d',
    pathGlow: '#ef4444',
    pathCore: '#fecaca',
    spawn: '#f97316',
    spawnRing: '#7c2d12',
    goal: '#f43f5e',
    goalRing: '#881337',
    gridLine: '#1f070d',
    accent: '#f87171',
    ambient: 'rgba(248,113,113,0.18)',
  },
];

export function getLevelTheme(levelNumber: number): LevelTheme {
  const index = Math.max(0, Math.min(THEMES.length - 1, levelNumber - 1));
  return THEMES[index];
}
