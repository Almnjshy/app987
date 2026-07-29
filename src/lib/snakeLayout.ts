/**
 * منطق عرض سلسلة الدومينو (Snake Layout).
 * يبدأ من منتصف الطاولة، يمتد يميناً ويساراً، وينعطف تلقائياً
 * عند حدود الطاولة دون أي تداخل بين القطع.
 * هذا المنطق عرض فقط — الحقيقة المنطقية تبقى في المحرك.
 */

import type { ChainTile, Tile } from '@/types/game';

export interface PositionedTile {
  tile: Tile;
  /** الإحداثيات بوحدة الخلية (سمك القطعة = 1، طولها = 2) */
  x: number;
  y: number;
  /** العرض والارتفاع بالخلايا */
  w: number;
  h: number;
  /** زاوية الدوران بالدرجات لعرض القطعة الرأسية */
  rotation: number;
  isDouble: boolean;
}

export interface SnakeLayout {
  tiles: PositionedTile[];
  /** أبعاد مساحة العرض بالخلايا */
  width: number;
  height: number;
}

/** أقصى امتداد أفقي لكل ذراع قبل الانعطاف (بالخلايا) */
const ARM_LIMIT = 7;

interface ArmCursor {
  x: number; // الحافة الحرة
  y: number; // صف البداية (أعلى القطع الأفقية)
  dir: 1 | -1;
  turnSign: 1 | -1; // +1 انعطاف للأسفل، -1 للأعلى
}

/**
 * اختيار زاوية الدوران بحيث تظهر قيمة معينة على جهة معينة.
 * القطعة الأصل رأسية: rotation=90 (مع عقارب الساعة) يجعل النصف العلوي شرقاً.
 */
function rotationFor(tile: Tile, value: number, face: 'east' | 'west'): number {
  if (face === 'east') {
    // الشرق يظهر tile.top عند 90
    return tile.top === value ? 90 : 270;
  }
  // الغرب يظهر tile.bottom عند 90
  return tile.bottom === value ? 90 : 270;
}

function layoutArm(
  tiles: ChainTile[],
  inwardValue: (ct: ChainTile) => number,
  startX: number,
  bound: number,
  turnSign: 1 | -1,
  out: PositionedTile[]
): void {
  const cursor: ArmCursor = { x: startX, y: 0, dir: turnSign === 1 ? 1 : -1, turnSign };
  // الذراع اليمنى تبدأ شرقاً، اليسرى غرباً
  cursor.dir = bound > startX ? 1 : -1;

  for (const ct of tiles) {
    const { tile } = ct;
    const inward = inwardValue(ct);

    if (tile.isDouble) {
      // الدوبل يوضع عمودياً ولا يكسر ترتيب الـ Snake
      const w = 1;
      const h = 2;
      const x = cursor.dir === 1 ? cursor.x : cursor.x - 1;
      const y = cursor.y - 0.5;
      out.push({ tile, x, y, w, h, rotation: 0, isDouble: true });
      cursor.x += cursor.dir * 1;
      continue;
    }

    // هل يلزم انعطاف؟ (قطعة أفقية تحتاج خليتين)
    const nextEdge = cursor.x + cursor.dir * 2;
    const needTurn =
      (cursor.dir === 1 && nextEdge > bound) ||
      (cursor.dir === -1 && nextEdge < bound);

    if (needTurn) {
      // قطعة زاوية رأسية ثم انعكاس الاتجاه في صف جديد
      const w = 1;
      const h = 2;
      const x = cursor.dir === 1 ? cursor.x : cursor.x - 1;
      const y = cursor.turnSign === 1 ? cursor.y + 1 : cursor.y - 2;
      // النصف المتصل بالقادم يظهر في الأعلى (قيمة الدخول)
      const rotation = tile.top === inward ? 0 : 180;
      out.push({ tile, x, y, w, h, rotation, isDouble: false });
      // صف جديد
      cursor.y += cursor.turnSign * 2;
      cursor.dir = (cursor.dir * -1) as 1 | -1;
      // الحافة الحرة الآن عند الجهة الأخرى من قطعة الزاوية
      cursor.x = cursor.dir === 1 ? x + 1 : x;
      continue;
    }

    // قطعة أفقية عادية
    const w = 2;
    const h = 1;
    const x = cursor.dir === 1 ? cursor.x : cursor.x - 2;
    const y = cursor.y;
    // الجهة المواجهة للقطعة السابقة يجب أن تظهر القيمة الداخلة
    const face: 'east' | 'west' = cursor.dir === 1 ? 'west' : 'east';
    const rotation = rotationFor(tile, inward, face);
    out.push({ tile, x, y, w, h, rotation, isDouble: false });
    cursor.x = nextEdge;
  }
}

/** حساب التخطيط الكامل للسلسلة. */
export function layoutChain(chain: ChainTile[]): SnakeLayout {
  if (chain.length === 0) return { tiles: [], width: 0, height: 0 };

  const first = chain.find((ct) => ct.side === null) ?? chain[0];
  const rightGroup = chain.filter((ct) => ct.side === 'right'); // ترتيب اللعب = من المركز للخارج
  const leftGroup = chain.filter((ct) => ct.side === 'left').reverse(); // من المركز للخارج

  const out: PositionedTile[] = [];

  // القطعة الأولى في منتصف الطاولة
  const firstIsDouble = first.tile.isDouble;
  const firstW = firstIsDouble ? 1 : 2;
  const firstH = firstIsDouble ? 2 : 1;
  out.push({
    tile: first.tile,
    x: 0,
    y: firstIsDouble ? -0.5 : 0,
    w: firstW,
    h: firstH,
    rotation: firstIsDouble ? 0 : 90,
    isDouble: firstIsDouble,
  });

  // الذراع اليمنى: تبدأ من الحافة اليمنى للقطعة الأولى، تنكسر للأسفل
  layoutArm(rightGroup, (ct) => ct.left, firstW, ARM_LIMIT, 1, out);
  // الذراع اليسرى: تبدأ من الحافة اليسرى، تنكسر للأعلى
  layoutArm(leftGroup, (ct) => ct.right, 0, -ARM_LIMIT, -1, out);

  // تطبيع الإحداثيات لتبدأ من الصفر
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of out) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.w);
    maxY = Math.max(maxY, p.y + p.h);
  }
  for (const p of out) {
    p.x -= minX;
    p.y -= minY;
  }

  return { tiles: out, width: maxX - minX, height: maxY - minY };
}