import { useGameStore } from '@/store/gameStore';
import { X, Volume2, VolumeX, Music, Vibrate, Globe } from 'lucide-react';

export default function SettingsScreen() {
  const { settings, updateSettings, goBack } = useGameStore();

  const toggleSetting = (key: 'soundEnabled' | 'musicEnabled' | 'vibrationEnabled') => {
    updateSettings({ [key]: !settings[key] });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden z-50">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" onClick={goBack} />

      {/* Panel */}
      <div className="relative z-10 wood-panel rounded-2xl p-6 w-96 max-w-[90%] animate-scale-in">
        {/* Close button */}
        <button
          onClick={goBack}
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5 text-[#C9A84C]" />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold gold-text font-arabic text-center mb-6">
          الإعدادات
        </h2>

        {/* Settings list */}
        <div className="space-y-4">
          {/* Sound */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              {settings.soundEnabled ? (
                <Volume2 className="w-5 h-5 text-[#C9A84C]" />
              ) : (
                <VolumeX className="w-5 h-5 text-[#B8A080]" />
              )}
              <span className="text-white text-sm font-arabic">الصوت</span>
            </div>
            <button
              onClick={() => toggleSetting('soundEnabled')}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                settings.soundEnabled ? 'bg-[#C9A84C]' : 'bg-white/20'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.soundEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Music */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <Music className={`w-5 h-5 ${settings.musicEnabled ? 'text-[#C9A84C]' : 'text-[#B8A080]'}`} />
              <span className="text-white text-sm font-arabic">الموسيقى</span>
            </div>
            <button
              onClick={() => toggleSetting('musicEnabled')}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                settings.musicEnabled ? 'bg-[#C9A84C]' : 'bg-white/20'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.musicEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Vibration */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <Vibrate className={`w-5 h-5 ${settings.vibrationEnabled ? 'text-[#C9A84C]' : 'text-[#B8A080]'}`} />
              <span className="text-white text-sm font-arabic">الاهتزاز</span>
            </div>
            <button
              onClick={() => toggleSetting('vibrationEnabled')}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                settings.vibrationEnabled ? 'bg-[#C9A84C]' : 'bg-white/20'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.vibrationEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-[#C9A84C]" />
              <span className="text-white text-sm font-arabic">اللغة</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => updateSettings({ language: 'ar' })}
                className={`px-3 py-1 rounded-lg text-sm font-arabic transition-colors ${
                  settings.language === 'ar'
                    ? 'bg-[#C9A84C] text-[#1A0E08]'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                العربية
              </button>
              <button
                onClick={() => updateSettings({ language: 'en' })}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  settings.language === 'en'
                    ? 'bg-[#C9A84C] text-[#1A0E08]'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>

        {/* Reset */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <button
            onClick={() => {
              if (confirm('هل أنت متأكد من إعادة تعيين جميع التقدم؟')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="w-full py-2 rounded-lg bg-[#E74C3C]/20 text-[#E74C3C] text-sm font-arabic hover:bg-[#E74C3C]/30 transition-colors"
          >
            إعادة تعيين التقدم
          </button>
        </div>
      </div>
    </div>
  );
}
