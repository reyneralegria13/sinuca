import { Path, Shape, Vector2 } from 'three';
import type { Vec2 } from '@sinuca/core';

/**
 * As formas 2D do three.js ficam no plano XY. Para deitar na mesa (XZ, normal para cima)
 * invertemos y aqui e depois giramos a geometria −90° em X: (x, −y) → (x, 0, y).
 */
export function shapeFrom(
  points: readonly Vec2[],
  holes: readonly (readonly Vec2[])[] = [],
): Shape {
  const shape = new Shape(points.map((p) => new Vector2(p.x, -p.y)));
  for (const hole of holes) shape.holes.push(new Path(hole.map((p) => new Vector2(p.x, -p.y))));
  return shape;
}

export function roundedRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  segments = 10,
): Vec2[] {
  const pts: Vec2[] = [];
  const corner = (cx: number, cy: number, start: number) => {
    for (let i = 0; i <= segments; i++) {
      const a = start + (i / segments) * (Math.PI / 2);
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
  };
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  return pts;
}

export interface Circle {
  x: number;
  y: number;
  r: number;
}

/**
 * Contorno da união de um retângulo com círculos que o atravessam, amostrado em raios
 * a partir do centro (a união é estrelada em relação ao centro do retângulo).
 */
export function rectUnionCircles(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  circles: readonly Circle[],
  samples = 1440,
): Vec2[] {
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const pts: Vec2[] = [];
  for (let i = 0; i < samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const tx = dx > 0 ? (maxX - cx) / dx : dx < 0 ? (minX - cx) / dx : Infinity;
    const ty = dy > 0 ? (maxY - cy) / dy : dy < 0 ? (minY - cy) / dy : Infinity;
    let t = Math.min(tx, ty);
    for (const c of circles) {
      const fx = c.x - cx;
      const fy = c.y - cy;
      const proj = fx * dx + fy * dy;
      const perp2 = fx * fx + fy * fy - proj * proj;
      if (perp2 <= c.r * c.r) t = Math.max(t, proj + Math.sqrt(c.r * c.r - perp2));
    }
    pts.push({ x: cx + dx * t, y: cy + dy * t });
  }
  return pts;
}
