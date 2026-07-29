/**
 * محرك التخطيط الشبكي (Grid Layout Engine).
 * يطابق الأرقام بدقة، يمنع التداخل (Collision Detection)،
 * وينعطف قبل الحواف بمسافة آمنة لضمان استغلال الطاولة بالكامل.
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

interface BoundingBox {
  x1: number; y1: number; x2: number; y2: number;
}

const BOUNDARY = 8; // المسافة الآمنة قبل الانعطاف

function rotationFor(tile: Tile, value: number, face: 'east' | 'west'): number {
  if (face === 'east') return tile.top === value ? 90 : 270;
  return tile.bottom === value ? 90 : 270;
}

export function layoutChain(chain: ChainTile[]): SnakeLayout {
  if (chain.length === 0) return { tiles: [], width: 0, height: 0 };

  const placed: PositionedTile[] = [];
  const occupied: BoundingBox[] = [];

  const checkCollision = (x: number, y: number, w: number, h: number): boolean => {
    const box = { x1: x, y1: y, x2: x + w, y2: y + h };
    for (const o of occupied) {
      if (box.x1 < o.x2 && box.x2 > o.x1 && box.y1 < o.y2 && box.y2 > o.y1) {
        return true;
      }
    }
    return false;
  };

  const place = (tile: Tile, x: number, y: number, w: number, h: number, rotation: number, isDouble: boolean) => {
    placed.push({ tile, x, y, w, h, rotation, isDouble });
    occupied.push({ x1: x, y1: y, x2: x + w, y2: y + h });
  };

  const first = chain.find((ct) => ct.side === null) ?? chain[0];
  const firstIsDouble = first.tile.isDouble;
  const fw = firstIsDouble ? 1 : 2;
  const fh = firstIsDouble ? 2 : 1;
  const fx = -fw / 2;
  const fy = -fh / 2;
  place(first.tile, fx, fy, fw, fh, firstIsDouble ? 0 : 90, firstIsDouble);

  let leftEnd: EndPoint = { x: fx, y: fy + fh / 2, dir: 'LEFT' };
  let rightEnd: EndPoint = { x: fx + fw, y: fy + fh / 2, dir: 'RIGHT' };

  const buildArm = (isRight: boolean) => {
    // إصلاح الترتيب: اليمين لا يعكس، اليسار يعكس
    const group = isRight
      ? chain.filter((ct) => ct.side === 'right')
      : chain.filter((ct) => ct.side === 'left').reverse();

    let end = isRight ? rightEnd : leftEnd;

    for (const ct of group) {
      const tile = ct.tile;
      const isDouble = tile.isDouble;
      const inward = isRight ? ct.left : ct.right;

      let placedSuccessfully = false;

      // محاولة 1: الاستمرار في نفس الاتجاه
      let dir = end.dir;
      let w = 0, h = 0, x = 0, y = 0, rot = 0;

      if (dir === 'RIGHT' || dir === 'LEFT') {
        if (isDouble) {
          w = 1; h = 2; rot = 0;
          x = dir === 'RIGHT' ? end.x : end.x - 1;
          y = end.y - 1;
        } else {
          w = 2; h = 1;
          x = dir === 'RIGHT' ? end.x : end.x - 2;
          y = end.y - 0.5;
          rot = rotationFor(tile, inward, dir === 'RIGHT' ? 'west' : 'east');
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
          rot = dir === 'DOWN' ? (tile.top === inward ? 0 : 180) : (tile.bottom === inward ? 0 : 180);
        }
      }

      const outOfBounds = x < -BOUNDARY || x + w > BOUNDARY || y < -BOUNDARY || y + h > BOUNDARY;
      if (!outOfBounds && !checkCollision(x, y, w, h)) {
        place(tile, x, y, w, h, rot, isDouble);
        if (dir === 'RIGHT') end = { x: x + w, y: end.y, dir: 'RIGHT' };
        else if (dir === 'LEFT') end = { x: x, y: end.y, dir: 'LEFT' };
        else if (dir === 'DOWN') end = { x: end.x, y: y + h, dir: 'DOWN' };
        else if (dir === 'UP') end = { x: end.x, y: y, dir: 'UP' };
        placedSuccessfully = true;
      }

      // محاولة 2: الانعطاف 90 درجة
      if (!placedSuccessfully) {
        if (dir === 'RIGHT') dir = isRight ? 'DOWN' : 'UP';
        else if (dir === 'LEFT') dir = isRight ? 'UP' : 'DOWN';
        else if (dir === 'DOWN') dir = isRight ? 'LEFT' : 'RIGHT';
        else if (dir === 'UP') dir = isRight ? 'RIGHT' : 'LEFT';

        if (dir === 'RIGHT' || dir === 'LEFT') {
          w = 2; h = 1;
          if (dir === 'RIGHT') { x = end.x; y = end.y - 0.5; rot = rotationFor(tile, inward, 'west'); }
          else { x = end.x - 2; y = end.y - 0.5; rot = rotationFor(tile, inward, 'east'); }
        } else {
          w = 1; h = 2;
          if (dir === 'DOWN') { x = end.x - 0.5; y = end.y; rot = tile.top === inward ? 0 : 180; }
          else { x = end.x - 0.5; y = end.y - 2; rot = tile.bottom === inward ? 0 : 180; }
        }

        if (!checkCollision(x, y, w, h)) {
          place(tile, x, y, w, h, rot, isDouble);
          if (dir === 'RIGHT') end = { x: x + w, y: end.y, dir: 'RIGHT' };
          else if (dir === 'LEFT') end = { x: x, y: end.y, dir: 'LEFT' };
          else if (dir === 'DOWN') end = { x: end.x, y: y + h, dir: 'DOWN' };
          else if (dir === 'UP') end = { x: end.x, y: y, dir: 'UP' };
        }
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

  const width = maxX - minX;
  const height = maxY - minY;
  const tiles = placed.map(p => ({ ...p, x: p.x - minX, y: p.y - minY }));

  return { tiles, width, height };
}