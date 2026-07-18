import { memo, useRef, useEffect, useState } from 'react';
import type { PlacedTile } from '@/types/game';
import { DominoTile } from './DominoTile';

interface BoardProps {
  boardTiles: PlacedTile[];
  className?: string;
}

function BoardComponent({ boardTiles, className = '' }: BoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollX, setScrollX] = useState(0);
  const isDragging = useRef(false);
  const dragStart = useRef(0);
  const scrollStart = useRef(0);

  useEffect(() => {
    if (containerRef.current && boardTiles.length > 6) {
      const container = containerRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      setScrollX(maxScroll / 2);
    }
  }, [boardTiles.length]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = e.clientX;
    scrollStart.current = scrollX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientX - dragStart.current;
    setScrollX(scrollStart.current - delta);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    dragStart.current = e.touches[0].clientX;
    scrollStart.current = scrollX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const delta = e.touches[0].clientX - dragStart.current;
    setScrollX(scrollStart.current - delta);
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  if (boardTiles.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{
          background: 'rgba(13, 122, 58, 0.15)',
          borderRadius: 16,
          border: '2px dashed rgba(201, 168, 76, 0.2)',
        }}
      >
        <span className="text-[#B8A080] text-sm">ابدأ اللعب</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden cursor-grab active:cursor-grabbing ${className}`}
      style={{
        background: 'rgba(13, 122, 58, 0.1)',
        borderRadius: 16,
        border: '1px solid rgba(201, 168, 76, 0.15)',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex items-center justify-center h-full transition-transform duration-300"
        style={{
          transform: `translateX(${-scrollX}px)`,
          minWidth: '100%',
        }}
      >
        <div className="flex items-center gap-0">
          {boardTiles.map((placed, index) => (
            <div
              key={placed.tile.id}
              className="flex-shrink-0"
              style={{
                marginLeft: index > 0 ? -12 : 0,
                zIndex: index,
                animation: `dealTile 0.3s ease-out ${index * 0.05}s both`,
              }}
            >
              <DominoTile
                tile={placed.tile}
                size="md"
                faceUp={true}
                rotation={placed.rotation}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicators */}
      {scrollX > 0 && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center">
          <span className="text-white text-lg">◄</span>
        </div>
      )}
      {containerRef.current && scrollX < containerRef.current.scrollWidth - containerRef.current.clientWidth && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center">
          <span className="text-white text-lg">►</span>
        </div>
      )}
    </div>
  );
}

export const Board = memo(BoardComponent);
Board.displayName = 'Board';
