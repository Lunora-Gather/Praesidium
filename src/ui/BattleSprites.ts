import type { Renderer } from '../engine/Renderer';

const SIZE = 64;
const DENSITY = 2;
const EDGE = '#101823';
const METAL = '#45566a';
const STEEL = '#9aabb8';
const DARK = '#243144';
type Painter = (ctx: CanvasRenderingContext2D) => void;

function sprite(paint: Painter): HTMLCanvasElement {
  const image = document.createElement('canvas');
  image.width = image.height = SIZE * DENSITY;
  const ctx = image.getContext('2d')!;
  ctx.setTransform(DENSITY, 0, 0, DENSITY, image.width / 2, image.height / 2);
  paint(ctx);
  return image;
}

function plate(ctx: CanvasRenderingContext2D, color: string, points: readonly number[], stroke = EDGE): void {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function metalBlock(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  color: string, rim = STEEL): void {
  ctx.fillStyle = EDGE;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = rim;
  ctx.fillRect(x + 1, y, w - 2, 1.5);
}

function disk(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number,
  color: string, stroke = EDGE): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function shadow(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = '#050a12a8';
  ctx.beginPath();
  ctx.ellipse(-1, 3, width, height, 0, 0, Math.PI * 2);
  ctx.fill();
}

function paintTowerBase(ctx: CanvasRenderingContext2D, id: string, color: string): void {
  shadow(ctx, 22, 18);
  if (id === 'cannon' || id === 'mortar') {
    metalBlock(ctx, -19, -17, 38, 8, '#273647', '#536478');
    metalBlock(ctx, -19, 9, 38, 8, '#273647', '#536478');
    for (let x = -15; x <= 15; x += 5) {
      ctx.fillStyle = '#768899';
      ctx.fillRect(x, -16, 2, 6);
      ctx.fillRect(x, 10, 2, 6);
    }
  }
  plate(ctx, DARK, [-16, -10, -10, -16, 10, -16, 16, -10, 16, 10, 10, 16, -10, 16, -16, 10]);
  plate(ctx, METAL, [-14, -9, -9, -14, 9, -14, 14, -9, 14, 7, 8, 13, -8, 13, -14, 7], '#647889');
  disk(ctx, 0, 0, 10, DARK);
  ctx.fillStyle = color;
  ctx.fillRect(-11, 8, 4, 3);
  ctx.fillRect(7, 8, 4, 3);
}

function paintTowerHead(ctx: CanvasRenderingContext2D, id: string, color: string): void {
  if (id === 'frost') {
    plate(ctx, METAL, [-9, -7, 4, -11, 19, -5, 22, 0, 19, 5, 4, 11, -9, 7]);
    plate(ctx, color, [4, -7, 18, -3, 19, 0, 18, 3, 4, 7]);
    disk(ctx, -4, 0, 4.5, '#d0f6fd');
    return;
  }
  if (id === 'tesla') {
    metalBlock(ctx, 2, -6, 16, 12, METAL);
    disk(ctx, -4, 0, 8, DARK, STEEL);
    for (let x = 7; x <= 18; x += 5) metalBlock(ctx, x, -8, 3, 16, color, '#fff8c8');
    return;
  }
  if (id === 'mortar') {
    plate(ctx, METAL, [-12, -10, 4, -13, 15, -8, 16, 8, 4, 13, -12, 10]);
    disk(ctx, 5, 0, 10, color, STEEL);
    disk(ctx, 5, 0, 6, '#182231');
    ctx.fillStyle = '#dbe6ef';
    ctx.fillRect(11, -5, 3, 10);
    return;
  }
  const heavy = id === 'cannon';
  const long = id === 'sniper';
  if (heavy) {
    metalBlock(ctx, 0, -8, 22, 6, STEEL);
    metalBlock(ctx, 0, 2, 22, 6, STEEL);
    metalBlock(ctx, 19, -9, 6, 8, METAL, color);
    metalBlock(ctx, 19, 1, 6, 8, METAL, color);
  } else {
    const length = long ? 28 : 22;
    metalBlock(ctx, 1, -3, length - 1, 6, STEEL);
    metalBlock(ctx, length - 5, -4, 5, 8, METAL, color);
  }
  plate(ctx, METAL, [-12, -7, -8, -10, 6, -10, 12, -5, 12, 5, 6, 10, -8, 10, -12, 7]);
  metalBlock(ctx, -8, -4, heavy ? 13 : 10, 8, DARK, color);
  ctx.fillStyle = color;
  ctx.fillRect(-7, -2, heavy ? 9 : 6, 4);
}

function paintEnemy(ctx: CanvasRenderingContext2D, id: string, color: string): void {
  shadow(ctx, id === 'boss' ? 25 : 20, 15);
  switch (id) {
    case 'scout':
      plate(ctx, '#644537', [-20, -14, 2, -10, 21, 0, 2, 10, -20, 14, -10, 0], '#171823');
      plate(ctx, color, [-6, -8, 19, 0, -6, 8, -1, 0]);
      disk(ctx, -4, 0, 3, '#fff4cf');
      break;
    case 'zealot':
      plate(ctx, '#633b38', [-21, -4, -6, -15, 10, -10, 21, 0, 10, 10, -6, 15, -21, 4]);
      plate(ctx, color, [-9, -10, 11, 0, -9, 10, 2, 0]);
      metalBlock(ctx, -17, -4, 6, 8, '#d9a393', '#ffe3d8');
      break;
    case 'phantom':
      plate(ctx, '#3d395f', [-20, -14, 6, -16, 20, 0, 6, 16, -20, 14, -8, 0], color);
      plate(ctx, '#766a9d', [-8, -8, 10, -5, 15, 0, 10, 5, -8, 8, -4, 0], color);
      disk(ctx, 8, 0, 4, '#eadfff');
      break;
    case 'brute':
    case 'titan':
    case 'boss': {
      const boss = id === 'boss';
      const siege = id === 'titan';
      const length = boss ? 25 : 20;
      metalBlock(ctx, -length, -18, length * 2, 8, '#33343f', '#314054');
      metalBlock(ctx, -length, 10, length * 2, 8, '#33343f', '#314054');
      for (let x = -length + 4; x < length - 2; x += 6) {
        ctx.fillStyle = '#81909c';
        ctx.fillRect(x, -17, 2, 5);
        ctx.fillRect(x, 11, 2, 5);
      }
      plate(ctx, boss ? '#713c43' : siege ? '#526977' : '#615075', [-length, -9, -13, -14, 11, -14, length, -7, length, 7, 11, 14, -13, 14, -length, 9]);
      if (boss || siege) {
        metalBlock(ctx, 0, -7, boss ? 26 : 22, 5, '#a5afb8', boss ? '#f08980' : '#cae9f0');
        metalBlock(ctx, 0, 2, boss ? 26 : 22, 5, '#a5afb8', boss ? '#f08980' : '#cae9f0');
      }
      disk(ctx, -4, 0, boss ? 10 : 8, boss ? '#d96563' : color, '#c1b6bb');
      if (boss) plate(ctx, '#ffe0a7', [-8, -5, 2, -5, 7, 0, 2, 5, -8, 5, -4, 0]);
      else metalBlock(ctx, -10, -3, 10, 6, DARK, STEEL);
      break;
    }
    default:
      metalBlock(ctx, -16, -14, 23, 8, '#344156', '#8a94a2');
      metalBlock(ctx, -16, 6, 23, 8, '#344156', '#8a94a2');
      plate(ctx, '#784651', [-18, -7, -10, -12, 6, -12, 16, -6, 16, 6, 6, 12, -10, 12, -18, 7]);
      metalBlock(ctx, -5, -5, 13, 10, '#b75f63', color);
      ctx.fillStyle = '#ffdbc5';
      ctx.fillRect(8, -4, 5, 2);
      ctx.fillRect(8, 2, 5, 2);
  }
}

const towers = new Map<string, { base: HTMLCanvasElement; head: HTMLCanvasElement }>();
const enemies = new Map<string, HTMLCanvasElement>();

export function drawTowerSprite(r: Pick<Renderer, 'ctx'>, id: string, color: string, x: number, y: number, size: number, angle: number): void {
  let art = towers.get(id);
  if (!art) {
    art = { base: sprite(ctx => paintTowerBase(ctx, id, color)), head: sprite(ctx => paintTowerHead(ctx, id, color)) };
    towers.set(id, art);
  }
  const half = size / 2;
  const ctx = r.ctx;
  ctx.drawImage(art.base, x - half, y - half, size, size);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(art.head, -half, -half, size, size);
  ctx.restore();
}

export function drawEnemySprite(r: Pick<Renderer, 'ctx'>, id: string, color: string, x: number, y: number, size: number, direction = 0): void {
  const key = `${id}:${direction}`;
  let art = enemies.get(key);
  if (!art) {
    art = sprite(ctx => {
      ctx.rotate(direction * Math.PI / 2);
      paintEnemy(ctx, id, color);
    });
    enemies.set(key, art);
  }
  const half = size / 2;
  r.ctx.drawImage(art, x - half, y - half, size, size);
}
