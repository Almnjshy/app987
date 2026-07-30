import { memo, useMemo, useRef, useState, useEffect } from 'react';
import type { ChainTile, EndSide } from '@/types/game';
import { calculateLayout } from '@/lib/boardLayout';
import { AbsoluteDominoTile } from './DominoTile';

interface BoardProps {
  chain: ChainTile[];
  className?: string;
  highlightEnds?: EndSide[];
  onSelectSide?: (side: EndSide) => void;
  dropSideRefs?: React.MutableRefObject<{ left: HTMLDivElement | null; right: HTMLDivElement | null }>;
}

// لوحة افتراضية ضخمة لتصغير القطع (Zoom Out) وجعلها متوسطة الحجم
const BASE_W = 1600;
const BASE_H = 900;

function BoardComponent({ chain, className = '', highlightEnds = [], onSelectSide, dropSideRefs }: BoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 1600, h: 900 });

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

  const layout = useMemo(() => calculateLayout(chain), [chain]);

  if (chain.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`}
        style={{ background: 'rgba(13, 122, 58, 0.15)', borderRadius: 16, border: '2px dashed rgba(201, 168, 76, 0.2)' }}>
        <span className="text-[#B8A080] text-sm font-arabic">ابدأ اللعب</span>
      </div>
    );
  }

  const rawScale = Math.min(containerSize.w / BASE_W, containerSize.h / BASE_H);
  const scale = isFinite(rawScale) && rawScale > 0 ? rawScale : 1;

  const endZoneStyle = (end: { x: number; y: number; dir: string } | null): React.CSSProperties => {
    if (!end) return {};
    return { left: end.x - 22, top: end.y - 22, width: 45, height: 45 };
  };

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}
      style={{ background: 'rgba(13, 122, 58, 0.1)', borderRadius: 16, border: '1px solid rgba(201, 168, 76, 0.15)' }}>
      
      <div className="absolute" style={{
        width: BASE_W, height: BASE_H, left: '50%', top: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center center',
      }}>
        {layout.tiles.map((t) => (
          <AbsoluteDominoTile key={t.tile.id} {...t} tile={t.tile} />
        ))}

        {layout.leftEnd && highlightEnds.includes('left') && (
          <div ref={(el) => { if (dropSideRefs) dropSideRefs.current.left = el; }} onClick={() => onSelectSide?.('left')}
            className="absolute rounded-lg cursor-pointer animate-pulse z-10"
            style={{ ...endZoneStyle(layout.leftEnd), border: '2px dashed #2ECC40', background: 'rgba(46, 204, 64, 0.15)' }} />
        )}

        {layout.rightEnd && highlightEnds.includes('right') && (
          <div ref={(el) => { if (dropSideRefs) dropSideRefs.current.right = el; }} onClick={() => onSelectSide?.('right')}
            className="absolute rounded-lg cursor-pointer animate-pulse z-10"
            style={{ ...endZoneStyle(layout.rightEnd), border: '2px dashed #2ECC40', background: 'rgba(46, 204, 64, 0.15)' }} />
        )}
      </div>
    </div>
  );
}

export const Board = memo(BoardComponent);
Board.displayName = 'Board';