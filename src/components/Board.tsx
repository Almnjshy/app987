import { memo, useMemo, useRef, useState, useEffect } from 'react';
import type { ChainTile, EndSide } from '@/types/game';
import { layoutChain } from '@/lib/snakeLayout';
import { DominoTile } from './DominoTile';

interface BoardProps {
  chain: ChainTile[];
  className?: string;
  /** تفعيل تمييز الطرفين القانونيين للقطعة المختارة */
  highlightEnds?: EndSide[];
  /** النقر على طرف لوضع القطعة المختارة */
  onSelectSide?: (side: EndSide) => void;
  /** معرّفات مناطق الإسقاط للسحب والإفلات */
  dropSideRefs?: React.MutableRefObject<{ left: HTMLDivElement | null; right: HTMLDivElement | null }>;
}

const CELL = 30; // بكسل لكل خلية (سمك القطعة)

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

  // حساب التخطيط المطور والخالي من التداخلات
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

  // الحجم الفعلي للملعب بالبكسل بناءً على مصفوفة الـ layout الجديدة
  const fullW = layout.width * CELL;
  const fullH = layout.height * CELL;
  
  // حساب المقياس لضمان احتواء السلسلة كاملة داخل الشاشة دون الخروج عن الحدود
  const scale = Math.min(containerSize.w / (fullW + CELL * 2), containerSize.h / (fullH + CELL * 2), 1);

  // جلب أول وآخر قطعة في السلسلة لتحديد مناطق الوميض والإسقاط
  const leftEndTile = layout.tiles.find((p) => p.tile.id === chain[0].tile.id);
  const rightEndTile = layout.tiles.find((p) => p.tile.id === chain[chain.length - 1].tile.id);

  /**
   * حساب موضع منطقة التمييز (Drop Zone) بشكل ديناميكي ذكي.
   * يعتمد على أبعاد القطعة الطرفية الحالية (أفقية أم عمودية) لمنع تداخل حافة التمييز مع النقاط.
   */
  const endZoneStyle = (p: { x: number; y: number; w: number; h: number }, side: EndSide): React.CSSProperties => {
    const isVertical = p.h > p.w;
    let zoneX = p.x;
    let zoneY = p.y;

    if (side === 'left') {
      if (isVertical) {
        zoneY = p.y - 1.2; // إذا كانت عمودية، التمييز يظهر فوقها أو تحتها
        zoneX = p.x - 0.25;
      } else {
        zoneX = p.x - 1.5; // إذا كانت أفقية، يظهر على يسارها
        zoneY = p.y - 0.25;
      }
    } else {
      if (isVertical) {
        zoneY = p.y + p.h + 0.2;
        zoneX = p.x - 0.25;
      } else {
        zoneX = p.x + p.w + 0.2;
        zoneY = p.y - 0.25;
      }
    }

    return {
      left: zoneX * CELL,
      top: zoneY * CELL,
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
        className="absolute transition-transform duration-300 ease-out"
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
          // حساب التمركز المطلق داخل المساحة المخصصة للقطعة بدقة
          const isVertical = p.h > p.w;
          
          return (
            <div
              key={p.tile.id}
              className="absolute flex items-center justify-center"
              style={{
                left: p.x * CELL,
                top: p.y * CELL,
                width: p.w * CELL,
                height: p.h * CELL,
              }}
            >
              <div
                style={{
                  transform: `rotate(${p.rotation}deg)`,
                  transformOrigin: 'center center',
                  // موازنة الأبعاد الداخلية بناءً على الدوران الحقيقي للقطعة
                  width: isVertical ? CELL : CELL * 2,
                  height: isVertical ? CELL * 2 : CELL,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* استدعاء قطعة الدومينو وتمرير زاوية 0 لأن الدوران تمت معالجته بالـ Wrapper الخارجي بدقة */}
                <DominoTile
                  tile={p.tile}
                  size="md"
                  faceUp={true}
                  rotation={0}
                />
              </div>
            </div>
          );
        })}

        {/* تمييز الطرف الأيسر (أول السلسلة) */}
        {leftEndTile && highlightEnds.includes('left') && (
          <div
            ref={(el) => { if (dropSideRefs) dropSideRefs.current.left = el; }}
            onClick={() => onSelectSide?.('left')}
            className="absolute rounded-lg cursor-pointer animate-pulse z-10"
            style={{
              ...endZoneStyle(leftEndTile, 'left'),
              border: '2px dashed #2ECC40',
              background: 'rgba(46, 204, 64, 0.25)',
              boxShadow: '0 0 10px rgba(46, 204, 64, 0.5)',
            }}
          />
        )}

        {/* تمييز الطرف الأيمن (آخر السلسلة) */}
        {rightEndTile && highlightEnds.includes('right') && (
          <div
            ref={(el) => { if (dropSideRefs) dropSideRefs.current.right = el; }}
            onClick={() => onSelectSide?.('right')}
            className="absolute rounded-lg cursor-pointer animate-pulse z-10"
            style={{
              ...endZoneStyle(rightEndTile, 'right'),
              border: '2px dashed #2ECC40',
              background: 'rgba(46, 204, 64, 0.25)',
              boxShadow: '0 0 10px rgba(46, 204, 64, 0.5)',
            }}
          />
        )}
      </div>
    </div>
  );
}

export const Board = memo(BoardComponent);
Board.displayName = 'Board';
