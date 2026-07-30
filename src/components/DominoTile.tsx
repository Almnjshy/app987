import { memo } from 'react';
import type { Tile } from '@/types/game';

// ==========================================
// 1. المكون الأصلي (يستخدم لرسم يد اللاعب)
// ==========================================
interface DominoTileProps {
  tile: Tile;
  size?: 'sm' | 'md' | 'lg';
  faceUp?: boolean;
  selected?: boolean;
  playable?: boolean;
  onClick?: () => void;
  className?: string;
  rotation?: number;
  style?: React.CSSProperties;
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
  tile, size = 'md', faceUp = true, selected = false, playable = false, onClick, className = '', rotation = 0, style,
}: DominoTileProps) {
  const sizes = { sm: { w: 30, h: 60 }, md: { w: 40, h: 80 }, lg: { w: 60, h: 120 } };
  const { w, h } = sizes[size];
  const pipRadius = size === 'sm' ? 3 : size === 'md' ? 4 : 6;

  if (!faceUp) {
    return (
      <div onClick={onClick} className={`relative cursor-pointer transition-all duration-200 ${className}`}
        style={{ width: w, height: h, borderRadius: 6, background: 'linear-gradient(135deg, #3D2817 0%, #2D1810 50%, #1A0E08 100%)', border: '2px solid #5A3A20', boxShadow: '0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)', transform: `rotate(${rotation}deg)`, ...style }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full" style={{ width: w * 0.3, height: w * 0.3, border: '2px solid #5A3A20', opacity: 0.5 }} />
        </div>
      </div>
    );
  }

  const topPips = PIP_POSITIONS[tile.top] || [];
  const bottomPips = PIP_POSITIONS[tile.bottom] || [];

  return (
    <div onClick={playable || selected ? onClick : undefined} className={`relative transition-all duration-200 ${playable ? 'cursor-pointer hover:scale-105 hover:-translate-y-1' : selected ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: w, height: h, borderRadius: 6, background: 'linear-gradient(180deg, #FFFEF8 0%, #FFF8F0 50%, #F5EDE0 100%)', border: selected ? '3px solid #C9A84C' : playable ? '2px solid #2ECC40' : '2px solid #E0D5C8', boxShadow: selected ? '0 0 15px rgba(201,168,76,0.6), 0 4px 12px rgba(0,0,0,0.4)' : '0 3px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)', transform: `rotate(${rotation}deg)`, ...style }}>
      <div className="absolute" style={{ top: 0, left: 0, right: 0, height: '50%' }}>
        {topPips.map(([px, py], i) => (<div key={`top-${i}`} className="absolute rounded-full" style={{ width: pipRadius * 2, height: pipRadius * 2, left: `${px}%`, top: `${py}%`, transform: 'translate(-50%, -50%)', background: 'radial-gradient(circle at 35% 35%, #333 0%, #1A1A1A 70%, #000 100%)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }} />))}
      </div>
      <div className="absolute left-1 right-1" style={{ top: '50%', height: 2, transform: 'translateY(-50%)', background: 'linear-gradient(90deg, transparent 0%, #C9A84C 20%, #C9A84C 80%, transparent 100%)' }} />
      <div className="absolute" style={{ bottom: 0, left: 0, right: 0, height: '50%' }}>
        {bottomPips.map(([px, py], i) => (<div key={`bot-${i}`} className="absolute rounded-full" style={{ width: pipRadius * 2, height: pipRadius * 2, left: `${px}%`, top: `${py}%`, transform: 'translate(-50%, -50%)', background: 'radial-gradient(circle at 35% 35%, #333 0%, #1A1A1A 70%, #000 100%)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }} />))}
      </div>
    </div>
  );
}
export const DominoTile = memo(DominoTileComponent);
DominoTile.displayName = 'DominoTile';


// ==========================================
// 2. المكون المباشر (يستخدم لرسم الطاولة Board)
// ==========================================
interface AbsoluteTileProps {
  tile: Tile;
  x: number; y: number; w: number; h: number;
  isVerticalLine: boolean;
  inVal: number; outVal: number;
  dot1X: number; dot1Y: number; dot2X: number; dot2Y: number;
}

const ABS_PIP_POSITIONS: Record<number, [number, number][]> = {
  0: [], 1: [[0, 0]], 
  2: [[-8, -8], [8, 8]], 
  3: [[-8, -8], [0, 0], [8, 8]],
  4: [[-8, -8], [8, -8], [-8, 8], [8, 8]],
  5: [[-8, -8], [8, -8], [0, 0], [-8, 8], [8, 8]],
  6: [[-8, -8], [8, -8], [-8, 0], [8, 0], [-8, 8], [8, 8]],
};

function AbsoluteDots({ value, cx, cy }: { value: number, cx: number, cy: number }) {
  const pips = ABS_PIP_POSITIONS[value] || [];
  const r = 4;
  return (
    <>
      {pips.map(([dx, dy], i) => (
        <div key={i} className="absolute rounded-full" style={{
          width: r * 2, height: r * 2, left: cx + dx, top: cy + dy, transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle at 35% 35%, #333 0%, #1A1A1A 70%, #000 100%)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
        }} />
      ))}
    </>
  );
}

function AbsoluteDominoTileComponent({ x, y, w, h, isVerticalLine, inVal, outVal, dot1X, dot1Y, dot2X, dot2Y }: AbsoluteTileProps) {
  return (
    <div className="absolute" style={{
      left: x, top: y, width: w, height: h, borderRadius: 6, zIndex: 1,
      background: 'linear-gradient(180deg, #FFFEF8 0%, #FFF8F0 50%, #F5EDE0 100%)',
      border: '2px solid #E0D5C8',
      boxShadow: '0 3px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
    }}>
      <div className="absolute" style={isVerticalLine ? {
        left: '50%', top: 4, bottom: 4, width: 2, transform: 'translateX(-50%)',
        background: 'linear-gradient(180deg, transparent 0%, #C9A84C 20%, #C9A84C 80%, transparent 100%)'
      } : {
        top: '50%', left: 4, right: 4, height: 2, transform: 'translateY(-50%)',
        background: 'linear-gradient(90deg, transparent 0%, #C9A84C 20%, #C9A84C 80%, transparent 100%)'
      }} />
      <AbsoluteDots value={inVal} cx={dot1X - x} cy={dot1Y - y} />
      <AbsoluteDots value={outVal} cx={dot2X - x} cy={dot2Y - y} />
    </div>
  );
}
export const AbsoluteDominoTile = memo(AbsoluteDominoTileComponent);