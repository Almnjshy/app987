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

  const endZoneStyle = (p: { x: number; y: number; rotation: number }, side: EndSide): React.CSSProperties => {
    // تحديد اتجاه حافة القطعة المفتوحة بناءً على دورانها الحالي بدقة ليوضع التمييز أمام الرقم المماثل تماماً
    let offsetX = 0;
    let offsetY = 0;
    const rot = p.rotation % 360;

    if (rot === 90) {
      offsetX = side === 'left' ? -1.5 : 1.5;
    } else if (rot === 270) {
      offsetX = side === 'left' ? 1.5 : -1.5;
    } else if (rot === 0) {
      offsetY = side === 'left' ? -1.5 : 1.5;
    } else if (rot === 180) {
      offsetY = side === 'left' ? 1.5 : -1.5;
    }

    return {
      left: (p.x + offsetX) * CELL - (CELL * 1.5) / 2,
      top: (p.y + offsetY) * CELL - (CELL * 1.5) / 2,
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
        {layout.tiles.map((p) => (
          /* حاوية مركزية ذات حجم صفر تضمن تدوير القطعة الأصلية حول مركزها الرياضي دون تشويه حجمها */
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
                // الإزاحة المركزية الثابتة لنصف الحجم الأصلي للقطعة الرأسية الافتراضية
                left: -CELL / 2,
                top: -CELL,
              }}
            >
              <DominoTile
                tile={p.tile}
                size="md"
                faceUp={true}
                rotation={p.rotation} // إعطاء الدوران للمكون الأصلي مباشرة ليقوم بعمله دون أي تدخل خارجي مشوه
              />
            </div>
          </div>
        ))}

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
