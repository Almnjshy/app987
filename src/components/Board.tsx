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

  const pad = 1; // خلية هامش
  const fullW = (layout.width + pad * 2) * CELL;
  const fullH = (layout.height + pad * 2) * CELL;
  const scale = Math.min(containerSize.w / fullW, containerSize.h / fullH, 1);

  // مواضع الطرفين الحرّين لعرض التمييز ومناطق الإسقاط
  const leftEndTile = layout.tiles.find((p) => p.tile.id === chain[0].tile.id);
  const rightEndTile = layout.tiles.find((p) => p.tile.id === chain[chain.length - 1].tile.id);

  const endZoneStyle = (p: { x: number; y: number; w: number; h: number }, side: EndSide): React.CSSProperties => {
    const cellX = side === 'left' ? p.x - 1.2 : p.x + p.w + 0.2;
    return {
      left: (pad + cellX) * CELL,
      top: (pad + p.y - 0.25) * CELL,
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
        className="absolute"
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
          <div
            key={p.tile.id}
            className="absolute"
            style={{
              left: (pad + p.x) * CELL + (p.w * CELL) / 2,
              top: (pad + p.y) * CELL + (p.h * CELL) / 2,
              width: 0,
              height: 0,
            }}
          >
            {/* القطعة رأسية التصميم (سمك×طول)، نوسّطها في مساحتها */}
            <div
              style={{
                position: 'absolute',
                left: -CELL / 2,
                top: -CELL,
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
        ))}

        {/* تمييز الطرف الأيسر */}
        {leftEndTile && highlightEnds.includes('left') && (
          <div
            ref={(el) => { if (dropSideRefs) dropSideRefs.current.left = el; }}
            onClick={() => onSelectSide?.('left')}
            className="absolute rounded-lg cursor-pointer animate-pulse"
            style={{
              ...endZoneStyle(leftEndTile, 'left'),
              border: '2px dashed #2ECC40',
              background: 'rgba(46, 204, 64, 0.15)',
            }}
          />
        )}

        {/* تمييز الطرف الأيمن */}
        {rightEndTile && highlightEnds.includes('right') && (
          <div
            ref={(el) => { if (dropSideRefs) dropSideRefs.current.right = el; }}
            onClick={() => onSelectSide?.('right')}
            className="absolute rounded-lg cursor-pointer animate-pulse"
            style={{
              ...endZoneStyle(rightEndTile, 'right'),
              border: '2px dashed #2ECC40',
              background: 'rgba(46, 204, 64, 0.15)',
            }}
          />
        )}
      </div>
    </div>
  );
}

export const Board = memo(BoardComponent);
Board.displayName = 'Board';
