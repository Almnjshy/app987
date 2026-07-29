import { useGameStore } from '@/store/gameStore';
import { Settings, BarChart2, Trophy, Globe, Wifi, Bot, Play } from 'lucide-react';

export default function MainMenu() {
  const { setScreen, setGameMode, setCurrentLevel, setTournamentStage, hasSavedGame } = useGameStore();

  const handlePlayAI = () => {
    setGameMode('ai');
    setCurrentLevel(1);
    setScreen('levelSelect');
  };

  const handleResume = () => {
    try { sessionStorage.setItem('domino_resume', '1'); } catch { /* ignore */ }
    setScreen('playing');
  };

  const handlePlayNetwork = (mode: 'network' | 'online') => {
    setGameMode(mode);
    setScreen('networkLobby');
  };

  const handlePlayTournament = () => {
    setGameMode('tournament');
    setTournamentStage(1);
    setScreen('playing');
  };

  const buttons = [
    {
      id: 'ai',
      label: 'ضد الذكاء الاصطناعي',
      sublabel: 'تحدي الكمبيوتر في مباراة كلاسيكية',
      icon: Bot,
      gradient: 'from-[#2D8A3E] to-[#1A5C28]',
      shadow: '#0F3D18',
      onClick: handlePlayAI,
    },
    {
      id: 'network',
      label: 'اللعب عبر الشبكة',
      sublabel: 'تواصل مع الأصدقاء عبر WiFi',
      icon: Wifi,
      gradient: 'from-[#2B5A9E] to-[#1A3A6E]',
      shadow: '#0F2240',
      onClick: () => handlePlayNetwork('network'),
      badge: 'جديد!',
    },
    {
      id: 'tournament',
      label: 'بطولة',
      sublabel: 'تنافس في بطولة متعددة الجولات',
      icon: Trophy,
      gradient: 'from-[#6B3FA0] to-[#4A2870]',
      shadow: '#2E1848',
      onClick: handlePlayTournament,
    },
    {
      id: 'online',
      label: 'اونلاين',
      sublabel: 'العب ضد لاعبين حقيقيين',
      icon: Globe,
      gradient: 'from-[#C9A84C] to-[#A08030]',
      shadow: '#7A6020',
      onClick: () => handlePlayNetwork('online'),
    },
  ];

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}assets/wood_panel.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <button
          onClick={() => setScreen('statistics')}
          className="w-12 h-12 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform"
        >
          <BarChart2 className="w-6 h-6 text-[#C9A84C]" />
        </button>
        <h2 className="text-[#B8A080] text-sm font-arabic">الإحصائيات</h2>
        <div className="flex-1" />
        <h2 className="text-[#B8A080] text-sm font-arabic">الإعدادات</h2>
        <button
          onClick={() => setScreen('settings')}
          className="w-12 h-12 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform"
        >
          <Settings className="w-6 h-6 text-[#C9A84C]" />
        </button>
      </div>

      {/* Title */}
      <div className="relative z-10 flex flex-col items-center mt-4 mb-6">
        {/* Domino tiles decoration */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-16 rounded-lg border-2 border-[#C9A84C]/50 flex items-center justify-center tile-3d"
            style={{
              background: 'linear-gradient(180deg, #FFFEF8 0%, #F5EDE0 100%)',
              transform: 'rotate(-12deg)',
            }}
          >
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />
              </div>
              <div className="w-full h-px bg-[#C9A84C]/50" />
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />
              </div>
            </div>
          </div>

          <div className="text-3xl">�</div>

          <div
            className="w-10 h-16 rounded-lg border-2 border-[#C9A84C]/50 flex items-center justify-center tile-3d"
            style={{
              background: 'linear-gradient(180deg, #FFFEF8 0%, #F5EDE0 100%)',
              transform: 'rotate(12deg)',
            }}
          >
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />
              </div>
              <div className="w-full h-px bg-[#C9A84C]/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />
            </div>
          </div>
        </div>

        <h1 className="font-display text-4xl font-bold gold-text tracking-wider">DOMINO</h1>
        <p className="text-[#B8A080] text-sm mt-1 font-arabic">اختر وضع اللعب</p>
      </div>

      {/* Buttons */}
      <div className="relative z-10 flex-1 flex flex-col gap-3 px-6 pb-6 overflow-y-auto">
        {hasSavedGame && (
          <button
            onClick={handleResume}
            className="relative w-full p-4 rounded-2xl text-right transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border-2 border-[#C9A84C]"
            style={{
              background: 'linear-gradient(135deg, #1A5C28 0%, #0F3D18 100%)',
              boxShadow: '0 4px 0 #0A2810, 0 6px 20px rgba(0,0,0,0.4)',
            }}
          >
            <div className="flex items-center gap-4">
              <Play className="w-10 h-10 text-[#C9A84C] flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg font-arabic">استكمال المباراة</h3>
                <p className="text-white/60 text-sm font-arabic">لديك مباراة محفوظة لم تنتهِ</p>
              </div>
            </div>
          </button>
        )}
        {buttons.map((btn) => (
          <button
            key={btn.id}
            onClick={btn.onClick}
            className={`relative w-full p-4 rounded-2xl text-right transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`}
            style={{
              background: `linear-gradient(135deg, ${btn.gradient.includes('from-') ? '' : ''}${btn.gradient.split(' ')[0].replace('from-', '')} 0%, ${btn.gradient.split(' ')[1].replace('to-', '')} 100%)`,
              boxShadow: `0 4px 0 ${btn.shadow}, 0 6px 20px rgba(0,0,0,0.4)`,
            }}
          >
            {/* Badge */}
            {btn.badge && (
              <span className="absolute -top-2 left-4 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                {btn.badge}
              </span>
            )}

            <div className="flex items-center gap-4">
              <btn.icon className="w-10 h-10 text-white/90 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg font-arabic">{btn.label}</h3>
                <p className="text-white/60 text-sm font-arabic">{btn.sublabel}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white/70 text-lg">‹</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom decorative tiles */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 pb-2 opacity-20 pointer-events-none">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={`left-${i}`}
              className="w-8 h-14 rounded border border-[#C9A84C]/30"
              style={{
                background: 'linear-gradient(180deg, #FFFEF8 0%, #F5EDE0 100%)',
                transform: `rotate(${(i - 1) * 15 - 10}deg)`,
              }}
            />
          ))}
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={`right-${i}`}
              className="w-8 h-14 rounded border border-[#C9A84C]/30"
              style={{
                background: 'linear-gradient(180deg, #FFFEF8 0%, #F5EDE0 100%)',
                transform: `rotate(${(i - 1) * 15 + 10}deg)`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}