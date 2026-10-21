import {
  CircleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  RingGeometry,
  ShapeGeometry,
  type BufferGeometry,
  type Material,
  type Shape,
} from 'three';
import type { TableGeometry } from '@sinuca/core';
import type { Materials } from '../materials';
import { rectUnionCircles, roundedRect, shapeFrom } from '../shapes';

/** Alturas em mm, com o feltro em y = 0. */
export const HEIGHTS = {
  /** Topo da borracha: o bico fica a ~63% do diâmetro da bola, como nas mesas oficiais. */
  cushionTop: 37,
  railTop: 50,
  railBottom: -60,
  pocketDepth: 150,
};

function extrude(
  shape: Shape,
  bottom: number,
  top: number,
  bevel: number,
  curveSegments = 24,
): BufferGeometry {
  const depth = Math.max(1, top - bottom - bevel * 2);
  const g = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 4,
    curveSegments,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bottom + bevel, 0);
  return g;
}

function flat(shapeGeometry: BufferGeometry, y: number): BufferGeometry {
  shapeGeometry.rotateX(-Math.PI / 2);
  shapeGeometry.translate(0, y, 0);
  return shapeGeometry;
}

function mesh(geometry: BufferGeometry, material: Material, cast = false, receive = true): Mesh {
  const m = new Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

/** Monta a mesa completa (feltro, borrachas, trilhos, caçapas e marcações) em coordenadas do núcleo. */
export function buildTableModel(table: TableGeometry, mat: Materials): Group {
  const group = new Group();
  group.name = 'table';
  const { length: L, width: W, railWidth: rw, cushionWidth: cw } = table.spec;

  // Leito: só a área de jogo, até a garganta das caçapas.
  group.add(mesh(flat(new ShapeGeometry(shapeFrom(table.playfield)), 0), mat.felt));

  // Borrachas com feltro.
  for (const outline of table.cushionShapes) {
    group.add(
      mesh(extrude(shapeFrom(outline), 0, HEIGHTS.cushionTop, 2.5, 8), mat.cushion, true, true),
    );
  }

  // Trilho de madeira com recortes das caçapas.
  const outer = roundedRect(-rw, -rw, L + rw * 2, W + rw * 2, 70, 12);
  const holes = table.pockets.map((p) => ({ x: p.center.x, y: p.center.y, r: p.radius + 2 }));
  const inner = rectUnionCircles(-cw, -cw, L + cw, W + cw, holes);
  group.add(
    mesh(
      extrude(shapeFrom(outer, [inner]), HEIGHTS.railBottom, HEIGHTS.railTop, 7, 12),
      mat.rail,
      true,
      true,
    ),
  );

  // Caçapas: tubo escuro, fundo e couro sobre o trilho.
  const trimOuter = roundedRect(-rw + 15, -rw + 15, L + rw * 2 - 30, W + rw * 2 - 30, 56, 12);
  const trimInner = roundedRect(-rw + 18, -rw + 18, L + rw * 2 - 36, W + rw * 2 - 36, 53, 12);
  group.add(
    mesh(
      flat(new ShapeGeometry(shapeFrom(trimOuter, [trimInner])), HEIGHTS.railTop + 0.9),
      mat.brass,
    ),
  );

  for (const p of table.pockets) {
    const tube = mesh(
      new CylinderGeometry(p.radius, p.radius * 0.9, HEIGHTS.pocketDepth, 48, 1, true),
      mat.pocketLiner,
    );
    tube.position.set(p.center.x, -HEIGHTS.pocketDepth / 2 + 1, p.center.y);
    group.add(tube);
    const bottom = mesh(
      flat(new CircleGeometry(p.radius, 40), -HEIGHTS.pocketDepth + 2),
      mat.pocketBottom,
    );
    bottom.position.set(p.center.x, 0, p.center.y);
    group.add(bottom);
    const rim = mesh(
      flat(new RingGeometry(p.radius + 1, p.radius + 12, 48), HEIGHTS.railTop + 0.6),
      mat.leather,
    );
    rim.position.set(p.center.x, 0, p.center.y);
    group.add(rim);
  }

  // Diamantes (marcadores de mira) embutidos no trilho.
  const diamond = shapeFrom([
    { x: -11, y: 0 },
    { x: 0, y: -6 },
    { x: 11, y: 0 },
    { x: 0, y: 6 },
  ]);
  const railMid = -(cw + rw) / 2 - 4;
  const addDiamond = (x: number, y: number, rotate: boolean) => {
    const d = mesh(flat(new ShapeGeometry(diamond), HEIGHTS.railTop + 0.8), mat.pearl, false, true);
    d.position.set(x, 0, y);
    if (rotate) d.rotation.y = Math.PI / 2;
    group.add(d);
  };
  for (let k = 1; k < 8; k++) {
    if (k === 4) continue;
    addDiamond((L * k) / 8, railMid, false);
    addDiamond((L * k) / 8, W - railMid, false);
  }
  for (let k = 1; k < 4; k++) {
    addDiamond(railMid, (W * k) / 4, true);
    addDiamond(L - railMid, (W * k) / 4, true);
  }

  // Marcas: cabeça, centro e pé da mesa.
  for (const s of [table.headSpot, table.centerSpot, table.footSpot]) {
    const spot = mesh(flat(new CircleGeometry(9, 24), 0.25), mat.spot);
    spot.position.set(s.x, 0, s.y);
    group.add(spot);
  }

  // Base escura sob a mesa.
  const slate = mesh(
    new PlaneGeometry(L + rw * 2, W + rw * 2).rotateX(-Math.PI / 2),
    mat.slate,
    false,
    false,
  );
  slate.position.set(L / 2, -HEIGHTS.pocketDepth - 5, W / 2);
  group.add(slate);

  return group;
}
