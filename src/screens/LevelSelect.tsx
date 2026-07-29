import { useGameStore } from '@/store/gameStore';
import { LEVELS } from '@/types/game';
import { Lock, Star, ChevronLeft } from 'lucide-react';

export default function LevelSelect() {
  const { setScreen, progress, setCurrentLevel } = useGameStore();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A0E08] to-[#2D1810] p-4">
      <div className="max-w-md mx-auto">
        <button onClick={() => setScreen('menu')} className="mb-4 flex items-center gap-2 text-[#C9A84C]">
          <ChevronLeft className="w-5 h-5" />
          <span className="font-arabic">رجوع</span>
        </button>

        <h1 className="text-2xl font-bold text-white text-center font-arabic mb-6">اختر المرحلة</h1>

        <div className="grid grid-cols-2 gap-3">
          {LEVELS.map((level) => {
            const isUnlocked = level.level <= progress.unlockedLevel;
            const stars = progress.levelStars[level.level] || 0;
            const levelColors = [
              'from-green-600 to-green-800',
              'from-green-500 to-green-700',
              'from-blue-500 to-blue-700',
              'from-blue-600 to-blue-800',
              'from-purple-500 to-purple-700',
              'from-purple-600 to-purple-800',
              'from-orange-500 to-orange-700',
              'from-red-500 to-red-700',
              'from-red-600 to-red-800',
              'from-[#C9A84C] to-[#A08030]',
            ];

            return (
              <button
                key={level.level}
                disabled={!isUnlocked}
                onClick={() => {
                  if (isUnlocked) {
                    setCurrentLevel(level.level);
                    setScreen('playing');
                  }
                }}
                className={`relative rounded-xl p-4 bg-gradient-to-br ${levelColors[level.level - 1]} ${
                  !isUnlocked ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-transform'
                }`}
              >
                {!isUnlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-white/50" />
                  </div>
                )}
                <div className="text-white">
                  <div className="text-2xl font-bold">{level.level}</div>
                  <div className="text-sm font-arabic">{level.nameAr}</div>
                  <div className="text-xs opacity-80">{level.targetScore} نقطة</div>
                  {isUnlocked && (
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3].map((s: number) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${s <= stars ? 'text-yellow-300 fill-yellow-300' : 'text-white/30'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
