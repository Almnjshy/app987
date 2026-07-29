/**
 * محرك التخطيط الشبكي (Grid Layout Engine).
 * يستقبل أبعاد الشاشة لينعطف بأمان، ويستخدم (Center-Point) لمنع التداخل نهائياً.
 */

import type { ChainTile, Tile } from '@/types/game';

export interface PositionedTile {
  tile: Tile;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  isDouble: boolean;
}

export interface SnakeLayout {
  tiles: PositionedTile[];
  width: number;
  height: number;
}

type Dir = 'RIGHT' | 'LEFT' | 'DOWN' | 'UP';

interface EndPoint {
  cx: number; // مركز الحافة المكشوفة على المحور السيني
  cy: number; // مركز الحافة المكشوفة على المحور الصادي
  dir: Dir;
}

function getRotation(tile: Tile, inward: number, dir: Dir): number {
  if (dir === 'RIGHT') return tile.top === inward ? 270 : 90;
  if (dir === 'LEFT') return tile.top === inward ? 90 : 270;
  if (dir === 'DOWN') return tile.top === inward ? 0 : 180;
  if (dir === 'UP') return tile.top === inward ? 180 : 0;
  return 0;
}

export function layoutChain(chain: ChainTile[], maxW: number = 20, maxH: number = 20): SnakeLayout {
  if (chain.length === 0) return { tiles: [], width: 0, height: 0 };

  const placed: PositionedTile[] = [];
  const BOUNDARY_X = maxW / 2;
  const BOUNDARY_Y = maxH / 2;

  const place = (tile: Tile, x: number, y: number, w: number, h: number, rotation: number, isDouble: boolean) => {
    placed.push({ tile, x, y, w, h, rotation, isDouble });
  };

  const first = chain.find((c) => c.side === null) || chain[0];
  const fIsDouble = first.tile.isDouble;
  const fw = fIsDouble ? 1 : 2;
  const fh = fIsDouble ? 2 : 1;
  const fx = -fw / 2;
  const fy = -fh / 2;
  place(first.tile, fx, fy, fw, fh, 0, fIsDouble);

  // النقطة المركزية للحافة المكشوفة
  let leftEnd: EndPoint = { cx: fx, cy: fy + fh / 2, dir: 'LEFT' };
  let rightEnd: EndPoint = { cx: fx + fw, cy: fy + fh / 2, dir: 'RIGHT' };

  const buildArm = (isRight: boolean) => {
    let end = isRight ? rightEnd : leftEnd;
    const group = isRight
      ? chain.filter((c) => c.side === 'right')
      : chain.filter((c) => c.side === 'left').reverse();

    for (const ct of group) {
      const tile = ct.tile;
      const isDouble = tile.isDouble;
      const inward = isRight ? ct.left : ct.right;
      
      let dir = end.dir;
      let w = 0, h = 0, x = 0, y = 0, rot = 0;
      let placedSuccessfully = false;

      // محاولة 1: الاستمرار في نفس الاتجاه (حساب بناءً على المركز)
      if (dir === 'RIGHT') {
        w = 2; h = 1; x = end.cx; y = end.cy - 0.5;
        rot = getRotation(tile, inward, dir);
      } else if (dir === 'LEFT') {
        w = 2; h = 1; x = end.cx - 2; y = end.cy - 0.5;
        rot = getRotation(tile, inward, dir);
      } else if (dir === 'DOWN') {
        w = 1; h = 2; x = end.cx - 0.5; y = end.cy;
        rot = getRotation(tile, inward, dir);
      } else if (dir === 'UP') {
        w = 1; h = 2; x = end.cx - 0.5; y = end.cy - 2;
        rot = getRotation(tile, inward, dir);
      }

      // فحص الحدود بناءً على أبعاد الشاشة
      const outOfBounds = x < -BOUNDARY_X || x + w > BOUNDARY_X || y < -BOUNDARY_Y || y + h > BOUNDARY_Y;
      if (!outOfBounds) {
        place(tile, x, y, w, h, rot, isDouble);
        if (dir === 'RIGHT') end = { cx: x + w, cy: end.cy, dir: 'RIGHT' };
        else if (dir === 'LEFT') end = { cx: x, cy: end.cy, dir: 'LEFT' };
        else if (dir === 'DOWN') end = { cx: end.cx, cy: y + h, dir: 'DOWN' };
        else if (dir === 'UP') end = { cx: end.cx, cy: y, dir: 'UP' };
        placedSuccessfully = true;
      }

      // محاولة 2: انعطاف 90 درجة (L-Shape Perfect Corner)
      if (!placedSuccessfully) {
        if (dir === 'RIGHT') dir = isRight ? 'DOWN' : 'UP';
        else if (dir === 'LEFT') dir = isRight ? 'UP' : 'DOWN';
        else if (dir === 'DOWN') dir = isRight ? 'LEFT' : 'RIGHT';
        else if (dir === 'UP') dir = isRight ? 'RIGHT' : 'LEFT';

        if (dir === 'RIGHT') {
          w = 2; h = 1; x = end.cx + 0.5; y = end.cy;
          rot = getRotation(tile, inward, dir);
          end = { cx: x + w, cy: y + 0.5, dir: 'RIGHT' };
        } else if (dir === 'LEFT') {
          w = 2; h = 1; x = end.cx - 2.5; y = end.cy - 1;
          rot = getRotation(tile, inward, dir);
          end = { cx: x, cy: y + 0.5, dir: 'LEFT' };
        } else if (dir === 'DOWN') {
          w = 1; h = 2; x = end.cx - 1; y = end.cy + 0.5;
          rot = getRotation(tile, inward, dir);
          end = { cx: x + 0.5, cy: y + h, dir: 'DOWN' };
        } else if (dir === 'UP') {
          w = 1; h = 2; x = end.cx; y = end.cy - 2.5;
          rot = getRotation(tile, inward, dir);
          end = { cx: x + 0.5, cy: y, dir: 'UP' };
        }

        place(tile, x, y, w, h, rot, isDouble);
      }
    }
    if (isRight) rightEnd = end; else leftEnd = end;
  };

  buildArm(true);
  buildArm(false);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of placed) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.w);
    maxY = Math.max(maxY, p.y + p.h);
  }

  return {
    tiles: placed.map(p => ({ ...p, x: p.x - minX, y: p.y - minY })),
    width: maxX - minX,
    height: maxY - minY
  };
}