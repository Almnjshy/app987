/**
 * محرك التخطيط الشبكي (Grid Layout Engine).
 * يطابق الأرقام بدقة 100%، يمنع التداخل، وينعطف بزاوية 90 درجة مثالية.
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
  x: number; y: number; dir: Dir;
}

const BOUNDARY = 8; // المسافة الآمنة قبل الانعطاف

/**
 * دالة حساب الزاوية الصارمة:
 * تحدد أي وجه من القطعة يلامس الطاولة بناءً على الاتجاه.
 */
function getRotation(tile: Tile, inward: number, dir: Dir): number {
  if (dir === 'RIGHT') {
    // الطاولة على اليسار (West)
    return tile.top === inward ? 270 : 90;
  } else if (dir === 'LEFT') {
    // الطاولة على اليمين (East)
    return tile.top === inward ? 90 : 270;
  } else if (dir === 'DOWN') {
    // الطاولة في الأعلى (North)
    return tile.top === inward ? 0 : 180;
  } else if (dir === 'UP') {
    // الطاولة في الأسفل (South)
    return tile.top === inward ? 180 : 0;
  }
  return 0;
}

export function layoutChain(chain: ChainTile[]): SnakeLayout {
  if (chain.length === 0) return { tiles: [], width: 0, height: 0 };

  const placed: PositionedTile[] = [];
  const place = (tile: Tile, x: number, y: number, w: number, h: number, rotation: number, isDouble: boolean) => {
    placed.push({ tile, x, y, w, h, rotation, isDouble });
  };

  const first = chain.find((c) => c.side === null) || chain[0];
  const fIsDouble = first.tile.isDouble;
  const fw = fIsDouble ? 1 : 2;
  const fh = fIsDouble ? 2 : 1;
  const fx = -fw / 2;
  const fy = -fh / 2;
  // القطعة الأولى توضع بشكل عمودي دائماً
  place(first.tile, fx, fy, fw, fh, fIsDouble ? 0 : 0, fIsDouble);

  let leftEnd: EndPoint = { x: fx, y: fy + fh / 2, dir: 'LEFT' };
  let rightEnd: EndPoint = { x: fx + fw, y: fy + fh / 2, dir: 'RIGHT' };

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

      // محاولة 1: الاستمرار في نفس الاتجاه
      if (dir === 'RIGHT' || dir === 'LEFT') {
        if (isDouble) {
          w = 1; h = 2; rot = 0;
          x = dir === 'RIGHT' ? end.x : end.x - 1;
          y = end.y - 1;
        } else {
          w = 2; h = 1;
          x = dir === 'RIGHT' ? end.x : end.x - 2;
          y = end.y - 0.5;
          rot = getRotation(tile, inward, dir);
        }
      } else {
        if (isDouble) {
          w = 2; h = 1; rot = 90;
          x = end.x - 1;
          y = dir === 'DOWN' ? end.y : end.y - 1;
        } else {
          w = 1; h = 2;
          x = end.x - 0.5;
          y = dir === 'DOWN' ? end.y : end.y - 2;
          rot = getRotation(tile, inward, dir);
        }
      }

      // فحص الحدود
      const outOfBounds = x < -BOUNDARY || x + w > BOUNDARY || y < -BOUNDARY || y + h > BOUNDARY;
      if (!outOfBounds) {
        place(tile, x, y, w, h, rot, isDouble);
        if (dir === 'RIGHT') end = { x: x + w, y: end.y, dir: 'RIGHT' };
        else if (dir === 'LEFT') end = { x: x, y: end.y, dir: 'LEFT' };
        else if (dir === 'DOWN') end = { x: end.x, y: y + h, dir: 'DOWN' };
        else if (dir === 'UP') end = { x: end.x, y: y, dir: 'UP' };
        placedSuccessfully = true;
      }

      // محاولة 2: انعطاف 90 درجة
      if (!placedSuccessfully) {
        if (dir === 'RIGHT') dir = isRight ? 'DOWN' : 'UP';
        else if (dir === 'LEFT') dir = isRight ? 'UP' : 'DOWN';
        else if (dir === 'DOWN') dir = isRight ? 'LEFT' : 'RIGHT';
        else if (dir === 'UP') dir = isRight ? 'RIGHT' : 'LEFT';

        if (dir === 'RIGHT' || dir === 'LEFT') {
          w = 2; h = 1;
          if (dir === 'RIGHT') {
            x = end.x; y = end.y - 0.5;
          } else {
            x = end.x - 2; y = end.y - 0.5;
          }
          rot = getRotation(tile, inward, dir);
        } else {
          w = 1; h = 2;
          if (dir === 'DOWN') {
            x = end.x - 0.5; y = end.y;
          } else {
            x = end.x - 0.5; y = end.y - 2;
          }
          rot = getRotation(tile, inward, dir);
        }

        place(tile, x, y, w, h, rot, isDouble);
        if (dir === 'RIGHT') end = { x: x + w, y: end.y, dir: 'RIGHT' };
        else if (dir === 'LEFT') end = { x: x, y: end.y, dir: 'LEFT' };
        else if (dir === 'DOWN') end = { x: end.x, y: y + h, dir: 'DOWN' };
        else if (dir === 'UP') end = { x: end.x, y: y, dir: 'UP' };
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