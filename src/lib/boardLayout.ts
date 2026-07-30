import type { ChainTile, Tile } from '@/types/game';

export type Dir = 'RIGHT' | 'LEFT' | 'DOWN' | 'UP';

export interface RenderTile {
  tile: Tile;
  x: number; y: number; w: number; h: number;
  isVerticalLine: boolean;
  dot1X: number; dot1Y: number; dot2X: number; dot2Y: number;
  inVal: number; outVal: number;
}

export interface EndPoint {
  val: number; x: number; y: number; dir: Dir;
  parentH: number; parentW: number;
}

const L = 90, W = 45; // الأبعاد الأصلية بالبكسل
const MAX_X = 750, MIN_X = 100, MAX_Y = 1400, MIN_Y = 250;

function getDims(d: Dir, isDouble: boolean): { w: number, h: number } {
  if (d === 'RIGHT' || d === 'LEFT') return { w: isDouble ? W : L, h: isDouble ? L : W };
  return { w: isDouble ? L : W, h: isDouble ? W : L };
}

export function calculateLayout(chain: ChainTile[]): { tiles: RenderTile[], leftEnd: EndPoint | null, rightEnd: EndPoint | null } {
  const renderTiles: RenderTile[] = [];
  let leftEnd: EndPoint | null = null;
  let rightEnd: EndPoint | null = null;

  const pushRenderTile = (tile: Tile, x: number, y: number, w: number, h: number, dir: Dir, inVal: number, outVal: number) => {
    let dot1X = 0, dot1Y = 0, dot2X = 0, dot2Y = 0;
    let isVerticalLine = false;

    if (w > h) { 
      isVerticalLine = true;
      dot1X = x + w/4; dot1Y = y + h/2;   
      dot2X = x + 3*w/4; dot2Y = y + h/2; 
    } else { 
      isVerticalLine = false;
      dot1X = x + w/2; dot1Y = y + h/4;   
      dot2X = x + w/2; dot2Y = y + 3*h/4; 
    }

    if (dir === 'LEFT' || dir === 'UP') {
      let tmpX = dot1X, tmpY = dot1Y;
      dot1X = dot2X; dot1Y = dot2Y;
      dot2X = tmpX; dot2Y = tmpY;
    }
    renderTiles.push({ tile, x, y, w, h, isVerticalLine, inVal, outVal, dot1X, dot1Y, dot2X, dot2Y });
  };

  if (chain.length === 0) return { tiles: [], leftEnd: null, rightEnd: null };

  const first = chain.find((c) => c.side === null) || chain[0];
  const fIsDouble = first.tile.isDouble;
  const fDims = getDims('RIGHT', fIsDouble);
  const fx = 425 - fDims.w / 2;
  const fy = 825 - fDims.h / 2;
  pushRenderTile(first.tile, fx, fy, fDims.w, fDims.h, 'RIGHT', first.left, first.right);
  
  leftEnd = { val: first.left, x: fx, y: fy + fDims.h / 2, dir: 'LEFT', parentH: fDims.h, parentW: fDims.w };
  rightEnd = { val: first.right, x: fx + fDims.w, y: fy + fDims.h / 2, dir: 'RIGHT', parentH: fDims.h, parentW: fDims.w };

  const buildArm = (isRight: boolean) => {
    let end = isRight ? rightEnd! : leftEnd!;
    const group = isRight ? chain.filter((c) => c.side === 'right') : chain.filter((c) => c.side === 'left').reverse();

    for (const ct of group) {
      const tile = ct.tile;
      let inVal, outVal;
      if (tile.top === end.val) { inVal = tile.top; outVal = tile.bottom; }
      else if (tile.bottom === end.val) { inVal = tile.bottom; outVal = tile.top; }
      else break;

      const isDouble = (inVal === outVal);
      let dir = end.dir;
      let dims = getDims(dir, isDouble);
      let w = dims.w, h = dims.h;
      let x = 0, y = 0;

      if (dir === 'RIGHT') { x = end.x; y = end.y - h / 2; }
      else if (dir === 'LEFT') { x = end.x - w; y = end.y - h / 2; }
      else if (dir === 'DOWN') { x = end.x - w / 2; y = end.y; }
      else if (dir === 'UP') { x = end.x - w / 2; y = end.y - h; }

      if (dir === 'RIGHT' && x + w > MAX_X) {
        dir = 'DOWN'; dims = getDims(dir, isDouble); w = dims.w; h = dims.h;
        x = end.x - w; y = end.y + end.parentH / 2;
      } else if (dir === 'LEFT' && x < MIN_X) {
        dir = 'UP'; dims = getDims(dir, isDouble); w = dims.w; h = dims.h;
        x = end.x; y = end.y - end.parentH / 2 - h;
      } else if (dir === 'DOWN' && y + h > MAX_Y) {
        dir = 'LEFT'; dims = getDims(dir, isDouble); w = dims.w; h = dims.h;
        x = end.x - w - end.parentW / 2; y = end.y - h;
      } else if (dir === 'UP' && y < MIN_Y) {
        dir = 'RIGHT'; dims = getDims(dir, isDouble); w = dims.w; h = dims.h;
        x = end.x + end.parentW / 2; y = end.y;
      }

      pushRenderTile(tile, x, y, w, h, dir, inVal, outVal);

      let newEndX = 0, newEndY = 0;
      if (dir === 'RIGHT') { newEndX = x + w; newEndY = y + h / 2; }
      else if (dir === 'LEFT') { newEndX = x; newEndY = y + h / 2; }
      else if (dir === 'DOWN') { newEndX = x + w / 2; newEndY = y + h; }
      else if (dir === 'UP') { newEndX = x + w / 2; newEndY = y; }

      end = { val: outVal, x: newEndX, y: newEndY, dir, parentH: h, parentW: w };
    }
    if (isRight) rightEnd = end; else leftEnd = end;
  };

  buildArm(true);
  buildArm(false);

  return { tiles: renderTiles, leftEnd, rightEnd };
}