/**
 * محرك التخطيط الشبكي (Grid Layout Engine).
 * يعتمد على حد ثابت للانعطاف، ويعالج وضعية المزدوجة (Perpendicular) بدقة.
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
  cx: number;
  cy: number;
  dir: Dir;
}

const BOUNDARY = 6; // حد ثابت للانعطاف

function getRotation(tile: Tile, inward: number, dir: Dir): number {
  if (dir === 'RIGHT') return tile.top === inward ? 270 : 90;
  if (dir === 'LEFT') return tile.top === inward ? 90 : 270;
  if (dir === 'DOWN') return tile.top === inward ? 0 : 180;
  if (dir === 'UP') return tile.top === inward ? 180 : 0;
  return 0;
}

export function layoutChain(chain: ChainTile[]): SnakeLayout {
  if (chain.length === 0) return { tiles: [], width: 0, height: 0 };

  const placed: PositionedTile[] = [];
  const place = (tile: Tile, x: number, y: number, w: number, h: number, rotation: number, isDouble: boolean) => {
    placed.push({ tile, x, y, w, h, rotation, isDouble });
  };

  // 1. وضع القطعة الأولى
  const first = chain.find((c) => c.side === null) || chain[0];
  const fIsDouble = first.tile.isDouble;
  const fw = fIsDouble ? 1 : 2;
  const fh = fIsDouble ? 2 : 1;
  const fx = -fw / 2;
  const fy = -fh / 2;
  // إذا كانت مزدوجة توضع عمودية (0)، وإذا كانت عادية توضع أفقية (90)
  place(first.tile, fx, fy, fw, fh, fIsDouble ? 0 : 90, fIsDouble);

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

      // دالة ذكية لتحديد الأبعاد والاتجاه بناءً على نوع القطعة
      const setDims = (currentDir: Dir) => {
        if (currentDir === 'RIGHT' || currentDir === 'LEFT') {
          if (isDouble) {
            w = 1; h = 2; rot = 0; // مزدوجة عمودية في خط أفقي
          } else {
            w = 2; h = 1; rot = getRotation(tile, inward, currentDir);
          }
        } else { // DOWN أو UP
          if (isDouble) {
            w = 2; h = 1; rot = 90; // مزدوجة أفقية في خط عمودي
          } else {
            w = 1; h = 2; rot = getRotation(tile, inward, currentDir);
          }
        }
      };

      // محاولة 1: الاستمرار في نفس الاتجاه
      setDims(dir);

      if (dir === 'RIGHT') { x = end.cx; y = end.cy - h / 2; }
      else if (dir === 'LEFT') { x = end.cx - w; y = end.cy - h / 2; }
      else if (dir === 'DOWN') { x = end.cx - w / 2; y = end.cy; }
      else if (dir === 'UP') { x = end.cx - w / 2; y = end.cy - h; }

      const outOfBounds = x < -BOUNDARY || x + w > BOUNDARY || y < -BOUNDARY || y + h > BOUNDARY;
      if (!outOfBounds) {
        place(tile, x, y, w, h, rot, isDouble);
        if (dir === 'RIGHT') end = { cx: x + w, cy: end.cy, dir: 'RIGHT' };
        else if (dir === 'LEFT') end = { cx: x, cy: end.cy, dir: 'LEFT' };
        else if (dir === 'DOWN') end = { cx: end.cx, cy: y + h, dir: 'DOWN' };
        else if (dir === 'UP') end = { cx: end.cx, cy: y, dir: 'UP' };
        placedSuccessfully = true;
      }

      // محاولة 2: انعطاف 90 درجة
      if (!placedSuccessfully) {
        if (dir === 'RIGHT') dir = isRight ? 'DOWN' : 'UP';
        else if (dir === 'LEFT') dir = isRight ? 'UP' : 'DOWN';
        else if (dir === 'DOWN') dir = isRight ? 'LEFT' : 'RIGHT';
        else if (dir === 'UP') dir = isRight ? 'RIGHT' : 'LEFT';

        setDims(dir);

        if (dir === 'RIGHT') {
          x = end.cx; y = end.cy - h / 2;
          end = { cx: x + w, cy: end.cy, dir: 'RIGHT' };
        } else if (dir === 'LEFT') {
          x = end.cx - w; y = end.cy - h / 2;
          end = { cx: x, cy: end.cy, dir: 'LEFT' };
        } else if (dir === 'DOWN') {
          x = end.cx - w / 2; y = end.cy;
          end = { cx: end.cx, cy: y + h, dir: 'DOWN' };
        } else if (dir === 'UP') {
          x = end.cx - w / 2; y = end.cy - h;
          end = { cx: end.cx, cy: y, dir: 'UP' };
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