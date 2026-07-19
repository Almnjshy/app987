import type { ChainTile, Tile } from '@/types/game';

export interface PositionedTile {
  tile: Tile;
  /** إحداثيات مركز القطعة في الفراغ */
  x: number;
  y: number;
  /** زاوية الدوران الفعلية بالدرجات (0، 90، 180، 270) */
  rotation: number;
}

export interface SnakeLayout {
  tiles: PositionedTile[];
  width: number;
  height: number;
}

const ARM_LIMIT = 6; // حد الامتداد الأفقي

type FlowDir = 'east' | 'west' | 'south' | 'north';

interface Cursor {
  x: number; // مركز القطعة القادمة X
  y: number; // مركز القطعة القادمة Y
  flow: FlowDir;
  turnSign: 1 | -1;
}

function layoutArm(
  tiles: ChainTile[],
  inwardValue: (ct: ChainTile) => number,
  startX: number,
  startY: number,
  initialFlow: FlowDir,
  turnSign: 1 | -1,
  out: PositionedTile[]
): void {
  const cursor: Cursor = { x: startX, y: startY, flow: initialFlow, turnSign };

  for (const ct of tiles) {
    const { tile } = ct;
    const inward = inwardValue(ct);
    const isHorizontal = cursor.flow === 'east' || cursor.flow === 'west';

    if (tile.isDouble) {
      if (isHorizontal) {
        // الدوبل في المسار الأفقي يكون عمودياً (زاوية 0)
        out.push({ tile, x: cursor.x, y: cursor.y, rotation: 0 });
        cursor.x += cursor.flow === 'east' ? 1.5 : -1.5;
      } else {
        // الدوبل في المسار العمودي يكون أفقياً (زاوية 90)
        out.push({ tile, x: cursor.x, y: cursor.y, rotation: 90 });
        cursor.y += cursor.flow === 'south' ? 1.5 : -1.5;
      }
      continue;
    }

    // القطع العادية
    if (isHorizontal) {
      // التحقق من حد الانعطاف
      const hitLimit = cursor.flow === 'east' ? cursor.x > ARM_LIMIT : cursor.x < -ARM_LIMIT;

      if (hitLimit) {
        // قطعة المفصل (تنعطف لتصبح عمودية)
        const rotation = cursor.turnSign === 1
          ? (tile.top === inward ? 180 : 0) // للأسفل
          : (tile.top === inward ? 0 : 180); // للأعلى

        out.push({ tile, x: cursor.x, y: cursor.y, rotation });
        
        cursor.y += cursor.turnSign * 1.5;
        cursor.flow = cursor.turnSign === 1 ? 'south' : 'north';
        continue;
      }

      // قطعة أفقية عادية مستمرة: الأرقام تتقابل (rotation 90 أو 270)
      const rotation = cursor.flow === 'east'
        ? (tile.top === inward ? 90 : 270)
        : (tile.top === inward ? 270 : 90);

      out.push({ tile, x: cursor.x, y: cursor.y, rotation });
      cursor.x += cursor.flow === 'east' ? 2 : -2;

    } else {
      // مسار عمودي (بعد الانعطاف)
      const rotation = cursor.flow === 'south'
        ? (tile.top === inward ? 180 : 0)
        : (tile.top === inward ? 0 : 180);

      out.push({ tile, x: cursor.x, y: cursor.y, rotation });

      // بعد قطعة عمودية واحدة، نكسر المسار ليعود أفقياً باتجاه منتصف الشاشة
      cursor.y += cursor.flow === 'south' ? 1.5 : -1.5;
      cursor.flow = startX > 0 ? 'west' : 'east';
      cursor.x += cursor.flow === 'east' ? 1.5 : -1.5;
      cursor.turnSign = (cursor.turnSign * -1) as 1 | -1;
    }
  }
}

export function layoutChain(chain: ChainTile[]): SnakeLayout {
  if (chain.length === 0) return { tiles: [], width: 0, height: 0 };

  const first = chain.find((ct) => ct.side === null) ?? chain[0];
  const rightGroup = chain.filter((ct) => ct.side === 'right');
  const leftGroup = chain.filter((ct) => ct.side === 'left').reverse();

  const out: PositionedTile[] = [];

  // القطعة الأولى في المركز تماماً (0,0)
  const firstIsDouble = first.tile.isDouble;
  out.push({
    tile: first.tile,
    x: 0,
    y: 0,
    rotation: firstIsDouble ? 0 : 90,
  });

  // إزاحة البداية للأذرع بناءً على نوع القطعة المركزية لمنع التطابق والأرقام الخاطئة
  const startOffset = firstIsDouble ? 1 : 1.5;

  layoutArm(rightGroup, (ct) => ct.left, startOffset, 0, 'east', 1, out);
  layoutArm(leftGroup, (ct) => ct.right, -startOffset, 0, 'west', -1, out);

  // حساب الأبعاد الكلية من المراكز
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of out) {
    minX = Math.min(minX, p.x - 1);
    minY = Math.min(minY, p.y - 1);
    maxX = Math.max(maxX, p.x + 1);
    maxY = Math.max(maxY, p.y + 1);
  }

  // معايرة الإحداثيات لتصبح موجبة تماماً وتبدأ داخل صندوق الطاولة
  for (const p of out) {
    p.x = p.x - minX + 0.5;
    p.y = p.y - minY + 0.5;
  }

  return {
    tiles: out,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}
