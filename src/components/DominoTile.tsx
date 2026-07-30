import { memo } from 'react';
import type { Tile } from '@/types/game';

interface AbsoluteTileProps {
  tile: Tile;
  x: number; y: number; w: number; h: number;
  isVerticalLine: boolean;
  inVal: number; outVal: number;
  dot1X: number; dot1Y: number; dot2X: number; dot2Y: number;
}

const PIP_POSITIONS: Record<number, [number, number][]> = {
  0: [], 1: [[0, 0]], 
  2: [[-8, -8], [8, 8]], 
  3: [[-8, -8], [0, 0], [8, 8]],
  4: [[-8, -8], [8, -8], [-8, 8], [8, 8]],
  5: [[-8, -8], [8, -8], [0, 0], [-8, 8], [8, 8]],
  6: [[-8, -8], [8, -8], [-8, 0], [8, 0], [-8, 8], [8, 8]],
};

function Dots({ value, cx, cy }: { value: number, cx: number, cy: number }) {
  const pips = PIP_POSITIONS[value] || [];
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
      {/* الخط الفاصل */}
      <div className="absolute" style={isVerticalLine ? {
        left: '50%', top: 4, bottom: 4, width: 2, transform: 'translateX(-50%)',
        background: 'linear-gradient(180deg, transparent 0%, #C9A84C 20%, #C9A84C 80%, transparent 100%)'
      } : {
        top: '50%', left: 4, right: 4, height: 2, transform: 'translateY(-50%)',
        background: 'linear-gradient(90deg, transparent 0%, #C9A84C 20%, #C9A84C 80%, transparent 100%)'
      }} />

      {/* النقاط في مواضعها المضبوطة */}
      <Dots value={inVal} cx={dot1X - x} cy={dot1Y - y} />
      <Dots value={outVal} cx={dot2X - x} cy={dot2Y - y} />
    </div>
  );
}

export const AbsoluteDominoTile = memo(AbsoluteDominoTileComponent);