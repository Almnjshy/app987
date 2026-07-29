import { useGameStore } from '@/store/gameStore';
import { LEVELS } from '@/types/game';
import { Star, Trophy, TrendingUp, RotateCcw } from 'lucide-react';

export default function StatisticsScreen() {
  const { progress, setScreen } = useGameStore();

  const totalStars = Object.values(progress.levelStars).reduce((a: number, b: number) => a + b, 0);
  const maxStars = LEVELS.length * 3;

  const stats = [
    { label: 'إجمالي النقاط', value: progress.totalScore },
    { label: 'الفوز', value: progress.totalWins },
    { label: 'الخسارة', value: progress.totalLosses },
    { label: 'أعلى نقاط', value: progress.highestScore },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A0E08] to-[#2D1810] p-4">
      <div className="max-w-md mx-auto">
        <button onClick={() => setScreen('menu')} className="mb-4 flex items-center gap-2 text-[#C9A84C]">
          <RotateCcw className="w-5 h-5" />
          <span className="font-arabic">رجوع</span>
        </button>

        <h1 className="text-2xl font-bold text-white text-center font-arabic mb-6">الإحصائيات</h1>

        <div className="glass-panel rounded-xl p-4 mb-4">
          <h2 className="text-lg font-bold text-[#C9A84C] font-arabic mb-2">التقدم العام</h2>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-[#C9A84C]" />
            <span className="text-white">{Math.round((totalStars / maxStars) * 100)}%</span>
          </div>
          <div className="text-sm text-white/70">
            {totalStars}/{maxStars} نجوم
          </div>
          <div className="text-sm text-white/70">
            {progress.unlockedLevel} / 10 مراحل
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-panel rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-[#C9A84C]">{stat.value}</div>
              <div className="text-xs text-white/70 font-arabic">{stat.label}</div>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-bold text-[#C9A84C] font-arabic mb-2">تقدم المراحل</h2>
        {LEVELS.map((level) => {
          const stars = progress.levelStars[level.level] || 0;
          const isUnlocked = level.level <= progress.unlockedLevel;

          return (
            <div key={level.level} className={`glass-panel rounded-xl p-3 mb-2 ${!isUnlocked ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{level.level}</span>
                  <span className="text-white/70 font-arabic">{level.nameAr}</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map((s: number) => (
                    <Star key={s} className={`w-4 h-4 ${s <= stars ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-white/30'}`} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
