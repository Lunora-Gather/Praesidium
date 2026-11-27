import { GameState } from '../src/game/GameState';
import { Enemy } from '../src/game/enemies/Enemy';
import { getEnemyDef } from '../src/game/enemies/EnemyRegistry';
import { Vec2 } from '../src/engine/math/Vec2';

export function denseBattle(): GameState {
  const gs = new GameState();
  gs.setDifficulty('brutal');
  gs.endless = true;
  gs.endlessSeed = 0x5eed;
  gs.selectLevel(0);
  gs.waves.forceNext();
  gs.lives = 9999;
  gs.gold = 25000;

  // Seed a heavy field directly so the test measures update cost under load
  // instead of depending on wave timing or a specific bot layout.
  const enemyIds = ['grunt', 'scout', 'brute', 'zealot', 'phantom', 'titan'];
  for (let i = 0; i < 240; i++) {
    const def = getEnemyDef(enemyIds[i % enemyIds.length]);
    const start = gs.grid.waypoints[i % Math.max(1, gs.grid.waypoints.length - 1)];
    const enemy = new Enemy(def, start, 1000, 0.35);
    enemy.pos = enemy.pos.add(new Vec2((i % 9) * 3, Math.floor(i / 9) % 5 * 3));
    gs.enemies.push(enemy);
  }

  // Place a compact mixed battery to create projectile and splash pressure.
  const towerIds = ['turret', 'frost', 'mortar', 'sniper', 'tesla', 'cannon'];
  let towerIndex = 0;
  for (let ty = 0; ty < gs.grid.rows && towerIndex < 100; ty++) {
    for (let tx = 0; tx < gs.grid.cols && towerIndex < 100; tx++) {
      if (!gs.grid.isBuildable(tx, ty) || gs.towers.some(t => t.tx === tx && t.ty === ty)) continue;
      gs.selectedTowerId = towerIds[towerIndex % towerIds.length];
      if (gs.tryPlace(tx, ty)) towerIndex++;
    }
  }
  return gs;
}
