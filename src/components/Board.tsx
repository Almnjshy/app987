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

const CELL = 30;

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

  const layout = useMemo(() => {
    const w = Math.floor(containerSize.w / CELL);
    const h = Math.floor(containerSize.h / CELL);
    return layoutChain(chain, w, h);
  }, [chain, containerSize]);

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

  const pad = 1;
  const fullW = (layout.width + pad * 2) * CELL;
  const fullH = (layout.height + pad * 2) * CELL;
  
  // حماية رياضية لمنع scale من أن يكون NaN أو صفر
  const rawScale = Math.min(containerSize.w / fullW, containerSize.h / fullH);
  const scale = isFinite(rawScale) && rawScale > 0 ? Math.min(rawScale, 1) : 1;

  const leftEndTile = layout.tiles.find((p) => p.tile.id === chain[0].tile.id);
  const rightEndTile = layout.tiles.find((p) => p.tile.id === chain[chain.length - 1].tile.id);

  const endZoneStyle = (p: { x: number; y: number; w: number; h: number }, side: EndSide): React.CSSProperties => {
    const cellX = side === 'left' ? p.x - 1.5 : p.x + p.w + 0.5;
    const cellY = p.y + p.h / 2 - 0.75;
    return {
      left: (pad + cellX) * CELL,
      top: (pad + cellY) * CELL,
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
            className="absolute flex items-center justify-center"
            style={{
              left: (pad + p.x) * CELL,
              top: (pad + p.y) * CELL,
              width: p.w * CELL,
              height: p.h * CELL,
            }}
          >
            <DominoTile tile={p.tile} size="sm" faceUp={true} rotation={p.rotation} />
          </div>
        ))}

        {leftEndTile && highlightEnds.includes('left') && (
          <div
            ref={(el) => { if (dropSideRefs) dropSideRefs.current.left = el; }}
            onClick={() => onSelectSide?.('left')}
            className="absolute rounded-lg cursor-pointer animate-pulse z-10"
            style={{ ...endZoneStyle(leftEndTile, 'left'), border: '2px dashed #2ECC40', background: 'rgba(46, 204, 64, 0.15)' }}
          />
        )}

        {rightEndTile && highlightEnds.includes('right') && (
          <div
            ref={(el) => { if (dropSideRefs) dropSideRefs.current.right = el; }}
            onClick={() => onSelectSide?.('right')}
            className="absolute rounded-lg cursor-pointer animate-pulse z-10"
            style={{ ...endZoneStyle(rightEndTile, 'right'), border: '2px dashed #2ECC40', background: 'rgba(46, 204, 64, 0.15)' }}
          />
        )}
      </div>
    </div>
  );
}

export const Board = memo(BoardComponent);
Board.displayName = 'Board';