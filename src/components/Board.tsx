import { memo, useMemo, useRef, useState, useEffect } from 'react';
import type { ChainTile, EndSide } from '@/types/game';
import { calculateSnakeLayout, toBoardPositions } from '@/lib/layout';
import { orientFirstTile } from '@/lib/tile';
import { DominoTile } from './DominoTile';

interface BoardProps {
  chain: ChainTile[];
  className?: string;
  highlightEnds?: EndSide[];
  onSelectSide?: (side: EndSide) => void;
  dropSideRefs?: React.MutableRefObject<{ left: HTMLDivElement | null; right: HTMLDivElement | null }>;
}

function BoardComponent({ chain, className = '', highlightEnds = [], onSelectSide, dropSideRefs }: BoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const positions = useMemo(() => {
    if (chain.length === 0) return [];
    
    const orientedTiles = chain.map(ct => ({
      ...ct.tile,
      orientation: ct.orientation,
      leadingPip: ct.left,
      trailingPip: ct.right,
    }));

    const nodes = calculateSnakeLayout(orientedTiles, {
      viewportWidth: containerSize.width,
      viewportHeight: containerSize.height,
      tileWidth: 60,
      tileHeight: 30,
      gap: 5,
      maxRowLength: Math.floor(containerSize.width / 70),
    });

    return toBoardPositions(nodes);
  }, [chain, containerSize]);

  const bounds = useMemo(() => {
    if (positions.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [positions]);

  const offsetX = containerSize.width / 2 - (bounds.minX + bounds.maxX) / 2;
  const offsetY = containerSize.height / 2 - (bounds.minY + bounds.maxY) / 2;

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className}`}>
      {positions.map((pos, idx) => (
        <div
          key={pos.tile.id}
          className="absolute"
          style={{
            left: pos.x + offsetX,
            top: pos.y + offsetY,
            transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)`,
            width: pos.width,
            height: pos.height,
            zIndex: idx + 1,
          }}
        >
          <DominoTile tile={pos.tile} size="md" faceUp={true} rotation={0} />
        </div>
      ))}

      {chain.length > 0 && onSelectSide && (
        <>
          {highlightEnds.includes('left') && (
            <div
              ref={(el) => { if (dropSideRefs) dropSideRefs.current.left = el; }}
              className="absolute w-16 h-16 rounded-full border-2 border-dashed border-[#C9A84C]/50 flex items-center justify-center cursor-pointer hover:bg-[#C9A84C]/20 hover:border-[#C9A84C] transition-all"
              style={{
                left: positions[0] ? positions[0].x + offsetX - 50 : 0,
                top: positions[0] ? positions[0].y + offsetY : 0,
                transform: 'translate(-50%, -50%)',
                zIndex: 100,
              }}
              onClick={() => onSelectSide('left')}
            >
              <span className="text-[#C9A84C] text-xs font-arabic">يسار</span>
            </div>
          )}
          {highlightEnds.includes('right') && (
            <div
              ref={(el) => { if (dropSideRefs) dropSideRefs.current.right = el; }}
              className="absolute w-16 h-16 rounded-full border-2 border-dashed border-[#C9A84C]/50 flex items-center justify-center cursor-pointer hover:bg-[#C9A84C]/20 hover:border-[#C9A84C] transition-all"
              style={{
                left: positions[positions.length - 1] ? positions[positions.length - 1].x + offsetX + 50 : 0,
                top: positions[positions.length - 1] ? positions[positions.length - 1].y + offsetY : 0,
                transform: 'translate(-50%, -50%)',
                zIndex: 100,
              }}
              onClick={() => onSelectSide('right')}
            >
              <span className="text-[#C9A84C] text-xs font-arabic">يمين</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const Board = memo(BoardComponent);
