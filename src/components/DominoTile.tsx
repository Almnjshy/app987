import { memo } from 'react';
import type { Tile } from '@/types/game';

interface DominoTileProps {
  tile: Tile;
  width: number;
  height: number;
  faceUp?: boolean;
  selected?: boolean;
  playable?: boolean;
  onClick?: () => void;
  className?: string;
}

const PIP_POSITIONS: Record<number, [number, number][]> = {
  0: [], 1: [[50, 50]], 
  2: [[25, 25], [75, 75]], 
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

function DominoTileComponent({
  tile, width, height, faceUp = true, selected = false, playable = false, onClick, className = '',
}: DominoTileProps) {
  const isHorizontal = width > height;
  const pipRadius = Math.min(width, height) * 0.12;

  if (!faceUp) {
    return (
      <div
        onClick={onClick}
        className={`relative cursor-pointer transition-all duration-200 ${className}`}
        style={{
          width, height, borderRadius: 6,
          background: 'linear-gradient(135deg, #3D2817 0%, #2D1810 50%, #1A0E08 100%)',
          border: '2px solid #5A3A20',
          boxShadow: '0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full" style={{ width: width * 0.3, height: width * 0.3, border: '2px solid #5A3A20', opacity: 0.5 }} />
        </div>
      </div>
    );
  }

  // تحديد أي رقم يذهب لليسار/أعلى وأيهم لليمين/أسفل بناءً على الأبعاد
  const val1 = isHorizontal ? tile.top : tile.bottom;
  const val2 = isHorizontal ? tile.bottom : tile.top;
  const pips1 = PIP_POSITIONS[val1] || [];
  const pips2 = PIP_POSITIONS[val2] || [];

  return (
    <div
      onClick={playable || selected ? onClick : undefined}
      className={`relative transition-all duration-200 ${playable ? 'cursor-pointer hover:scale-105' : ''} ${className}`}
      style={{
        width, height, borderRadius: 6,
        background: 'linear-gradient(180deg, #FFFEF8 0%, #FFF8F0 50%, #F5EDE0 100%)',
        border: selected ? '3px solid #C9A84C' : playable ? '2px solid #2ECC40' : '2px solid #E0D5C8',
        boxShadow: selected ? '0 0 15px rgba(201,168,76,0.6), 0 4px 12px rgba(0,0,0,0.4)' : '0 3px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
      }}
    >
      {/* النصف الأول */}
      <div className="absolute" style={isHorizontal ? { left: 0, top: 0, bottom: 0, width: '50%' } : { top: 0, left: 0, right: 0, height: '50%' }}>
        {pips1.map(([px, py], i) => (
          <div key={`p1-${i}`} className="absolute rounded-full" style={{
            width: pipRadius * 2, height: pipRadius * 2, left: `${px}%`, top: `${py}%`, transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle at 35% 35%, #333 0%, #1A1A1A 70%, #000 100%)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
          }} />
        ))}
      </div>

      {/* الخط الفاصل الديناميكي */}
      <div className="absolute" style={isHorizontal ? {
        left: '50%', top: '10%', bottom: '10%', width: 2, transform: 'translateX(-50%)',
        background: 'linear-gradient(180deg, transparent 0%, #C9A84C 20%, #C9A84C 80%, transparent 100%)'
      } : {
        top: '50%', left: '10%', right: '10%', height: 2, transform: 'translateY(-50%)',
        background: 'linear-gradient(90deg, transparent 0%, #C9A84C 20%, #C9A84C 80%, transparent 100%)'
      }} />

      {/* النصف الثاني */}
      <div className="absolute" style={isHorizontal ? { right: 0, top: 0, bottom: 0, width: '50%' } : { bottom: 0, left: 0, right: 0, height: '50%' }}>
        {pips2.map(([px, py], i) => (
          <div key={`p2-${i}`} className="absolute rounded-full" style={{
            width: pipRadius * 2, height: pipRadius * 2, left: `${px}%`, top: `${py}%`, transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle at 35% 35%, #333 0%, #1A1A1A 70%, #000 100%)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
          }} />
        ))}
      </div>
    </div>
  );
}

export const DominoTile = memo(DominoTileComponent);
DominoTile.displayName = 'DominoTile';