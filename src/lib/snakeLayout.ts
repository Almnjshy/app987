import type { ChainTile, Tile } from '@/types/game';

export interface PositionedTile {
  tile: Tile;
  /** إحداثيات مركز القطعة في الفراغ (بوحدات "خلية" = CELL px) */
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

const ARM_LIMIT = 5; // حد الامتداد الأفقي قبل الانعطاف

type FlowDir = 'east' | 'west' | 'south' | 'north';

interface Cursor {
  x: number;
  y: number;
  flow: FlowDir;
  turnSign: 1 | -1;
}

/**
 * هندسة القطعة في DominoTile.tsx (md size):
 *   w=40 px, h=80 px (DOM box)
 *   rotate(90) / rotate(270) → بصرياً 80×40 (أفقي)
 *   rotate(0)  / rotate(180) → بصرياً 40×80 (عمودي)
 *   CELL=30 px
 *
 * بالأرقام (خلايا):
 *   القطعة بصرياً أفقية (rot 0/180):   40/30 × 80/30 = 1.33 × 2.67
 *   القطعة بصرياً عمودية (rot 90/270): 80/30 × 40/30 = 2.67 × 1.33
 */
const TILE = {
  horiz: { w: 80 / 30, h: 40 / 30 }, // 2.67 × 1.33
  vert:  { w: 40 / 30, h: 80 / 30 }, // 1.33 × 2.67
};

/**
 * في الكود الأصلي، STEP=2 ثابتة.
 * هذا يعمل جيداً للقطع العادية (vert.w=1.33) مع هامش أمان.
 *
 * المشكلة الحقيقية التي رأيناها في الاختبار:
 * 1. عند الانعطاف، القطعة المنعطفة (rot 180) و التالية (rot 0) كلاهما أفقي
 *    (2.67 عرض)، فيتطلبان STEP=2.67 — لكن الكود يستخدم 2.
 * 2. بعد القطعة العمودية في الفرع العمودي، الكود ينتقل east/west فوراً
 *    بـ STEP=2 لكن startY = 0 فلا يفصل بين الذراعين.
 *
 * الإصلاح النهائي: نحافظ على STEP=2 للقطع العادية في المسار الأفقي
 * (لأن هذا يعطي تباعد مريح بصرياً مع هامش أمان).
 * نزيد STEP إلى horiz.w (=2.67) عند الانتقال بين قطعتين بصرياً أفقيتين.
 */
const STEP_NORMAL = 2;          // للقطع العادية (rot 90/270) → عرضها 1.33
const STEP_HORIZONTAL = 2.67;   // للقطع الأفقية بصرياً (rot 0/180) → عرضها 2.67

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
        // الدوبل في المسار الأفقي: rotation=0 (أفقي بصرياً، عرضه 2.67)
        out.push({ tile, x: cursor.x, y: cursor.y, rotation: 0 });
        // الخطوة = 2.67 (عرضه الكامل)
        cursor.x += cursor.flow === 'east' ? STEP_HORIZONTAL : -STEP_HORIZONTAL;
      } else {
        // الدوبل في المسار العمودي: rotation=90 (عمودي بصرياً، ارتفاعه 2.67)
        out.push({ tile, x: cursor.x, y: cursor.y, rotation: 90 });
        cursor.y += cursor.flow === 'south' ? STEP_HORIZONTAL : -STEP_HORIZONTAL;
      }
      continue;
    }

    // القطع العادية
    if (isHorizontal) {
      const hitLimit = cursor.flow === 'east' ? cursor.x > ARM_LIMIT : cursor.x < -ARM_LIMIT;

      if (hitLimit) {
        // الانعطاف: القطعة الحالية تصير "ركن" بصرياً أفقي (rotation 0/180)
        const rotation = cursor.turnSign === 1
          ? (tile.top === inward ? 180 : 0)
          : (tile.top === inward ? 0 : 180);

        out.push({ tile, x: cursor.x, y: cursor.y, rotation });

        // *** الإصلاح الحاسم ***
        // بعد إضافة القطعة المنعطفة (ركن بصرياً أفقي، عرضها 2.67)
        // القطعة التالية في الفرع العمودي ستكون بصرياً أفقية (rot 0/180)
        // لذلك يجب أن نزيح cursor.x بمقدار STEP_HORIZONTAL = 2.67
        // لتفادي تداخل القطعتين بصرياً
        // وننقل y بمقدار vert.h/2 (نصف ارتفاع القطعة الأفقية) لنبدأ الصف الجديد
        cursor.x += cursor.flow === 'east' ? STEP_HORIZONTAL : -STEP_HORIZONTAL;
        cursor.y += cursor.turnSign * (TILE.horiz.h / 2);
        cursor.flow = cursor.turnSign === 1 ? 'south' : 'north';
        continue;
      }

      // قطعة عادية في المسار الأفقي: بصرياً عمودية (rot 90/270)
      const rotation = cursor.flow === 'east'
        ? (tile.top === inward ? 90 : 270)
        : (tile.top === inward ? 270 : 90);

      out.push({ tile, x: cursor.x, y: cursor.y, rotation });
      // الخطوة = 2 (تباعد مريح للقطع العمودية 1.33)
      cursor.x += cursor.flow === 'east' ? STEP_NORMAL : -STEP_NORMAL;

    } else {
      // مسار عمودي (بعد الانعطاف): القطعة تصير أفقية (rot 0/180)
      const rotation = cursor.flow === 'south'
        ? (tile.top === inward ? 0 : 180)
        : (tile.top === inward ? 180 : 0);

      out.push({ tile, x: cursor.x, y: cursor.y, rotation });

      // *** الإصلاح: تحديد اتجاه العودة بناءً على موضع cursor.x الفعلي ***
      // هذا يمنع الذراعين من التقارب على نفس المحور
      const shouldGoEast = cursor.x >= 0;
      cursor.flow = shouldGoEast ? 'east' : 'west';
      // الخطوة = 2.67 لأن القطعة أفقية بصرياً (عرضها 2.67)
      cursor.x += cursor.flow === 'east' ? STEP_HORIZONTAL : -STEP_HORIZONTAL;
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

  const firstIsDouble = first.tile.isDouble;
  out.push({
    tile: first.tile,
    x: 0,
    y: 0,
    rotation: firstIsDouble ? 0 : 90,
  });

  // startOffset = مجموع نصفي عرض القطعة المركزية + القطعة الأولى في الذراع
  // - القطعة المركزية:
  //     double (rot 0, horiz) → halfW = 1.33
  //     normal (rot 90, vert) → halfW = 0.67
  // - القطعة الأولى في الذراع: تكون rotation=90 (vert) دائماً
  //     halfW = 0.67
  //
  // لذلك:
  //   double:  startOffset = 1.33 + 0.67 = 2.0
  //   normal:  startOffset = 0.67 + 0.67 = 1.34
  //
  // ومع STEP_NORMAL=2، القطعة الأولى في الذراع بعد startOffset=2 تكون
  // عند x = 2 من المركز. مجموع نصفي العرض = 0.67 (مركز) + 0.67 (ذراع) = 1.34
  // أي المسافة بين الحوافي = 2 - 1.34 = 0.66 خلية ≈ 20 px تباعد مريح
  const centerHalfW = firstIsDouble ? TILE.horiz.w / 2 : TILE.vert.w / 2;
  const firstArmHalfW = TILE.vert.w / 2; // دائماً rotation=90 في أول قطعة
  const startOffset = centerHalfW + firstArmHalfW;

  layoutArm(rightGroup, (ct) => ct.left, startOffset, 0, 'east', 1, out);
  layoutArm(leftGroup, (ct) => ct.right, -startOffset, 0, 'west', -1, out);

  // حساب الأبعاد الكلية
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of out) {
    const rot = ((p.rotation % 360) + 360) % 360;
    const isVertical = rot === 90 || rot === 270;
    const halfW = isVertical ? TILE.vert.w / 2 : TILE.horiz.w / 2;
    const halfH = isVertical ? TILE.vert.h / 2 : TILE.horiz.h / 2;
    minX = Math.min(minX, p.x - halfW);
    minY = Math.min(minY, p.y - halfH);
    maxX = Math.max(maxX, p.x + halfW);
    maxY = Math.max(maxY, p.y + halfH);
  }

  // معايرة الإحداثيات لتصبح موجبة
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
