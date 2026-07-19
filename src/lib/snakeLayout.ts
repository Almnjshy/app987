/**
 * منطق عرض سلسلة الدومينو المطور (Snake Layout).
 * يمنع التداخل نهائياً ويقلب المحاور ديناميكياً عند الانعطاف العمودي.
 */

import type { ChainTile, Tile } from '@/types/game';

export interface PositionedTile {
  tile: Tile;
  /** الإحداثيات بوحدة الخلية */
  x: number;
  y: number;
  /** العرض والارتفاع الفعلي المحجوز في نظام الإحداثيات */
  w: number;
  h: number;
  /** زاوية الدوران الفعلية بالدرجات */
  rotation: number;
  isDouble: boolean;
}

export interface SnakeLayout {
  tiles: PositionedTile[];
  width: number;
  height: number;
}

/** أقصى امتداد أفقي لكل ذراع بالخلايا قبل الإجبار على الانعطاف */
const ARM_LIMIT = 7;

type FlowDirection = 'east' | 'west' | 'south' | 'north';

interface ArmCursor {
  x: number;          // نقطة التماس الحالية على محور X
  y: number;          // نقطة التماس الحالية على محور Y
  flow: FlowDirection; // الاتجاه الحركي الحالي للسلسلة
  turnSign: 1 | -1;   // +1 للانعطاف لأسفل، -1 للانعطاف لأعلى
}

function layoutArm(
  tiles: ChainTile[],
  inwardValue: (ct: ChainTile) => number,
  startX: number,
  startY: number,
  initialFlow: FlowDirection,
  turnSign: 1 | -1,
  out: PositionedTile[]
): void {
  const cursor: ArmCursor = {
    x: startX,
    y: startY,
    flow: initialFlow,
    turnSign
  };

  for (const ct of tiles) {
    const { tile } = ct;
    const inward = inwardValue(ct);
    const outward = tile.top === inward ? tile.bottom : tile.top;

    // تحديد ما إذا كان المسار الحالي أفقي أم عمودي
    const isHorizontal = cursor.flow === 'east' || cursor.flow === 'west';

    if (tile.isDouble) {
      // 1. معالجة القطع المزدوجة (الدوبل)
      let w = 1, h = 2, rotation = 0;
      let tileX = cursor.x;
      let tileY = cursor.y;

      if (isHorizontal) {
        // في المسار الأفقي: الدوبل يكون عمودياً متقاطعاً
        w = 1;
        h = 2;
        rotation = 0;
        tileX = cursor.flow === 'east' ? cursor.x : cursor.x - w;
        tileY = cursor.y - 0.5; // سنترتها عمودياً
        
        // تحريك المؤشر بمقدار سمك القطعة (1 خالية)
        cursor.x += (cursor.flow === 'east' ? 1 : -1) * w;
      } else {
        // عند الانعطاف الرأسي: الدوبل ينقلب ليصبح أفقياً متقاطعاً
        w = 2;
        h = 1;
        rotation = 90;
        tileX = cursor.x - 0.5; // سنترتها أفقياً
        tileY = cursor.flow === 'south' ? cursor.y : cursor.y - h;

        // تحريك المؤشر عمودياً بمقدار سمك القطعة (1 خلية)
        cursor.y += (cursor.flow === 'south' ? 1 : -1) * h;
      }

      out.push({ tile, x: tileX, y: tileY, w, h, rotation, isDouble: true });
      continue;
    }

    // 2. معالجة القطع العادية وتدقيق احتمالية الانعطاف قبل الرسم
    if (isHorizontal) {
      const nextEdge = cursor.x + (cursor.flow === 'east' ? 1 : -1) * 2;
      const hitLimit = cursor.flow === 'east' ? nextEdge > ARM_LIMIT : nextEdge < -ARM_LIMIT;

      if (hitLimit) {
        // إجبار على الانعطاف الرأسي (القطعة تصبح عمودية الآن كمفصل انعطاف)
        const w = 1;
        const h = 2;
        // وجهة الدوران: إذا كانت القيمة الخارجة متجهة للأسفل أو الأعلى
        const rotation = cursor.turnSign === 1 
          ? (tile.top === outward ? 180 : 0)   // للأسفل
          : (tile.top === outward ? 0 : 180);  // للأعلى

        const tileX = cursor.flow === 'east' ? cursor.x : cursor.x - w;
        const tileY = cursor.turnSign === 1 ? cursor.y : cursor.y - h;

        out.push({ tile, x: tileX, y: tileY, w, h, rotation, isDouble: false });

        // تحديث إحداثيات المحور للمستقبل وتغيير اتجاه التدفق
        cursor.y = cursor.turnSign === 1 ? tileY + h : tileY;
        cursor.x = tileX + w / 2; // التمركز في منتصف القطعة العمودية للانطلاق التالي
        cursor.flow = cursor.turnSign === 1 ? 'south' : 'north';
        continue;
      }

      // قطعة أفقية عادية مستمرة في نفس المسار
      const w = 2;
      const h = 1;
      const rotation = cursor.flow === 'east'
        ? (tile.top === inward ? 90 : 270)
        : (tile.top === inward ? 270 : 90);

      const tileX = cursor.flow === 'east' ? cursor.x : cursor.x - w;
      const tileY = cursor.y - h / 2;

      out.push({ tile, x: tileX, y: tileY, w, h, rotation, isDouble: false });
      cursor.x = cursor.flow === 'east' ? tileX + w : tileX;

    } else {
      // السلسلة تسير حالياً بشكل عمودي (نزول أو صعود)
      // قطعة عادية عمودية تتبع حركة الانعطاف
      const w = 1;
      const h = 2;
      const rotation = cursor.flow === 'south'
        ? (tile.top === inward ? 180 : 0)
        : (tile.top === inward ? 0 : 180);

      const tileX = cursor.x - w / 2;
      const tileY = cursor.flow === 'south' ? cursor.y : cursor.y - h;

      out.push({ tile, x: tileX, y: tileY, w, h, rotation, isDouble: false });
      
      // بعد قطعة عمودية واحدة في الانعطاف، نعيد توجيه التدفق أفقياً للداخل عكس الاتجاه السابق
      cursor.y = cursor.flow === 'south' ? tileY + h : tileY;
      cursor.x = tileX + w;
      cursor.flow = startX > 0 ? 'west' : 'east'; // العودة لمنتصف الشاشة
      cursor.turnSign = (cursor.turnSign * -1) as 1 | -1; // عكس اتجاه الانعطاف القادم لمنع اللانهائية
    }
  }
}

/** حساب التخطيط الكامل للسلسلة بدون تداخلات وبأبعاد حقيقية. */
export function layoutChain(chain: ChainTile[]): SnakeLayout {
  if (chain.length === 0) return { tiles: [], width: 0, height: 0 };

  const first = chain.find((ct) => ct.side === null) ?? chain[0];
  const rightGroup = chain.filter((ct) => ct.side === 'right');
  const leftGroup = chain.filter((ct) => ct.side === 'left').reverse();

  const out: PositionedTile[] = [];

  // تصفيف القطعة الأولى بالمركز بدقة متناهية
  const firstIsDouble = first.tile.isDouble;
  const firstW = firstIsDouble ? 1 : 2;
  const firstH = firstIsDouble ? 2 : 1;
  
  out.push({
    tile: first.tile,
    x: firstIsDouble ? -0.5 : -1,
    y: firstIsDouble ? -1 : -0.5,
    w: firstW,
    h: firstH,
    rotation: firstIsDouble ? 0 : 90,
    isDouble: firstIsDouble,
  });

  // الذراع اليمنى: تنطلق شرقاً (يميناً) وتنعطف لأسفل
  layoutArm(rightGroup, (ct) => ct.left, firstIsDouble ? 0.5 : 1, 0, 'east', 1, out);
  
  // الذراع اليسرى: تنطلق غرباً (يساراً) وتنعطف لأعلى
  layoutArm(leftGroup, (ct) => ct.right, firstIsDouble ? -0.5 : -1, 0, 'west', -1, out);

  // معايرة وتطبيع الإحداثيات (Normalization) لمنع القيم السالبة وتحديد حجم مساحة العرض الكاملة
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of out) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.w);
    maxY = Math.max(maxY, p.y + p.h);
  }

  // إضافة هامش أمان بسيط (Padding) لمنع ملامسة الحواف الشديدة لقماش الطاولة
  const padding = 1;
  for (const p of out) {
    p.x = p.x - minX + padding;
    p.y = p.y - minY + padding;
  }

  return { 
    tiles: out, 
    width: maxX - minX + padding * 2, 
    height: maxY - minY + padding * 2 
  };
}
