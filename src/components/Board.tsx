import { memo, useMemo, useRef, useState, useEffect } from 'react';
import type { ChainTile, EndSide } from '@/types/game';
import { layoutChain } from '@/lib/snakeLayout';
import { DominoTile } from './DominoTile';

interface BoardProps {
  chain: ChainTile[];
  className?: string;
  highlightEnds?: EndSide[];
  onSelectSide?: (side: EndSide) => void;
  dropSideRefs?: React.MutableRefObject<{ left: HTMLDivElement | null; right: HTMLDivElement | null }>;
}

const CELL = 30; // الحجم الثابت للخلية

/**
 * مكون Board — يعرض سلسلة الدومينو على الطاولة.
 *
 * الإصلاحات:
 *  1) نستخدم wrapper بحجم صفر لكن نضع القطعة بإزاحة -w/2 و -h/2
 *     لتدور حول مركزها الحقيقي.
 *  2) نختار إزاحة المركز ديناميكياً حسب الـ rotation:
 *     - rotation 0 أو 180 → القطعة أفقية (w أكبر من h)
 *     - rotation 90 أو 270 → القطعة عمودية (h أكبر من w)
 *  3) تصحيح endZoneStyle للتعامل مع كل 4 زوايا بشكل متماثل.
 */
function BoardComponent({ chain, className = '', highlightEnds = [], onSelectSide, dropSideRefs }: BoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 600, h: 300 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => layoutChain(chain), [chain]);

  if (chain.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{
          background: 'rgba(13, 122, 58, 0.15)',
          borderRadius: 16,
          border: '2px dashed rgba(201, 168, 76, 0.2)',
        }}
      >
        <span className="text-[#B8A080] text-sm font-arabic">ابدأ اللعب</span>
      </div>
    );
  }

  const fullW = layout.width * CELL;
  const fullH = layout.height * CELL;
  const scale = Math.min(containerSize.w / (fullW + CELL), containerSize.h / (fullH + CELL), 1);

  const leftEndTile = layout.tiles.find((p) => p.tile.id === chain[0].tile.id);
  const rightEndTile = layout.tiles.find((p) => p.tile.id === chain[chain.length - 1].tile.id);

  /**
   * تحديد موقع منطقة الإفلات للطرف المفتوح.
   *
   * الإصلاح: نستخدم متجه الوحدة (unit vector) لاتجاه القطعة
   * بدلاً من افتراضات ثابتة لكل زاوية.
   * - القطعة الأفقية (rot 90/270): الطرف المفتوح في x+
   * - القطعة العمودية (rot 0/180): الطرف المفتوح في y+
   */
  const endZoneStyle = (p: { x: number; y: number; rotation: number }, side: EndSide): React.CSSProperties => {
    const rot = ((p.rotation % 360) + 360) % 360;
    const isHorizontal = rot === 90 || rot === 270;

    // متجه الطرف المفتوح (للقطعة العمودية: للأسفل rot=0، للأعلى rot=180)
    // (للقطعة الأفقية: لليمين rot=90، لليسار rot=270)
    let dx = 0;
    let dy = 0;

    if (isHorizontal) {
      // القطعة الأفقية: الطرف المفتوح في اتجاه x
      // rot=90 → القطعة رأسها لليسار، ذيلها لليمين → left side من chain = يسار مرئي
      // rot=270 → معكوس
      dx = rot === 90 ? -1 : 1;
    } else {
      // القطعة العمودية
      dy = rot === 0 ? 1 : -1;
    }

    // نعكس الاتجاه إذا كان side=left (نريد الذهاب لليسار/الأعلى)
    if (side === 'left') {
      dx = -dx;
      dy = -dy;
    }

    return {
      left: (p.x + dx * 1.2) * CELL - (CELL * 1.5) / 2,
      top: (p.y + dy * 1.2) * CELL - (CELL * 1.5) / 2,
      width: CELL * 1.5,
      height: CELL * 1.5,
    };
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        background: 'rgba(13, 122, 58, 0.1)',
        borderRadius: 16,
        border: '1px solid rgba(201, 168, 76, 0.15)',
      }}
    >
      <div
        className="absolute transition-all duration-300"
        style={{
          width: fullW,
          height: fullH,
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {layout.tiles.map((p) => {
          // *** الإصلاح 1 و 2: حساب الإزاحة الصحيحة حسب الدوران ***
          // القطعة في DominoTile:
          //   - md: w=40, h=80 (عمودية افتراضياً)
          //   - rotation=0/180: تصبح أفقية (تبادل w,h بصرياً)
          //   - rotation=90/270: تبقى عمودية
          //
          // لكي يتمركز الدوران حول المركز، يجب أن نزيح:
          //   - إذا كانت القطعة ستظهر عمودية (rot 90/270):
          //       dx = -w/2 = -20, dy = -h/2 = -40
          //   - إذا كانت ستظهر أفقية (rot 0/180):
          //       dx = -h/2 = -40, dy = -w/2 = -20
          const rot = ((p.rotation % 360) + 360) % 360;
          const willBeVertical = rot === 90 || rot === 270;
          const offsetX = willBeVertical ? -20 : -40;
          const offsetY = willBeVertical ? -40 : -20;

          return (
            <div
              key={p.tile.id}
              className="absolute"
              style={{
                left: p.x * CELL,
                top: p.y * CELL,
                width: 0,
                height: 0,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: offsetX,
                  top: offsetY,
                }}
              >
                <DominoTile
                  tile={p.tile}
                  size="md"
                  faceUp={true}
                  rotation={p.rotation}
                />
              </div>
            </div>
          );
        })}

        {/* تمييز الطرف الأيسر القانوني */}
        {leftEndTile && highlightEnds.includes('left') && (
          <div
            ref={(el) => { if (dropSideRefs) dropSideRefs.current.left = el; }}
            onClick={() => onSelectSide?.('left')}
            className="absolute rounded-lg cursor-pointer animate-pulse z-10"
            style={{
              ...endZoneStyle(leftEndTile, 'left'),
              border: '2px dashed #2ECC40',
              background: 'rgba(46, 204, 64, 0.25)',
              boxShadow: '0 0 10px rgba(46, 204, 64, 0.4)',
            }}
          />
        )}

        {/* تمييز الطرف الأيمن القانوني */}
        {rightEndTile && highlightEnds.includes('right') && (
          <div
            ref={(el) => { if (dropSideRefs) dropSideRefs.current.right = el; }}
            onClick={() => onSelectSide?.('right')}
            className="absolute rounded-lg cursor-pointer animate-pulse z-10"
            style={{
              ...endZoneStyle(rightEndTile, 'right'),
              border: '2px dashed #2ECC40',
              background: 'rgba(46, 204, 64, 0.25)',
              boxShadow: '0 0 10px rgba(46, 204, 64, 0.4)',
            }}
          />
        )}
      </div>
    </div>
  );
}

export const Board = memo(BoardComponent);
Board.displayName = 'Board';
