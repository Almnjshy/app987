import { useGameStore } from '@/store/gameStore';
import { Star, RotateCcw, Home } from 'lucide-react';
import type { Player } from '@/types/game';

const STAGE_NAMES = ['ربع النهائي', 'نصف النهائي', 'النهائي'];

export default function MatchEndScreen() {
  const {
    matchWinner,
    matchScores,
    players,
    currentLevel,
    gameMode,
    tournamentStage,
    setTournamentStage,
    setScreen,
    setCurrentLevel,
    resetMatch,
  } = useGameStore();

  const humanPlayer = players.find((p: Player) => p.isHuman);
  const humanWon = humanPlayer?.id === matchWinner;
  const winnerIndex = players.findIndex((p: Player) => p.id === matchWinner);
  const margin = winnerIndex >= 0
    ? matchScores[winnerIndex] - Math.max(...matchScores.filter((_: number, i: number) => i !== winnerIndex))
    : 0;
  const isTournament = gameMode === 'tournament';
  const tournamentChampion = isTournament && humanWon && tournamentStage >= 3;

  const handleReplay = () => {
    resetMatch();
    setScreen('playing');
  };

  const handleNext = () => {
    if (isTournament) {
      setTournamentStage(Math.min(tournamentStage + 1, 3));
    } else {
      setCurrentLevel(Math.min(currentLevel + 1, 10));
    }
    resetMatch();
    setScreen('playing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A0E08] to-[#2D1810] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* تأثير الاحتفال */}
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

        <div className="glass-panel rounded-2xl p-6 text-center relative z-10">
          <div className="mb-4">
            {humanWon ? (
              <img src={`${import.meta.env.BASE_URL}assets/trophy.png`} alt="كأس" className="w-24 h-24 mx-auto animate-bounce" />
            ) : (
              <div className="text-6xl">😞</div>
            )}
          </div>

          <h1 className={`text-3xl font-bold font-arabic mb-2 ${humanWon ? 'text-[#C9A84C]' : 'text-white'}`}>
            {tournamentChampion ? 'بطل الدومينو! 🏆' : humanWon ? 'فزت!' : 'خسرت!'}
          </h1>

          <p className="text-white/70 font-arabic mb-4">
            {isTournament ? `البطولة — ${STAGE_NAMES[tournamentStage - 1]}` : `المرحلة ${currentLevel}`}
          </p>

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

          <div className="bg-[#2D1810]/50 rounded-xl p-4 mb-4">
            <h3 className="text-[#C9A84C] font-bold font-arabic mb-2">النتيجة النهائية</h3>
            {players.map((player: Player, i: number) => (
              <div key={player.id} className="flex justify-between items-center py-1">
                <span className="text-white font-arabic">{player.name}</span>
                <span className="text-[#C9A84C] font-bold">{matchScores[i] || 0}</span>
              </div>
            ))}
          </div>

          {humanWon && (
            <p className="text-green-400 font-arabic mb-4">فارق النقاط: +{margin}</p>
          )}

          <div className="flex flex-col gap-2">
            {humanWon && (isTournament ? tournamentStage < 3 : currentLevel < 10) && (
              <button onClick={handleNext} className="btn-green w-full">
                {isTournament ? 'الدور التالي' : 'المرحلة التالية'}
              </button>
            )}
            <button
              onClick={handleReplay}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              إعادة اللعب
            </button>
            <button
              onClick={() => {
                resetMatch();
                if (isTournament) setTournamentStage(1);
                setScreen('menu');
              }}
              className="btn-blue w-full flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              القائمة الرئيسية
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
