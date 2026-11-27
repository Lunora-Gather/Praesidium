import { TOWER_LIST, getTowerDef } from '../game/towers/TowerRegistry';
import { ENEMY_DEFS } from '../game/enemies/EnemyRegistry';
import { DamageType } from '../game/DamageType';
import { t } from '../utils/i18n';
import { enemyDescription, enemyName, strategyName, towerDescription, towerName, traitName } from '../utils/displayText';
import { drawEnemySprite, drawTowerSprite } from './BattleSprites';
import './codex.css';

type CodexTab = 'towers' | 'enemies';
const damageTypes = [DamageType.Physical, DamageType.Fire, DamageType.Ice, DamageType.Lightning] as const;

export class CodexScreen {
  private readonly dialog = document.querySelector<HTMLDialogElement>('#codex-screen')!;
  private readonly heading = this.dialog.querySelector<HTMLElement>('#codex-heading')!;
  private readonly list = this.dialog.querySelector<HTMLUListElement>('#codex-list')!;
  private readonly scroll = this.dialog.querySelector<HTMLElement>('.codex-scroll')!;
  private readonly tabs = this.dialog.querySelectorAll<HTMLButtonElement>('[data-codex-tab]');
  private readonly back = this.dialog.querySelector<HTMLButtonElement>('.codex-back')!;
  private tab: CodexTab = 'towers';

  constructor(onClose: () => void) {
    this.back.onclick = () => this.close();
    this.dialog.addEventListener('close', onClose);
    for (const button of this.tabs) button.onclick = () => {
      const next = button.dataset.codexTab as CodexTab;
      if (this.tab === next) return;
      this.tab = next;
      this.render();
      this.scroll.scrollTop = 0;
    };
  }

  get isOpen(): boolean { return this.dialog.open; }

  open(): void {
    if (this.isOpen) return;
    this.back.textContent = t('common.backToPause');
    this.heading.textContent = t('codex.title');
    this.render();
    this.dialog.showModal();
    this.heading.focus({ preventScroll: true });
  }

  close(): void {
    if (this.isOpen) this.dialog.close();
  }

  private render(): void {
    for (const button of this.tabs) {
      const tab = button.dataset.codexTab;
      button.textContent = t(`codex.${tab}`);
      button.setAttribute('aria-pressed', String(tab === this.tab));
    }
    const rows = this.tab === 'towers' ? TOWER_LIST.map(tower => {
      const stats = [
        `${this.damageTypeName(tower.damageType)} · ${tower.cost}g`,
        `${t('tower.range')} ${Math.round(tower.range)}`,
        `${t('codex.strategy')} ${strategyName(tower.defaultStrategy, tower.defaultStrategy)}`,
      ];
      return this.row(towerName(tower.id, tower.name), towerDescription(tower.id, tower.description), stats,
        ctx => drawTowerSprite({ ctx }, tower.id, tower.color, 64, 64, 118, -.36));
    }) : Object.values(ENEMY_DEFS).map(enemy => {
      const resist = damageTypes.flatMap(type => enemy.resist?.[type] === undefined ? []
        : [`${this.damageTypeName(type)} ×${enemy.resist[type]}`]);
      const counters = enemy.recommendedTowerIds.map(id => towerName(id, getTowerDef(id).name));
      const stats = [enemy.traits.map(traitName).join(' · '),
        `${t('codex.resist')} ${resist.join(' · ') || t('codex.none')}`,
        `${t('codex.counters')} ${counters.join(' · ')}`];
      return this.row(enemyName(enemy.id, enemy.name), enemyDescription(enemy.id, enemy.description), stats,
        ctx => drawEnemySprite({ ctx }, enemy.id, enemy.color, 64, 64, 118));
    });
    this.list.replaceChildren(...rows);
  }

  private row(name: string, description: string, stats: string[], paint: (ctx: CanvasRenderingContext2D) => void): HTMLLIElement {
    const row = document.createElement('li');
    const art = document.createElement('canvas');
    art.width = art.height = 128;
    art.setAttribute('aria-hidden', 'true');
    paint(art.getContext('2d')!);
    const details = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = name;
    const text = document.createElement('p');
    text.textContent = description;
    const facts = document.createElement('ul');
    for (const info of stats) {
      const fact = document.createElement('li');
      fact.textContent = info;
      facts.append(fact);
    }
    details.append(title, text, facts);
    row.append(art, details);
    return row;
  }

  private damageTypeName(type: DamageType): string {
    switch (type) {
      case DamageType.Physical: return t('damage.physical');
      case DamageType.Fire: return t('damage.fire');
      case DamageType.Ice: return t('damage.ice');
      case DamageType.Lightning: return t('damage.lightning');
      default: return t('codex.none');
    }
  }
}
