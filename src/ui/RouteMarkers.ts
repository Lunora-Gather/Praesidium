export const BASE_MARKER = '#f2c584';

export function drawRouteMarker(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number,
  color: string, background: string, base = false): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = base ? BASE_MARKER : color;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = Math.max(1, radius * .17);
  if (base) {
    ctx.rotate(Math.PI / 4);
    const half = radius * .8;
    ctx.strokeRect(-half * 1.48, -half * 1.48, half * 2.96, half * 2.96);
    ctx.fillRect(-half, -half, half * 2, half * 2);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = background;
    ctx.fillRect(-radius * .28, -radius * .28, radius * .56, radius * .56);
  }
  ctx.restore();
}
