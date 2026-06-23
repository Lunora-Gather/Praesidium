// Centralized balance constants. Tweak here, whole game shifts.
// Designed so Phase 1 is comfortably beatable and later phases scale up.

export const BALANCE = {
  // Economy
  startGold: 200,
  startLives: 20,
  goldPerKill: 12,

  // Waves
  waveCount: 12,
  waveInterDelay: 4, // seconds between waves
  enemySpawnGap: 0.9, // seconds between enemies in a wave
  enemyBaseHp: 30,
  enemyHpGrowth: 1.18, // per wave multiplier
  enemyBaseSpeed: 45, // px/s
  enemyBaseReward: 12,

  // Grid
  tile: 48, // px

  // Default starting tower
  tower: {
    range: 130, // px
    fireRate: 1.6, // shots/sec
    damage: 12,
    projectileSpeed: 360, // px/s
    projectileLife: 1.5, // s
    cost: 60,
    sellRefund: 0.6, // fraction refunded
  },
} as const;
