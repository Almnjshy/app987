/**
 * محرك التخطيط الشبكي (Grid Layout Engine) - الإصدار الهجين النهائي.
 * يدمج بين: البنية الوظيفية النظيفة (React Friendly) + الرياضيات الهندسية الصارمة للزاوية.
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

// واجهة نقطة النهاية تحمل أبعاد القطعة الأم ل حساب الزاوية بدقة
interface EndPoint {
  val: number;
  x: number;
  y: number;
  dir: Dir;
  parentW: number;
  parentH: number;
}

const BOUNDARY = 6; // الحد الأقصى للخلايا قبل الانعطاف

function getDims(dir: Dir, isDouble: boolean): { w: number, h: number } {
  const L = 2, W = 1; // أبعاد ثابتة بنظام الخلايا
  if (dir === 'RIGHT' || dir === 'LEFT') {
    return { w: isDouble ? W : L, h: isDouble ? L : W };
  } else {
    return { w: isDouble ? L : W, h: isDouble ? W : L };
  }
}

function getRotation(tile: Tile, inVal: number, dir: Dir): number {
  if (dir === 'RIGHT') return tile.bottom === inVal ? 90 : 270;
  if (dir === 'LEFT') return tile.top === inVal ? 90 : 270;
  if (dir === 'DOWN') return tile.top === inVal ? 0 : 180;
  if (dir === 'UP') return tile.bottom === inVal ? 0 : 180;
  return 0;
}

export function layoutChain(chain: ChainTile[]): SnakeLayout {
  if (chain.length === 0) return { tiles: [], width: 0, height: 0 };

  const placed: PositionedTile[] = [];
  const place = (tile: Tile, x: number, y: number, w: number, h: number, rotation: number, isDouble: boolean) => {
    placed.push({ tile, x, y, w, h, rotation, isDouble });
  };

  // 1. وضع القطعة الأولى في المنتصف
  const first = chain.find((c) => c.side === null) || chain[0];
  const fIsDouble = first.tile.isDouble;
  const fDims = getDims('RIGHT', fIsDouble);
  const fx = -fDims.w / 2;
  const fy = -fDims.h / 2;
  place(first.tile, fx, fy, fDims.w, fDims.h, fIsDouble ? 0 : 90, fIsDouble);

  let leftEnd: EndPoint = { val: first.left, x: fx, y: fy + fDims.h / 2, dir: 'LEFT', parentW: fDims.w, parentH: fDims.h };
  let rightEnd: EndPoint = { val: first.right, x: fx + fDims.w, y: fy + fDims.h / 2, dir: 'RIGHT', parentW: fDims.w, parentH: fDims.h };

  const buildArm = (isRight: boolean) => {
    let end = isRight ? rightEnd : leftEnd;
    const group = isRight
      ? chain.filter((c) => c.side === 'right')
      : chain.filter((c) => c.side === 'left').reverse();

    for (const ct of group) {
      const tile = ct.tile;
      const inVal = isRight ? ct.left : ct.right;
      const outVal = isRight ? ct.right : ct.left;
      const isDouble = (inVal === outVal);

      let dir = end.dir;
      let dims = getDims(dir, isDouble);
      let w = dims.w, h = dims.h;
      let x = 0, y = 0;

      // محاولة 1: الاستمرار في نفس الاتجاه
      if (dir === 'RIGHT') { x = end.x; y = end.y - h / 2; }
      else if (dir === 'LEFT') { x = end.x - w; y = end.y - h / 2; }
      else if (dir === 'DOWN') { x = end.x - w / 2; y = end.y; }
      else if (dir === 'UP') { x = end.x - w / 2; y = end.y - h; }

      // فحص الحدود
      const outOfBounds = x < -BOUNDARY || x + w > BOUNDARY || y < -BOUNDARY || y + h > BOUNDARY;

      // محاولة 2: الانعطاف (رياضيات الزاوية الدقيقة من BoardLayout)
      if (outOfBounds) {
        if (dir === 'RIGHT') {
          dir = isRight ? 'DOWN' : 'UP';
          dims = getDims(dir, isDouble); w = dims.w; h = dims.h;
          x = end.x - w; 
          y = end.y + end.parentH / 2; 
        } else if (dir === 'LEFT') {
          dir = isRight ? 'UP' : 'DOWN';
          dims = getDims(dir, isDouble); w = dims.w; h = dims.h;
          x = end.x; 
          y = end.y - end.parentH / 2 - h; 
        } else if (dir === 'DOWN') {
          dir = isRight ? 'LEFT' : 'RIGHT';
          dims = getDims(dir, isDouble); w = dims.w; h = dims.h;
          x = end.x - w - end.parentW / 2; 
          y = end.y - h; 
        } else if (dir === 'UP') {
          dir = isRight ? 'RIGHT' : 'LEFT';
          dims = getDims(dir, isDouble); w = dims.w; h = dims.h;
          x = end.x + end.parentW / 2; 
          y = end.y; 
        }
      }

      const rot = getRotation(tile, inVal, dir);
      place(tile, x, y, w, h, rot, isDouble);

      // حساب نقطة النهاية الجديدة للقطعة التالية
      let newEndX = 0, newEndY = 0;
      if (dir === 'RIGHT') { newEndX = x + w; newEndY = y + h / 2; }
      else if (dir === 'LEFT') { newEndX = x; newEndY = y + h / 2; }
      else if (dir === 'DOWN') { newEndX = x + w / 2; newEndY = y + h; }
      else if (dir === 'UP') { newEndX = x + w / 2; newEndY = y; }

      end = { val: outVal, x: newEndX, y: newEndY, dir, parentW: w, parentH: h };
    }

    if (isRight) rightEnd = end; else leftEnd = end;
  };

  buildArm(true);
  buildArm(false);

  // 3. تطبيع الإحداثيات لتوسيط الطاولة
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