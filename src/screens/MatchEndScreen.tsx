import { useGameStore } from '@/store/gameStore';
import { Star, RotateCcw, Home, ChevronLeft } from 'lucide-react';
import type { Player } from '@/types/game';

export default function MatchEndScreen() {
  const {
    matchWinner,
    matchScores,
    players,
    currentLevel,
    setScreen,
    setCurrentLevel,
    resetMatch,
    completeLevel,
  } = useGameStore();

  const humanPlayer = players.find((p: Player) => p.isHuman);
  const humanWon = humanPlayer?.id === matchWinner;
  const winnerIndex = players.findIndex((p: Player) => p.id === matchWinner);
  const margin = winnerIndex >= 0 ? matchScores[winnerIndex] - Math.max(...matchScores.filter((_: number, i: number) => i !== winnerIndex)) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A0E08] to-[#2D1810] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Confetti effect */}
        {humanWon && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 30 }, (_: number, i: number) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: ['#C9A84C', '#E74C3C', '#3498DB', '#2ECC71', '#F39C12'][i % 5],
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Content */}
        <div className="glass-panel rounded-2xl p-6 text-center relative z-10">
          {/* Trophy or result */}
          <div className="mb-4">
            {humanWon ? (
              <div className="text-6xl animate-bounce">馃弳</div>
            ) : (
              <div className="text-6xl">馃様</div>
            )}
          </div>

          {/* Result text */}
          <h1 className={`text-3xl font-bold font-arabic mb-2 ${humanWon ? 'text-[#C9A84C]' : 'text-white'}`}>
            {humanWon ? '賮夭鬲!' : '禺爻乇鬲!'}
          </h1>

          {/* Level name */}
          <p className="text-white/70 font-arabic mb-4">
            丕賱賲乇丨賱丞 {currentLevel}
          </p>

          {/* Stars */}
          {humanWon && (
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3].map((s: number) => (
                <Star
                  key={s}
                  className={`w-8 h-8 ${s <= (margin >= 40 ? 3 : margin >= 20 ? 2 : 1) ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-white/30'}`}
                />
              ))}
            </div>
          )}

          {/* Score panel */}
          <div className="bg-[#2D1810]/50 rounded-xl p-4 mb-4">
            <h3 className="text-[#C9A84C] font-bold font-arabic mb-2">丕賱賳鬲賷噩丞 丕賱賳賴丕卅賷丞</h3>
            {players.map((player: Player, i: number) => (
              <div key={player.id} className="flex justify-between items-center py-1">
                <span className="text-white font-arabic">{player.name}</span>
                <span className="text-[#C9A84C] font-bold">{matchScores[i] || 0}</span>
              </div>
            ))}
          </div>

          {/* Margin */}
          {humanWon && (
            <p className="text-green-400 font-arabic mb-4">
              賮丕乇賯 丕賱賳賯丕胤: +{margin}
            </p>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                resetMatch();
                setScreen('playing');
              }}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              廿毓丕丿丞 丕賱賱毓亘
            </button>
            {humanWon && currentLevel < 10 && (
              <button
                onClick={() => {
                  setCurrentLevel(currentLevel + 1);
                  resetMatch();
                  setScreen('playing');
                }}
                className="btn-green w-full"
              >
                丕賱賲乇丨賱丞 丕賱鬲丕賱賷丞
              </button>
            )}
            <button
              onClick={() => setScreen('menu')}
              className="btn-blue w-full flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              丕賱賯丕卅賲丞 丕賱乇卅賷爻賷丞
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
