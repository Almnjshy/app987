import { memo } from 'react';
import type { Player } from '@/types/game';

interface PlayerAvatarProps {
  player: Player;
  isActive: boolean;
  timerProgress?: number;
  position: 'top' | 'left' | 'right' | 'bottom';
  showTiles?: boolean;
  tileCount?: number;
  className?: string;
}

function PlayerAvatarComponent({
  player,
  isActive,
  timerProgress = 1,
  position,
  showTiles = false,
  tileCount = 0,
  className = '',
}: PlayerAvatarProps) {
  const timerColor = timerProgress > 0.5 ? '#27AE60' : timerProgress > 0.17 ? '#F39C12' : '#E74C3C';
  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference * (1 - timerProgress);

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { flexDirection: 'column' },
    bottom: { flexDirection: 'column' },
    left: { flexDirection: 'row' },
    right: { flexDirection: 'row-reverse' },
  };

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      style={positionStyles[position]}
    >
      {/* Avatar with timer ring */}
      <div className="relative">
        {/* Timer ring */}
        {isActive && (
          <svg
            className="absolute"
            style={{ top: -4, left: -4, width: 56, height: 56 }}
            viewBox="0 0 56 56"
          >
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="3"
            />
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke={timerColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 28 28)"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
          </svg>
        )}

        {/* Avatar image */}
        <div
          className={`relative overflow-hidden rounded-full ${
            isActive ? 'ring-2 ring-[#C9A84C] ring-offset-1 ring-offset-[#1A0E08]' : ''
          }`}
          style={{
            width: 48,
            height: 48,
            boxShadow: isActive ? '0 0 15px rgba(201,168,76,0.5)' : '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          <img
            src={player.avatar}
            alt={player.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
          {isActive && (
            <div className="absolute inset-0 rounded-full border-2 border-[#C9A84C] animate-pulse" />
          )}
        </div>

        {/* Online indicator */}
        <div
          className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#1A0E08]"
          style={{ background: '#2ECC40' }}
        />
      </div>

      {/* Info */}
      <div className={`flex flex-col ${position === 'left' || position === 'right' ? 'items-start' : 'items-center'}`}>
        <span className="text-sm font-semibold text-white leading-tight">
          {player.name}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-[#C9A84C]">
            {player.score}
          </span>
          {!showTiles && tileCount > 0 && (
            <span className="text-xs text-[#B8A080]">
              ({tileCount})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export const PlayerAvatar = memo(PlayerAvatarComponent);
PlayerAvatar.displayName = 'PlayerAvatar';
