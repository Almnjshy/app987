/**
 * محرك التخطيط الشبكي (Grid Layout Engine).
 * يуправ المساحة بذكاء، يمنع التداخل (Collision Detection)،
 * وينعطف قبل الحواف بمسافة آمنة لضمان استغلال الطاولة بالكامل.
 */

import type { ChainTile, Tile } from '@/types/game';

export interface PositionedTile {
  tile: Tile;
  x: number; // الإحداثي السيني (بوحدة الخلية)
  y: number; // الإحداثي الصادي (بوحدة الخلية)
  w: number; // العرض (بوحدة الخلية)
  h: number; // الارتفاع (بوحدة الخلية)
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

interface BoundingBox {
  x1: number; y1: number; x2: number; y2: number;
}

const TILE_W = 2;  // طول القطعة (بوحدة الخلية)
const TILE_H = 1;  // سمك القطعة (بوحدة الخلية)
const BOUNDARY = 6; // المسافة الآمنة قبل الانعطاف (بوحدة الخلية)

export function layoutChain(chain: ChainTile[]): SnakeLayout {
  if (chain.length === 0) return { tiles: [], width: 0, height: 0 };

  const placed: PositionedTile[] = [];
  const occupied: BoundingBox[] = [];

  const checkCollision = (x: number, y: number, w: number, h: number): boolean => {
    const box = { x1: x, y1: y, x2: x + w, y2: y + h };
    for (const o of occupied) {
      if (box.x1 < o.x2 && box.x2 > o.x1 && box.y1 < o.y2 && box.y2 > o.y1) {
        return true; // يوجد تصادم
      }
    }
    return false;
  };

  const place = (tile: Tile, x: number, y: number, w: number, h: number, rotation: number, isDouble: boolean) => {
    placed.push({ tile, x, y, w, h, rotation, isDouble });
    occupied.push({ x1: x, y1: y, x2: x + w, y2: y + h });
  };

  // 1. وضع القطعة الأولى في المنتصف
  const first = chain.find((ct) => ct.side === null) ?? chain[0];
  const firstIsDouble = first.tile.isDouble;
  const fw = firstIsDouble ? TILE_H : TILE_W;
  const fh = firstIsDouble ? TILE_W : TILE_H;
  const fx = -fw / 2;
  const fy = -fh / 2;
  place(first.tile, fx, fy, fw, fh, firstIsDouble ? 0 : 90, firstIsDouble);

  let leftEnd: EndPoint = { x: fx, y: fy + fh / 2, dir: 'LEFT' };
  let rightEnd: EndPoint = { x: fx + fw, y: fy + fh / 2, dir: 'RIGHT' };

  // 2. دالة بناء الذراع (يسار أو يمين)
  const buildArm = (isRight: boolean) => {
    const group = chain.filter((ct) => ct.side === (isRight ? 'right' : 'left')).reverse();
    let end = isRight ? rightEnd : leftEnd;

    for (const ct of group) {
      const tile = ct.tile;
      const isDouble = tile.isDouble;
      let placedSuccessfully = false;

      // محاولة 1: الاستمرار في نفس الاتجاه
      let dir = end.dir;
      let w = (dir === 'RIGHT' || dir === 'LEFT') ? (isDouble ? TILE_H : TILE_W) : (isDouble ? TILE_W : TILE_H);
      let h = (dir === 'RIGHT' || dir === 'LEFT') ? (isDouble ? TILE_W : TILE_H) : (isDouble ? TILE_H : TILE_W);
      let x = 0, y = 0;

      if (dir === 'RIGHT') { x = end.x; y = end.y - h / 2; }
      else if (dir === 'LEFT') { x = end.x - w; y = end.y - h / 2; }
      else if (dir === 'DOWN') { x = end.x - w / 2; y = end.y; }
      else if (dir === 'UP') { x = end.x - w / 2; y = end.y - h; }

      const outOfBounds = x < -BOUNDARY || x + w > BOUNDARY || y < -BOUNDARY || y + h > BOUNDARY;
      if (!outOfBounds && !checkCollision(x, y, w, h)) {
        place(tile, x, y, w, h, isDouble ? 0 : (dir === 'RIGHT' || dir === 'LEFT' ? 90 : 0), isDouble);
        
        if (dir === 'RIGHT') end = { x: x + w, y: end.y, dir: 'RIGHT' };
        else if (dir === 'LEFT') end = { x: x, y: end.y, dir: 'LEFT' };
        else if (dir === 'DOWN') end = { x: end.x, y: y + h, dir: 'DOWN' };
        else if (dir === 'UP') end = { x: end.x, y: y, dir: 'UP' };
        
        placedSuccessfully = true;
      }

      // محاولة 2: الانعطاف 90 درجة (إذا فشلت المحاولة الأولى)
      if (!placedSuccessfully) {
        if (dir === 'RIGHT') dir = isRight ? 'DOWN' : 'UP';
        else if (dir === 'LEFT') dir = isRight ? 'UP' : 'DOWN';
        else if (dir === 'DOWN') dir = isRight ? 'LEFT' : 'RIGHT';
        else if (dir === 'UP') dir = isRight ? 'RIGHT' : 'LEFT';

        w = (dir === 'RIGHT' || dir === 'LEFT') ? (isDouble ? TILE_H : TILE_W) : (isDouble ? TILE_W : TILE_H);
        h = (dir === 'RIGHT' || dir === 'LEFT') ? (isDouble ? TILE_W : TILE_H) : (isDouble ? TILE_H : TILE_W);

        // حساب الإحداثيات للانعطاف النظيف (بدون تداخل)
        if (dir === 'RIGHT') { x = end.x + 0.5; y = end.y - h / 2; }
        else if (dir === 'LEFT') { x = end.x - 0.5 - w; y = end.y - h / 2; }
        else if (dir === 'DOWN') { x = end.x - w / 2; y = end.y + 0.5; }
        else if (dir === 'UP') { x = end.x - w / 2; y = end.y - 0.5 - h; }

        if (!checkCollision(x, y, w, h)) {
          place(tile, x, y, w, h, isDouble ? 0 : (dir === 'RIGHT' || dir === 'LEFT' ? 90 : 0), isDouble);
          
          if (dir === 'RIGHT') end = { x: x + w, y: y + h / 2, dir: 'RIGHT' };
          else if (dir === 'LEFT') end = { x: x, y: y + h / 2, dir: 'LEFT' };
          else if (dir === 'DOWN') end = { x: x + w / 2, y: y + h, dir: 'DOWN' };
          else if (dir === 'UP') end = { x: x + w / 2, y: y, dir: 'UP' };
        }
      }
    }

    if (isRight) rightEnd = end; else leftEnd = end;
  };

  buildArm(true);  // بناء الذراع اليمنى
  buildArm(false); // بناء الذراع اليسرى

  // 3. تطبيع الإحداثيات (توسيط الطاولة)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of placed) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.w);
    maxY = Math.max(maxY, p.y + p.h);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const tiles = placed.map(p => ({ ...p, x: p.x - minX, y: p.y - minY }));

  return { tiles, width, height };
}