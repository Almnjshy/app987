import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { HostSession, GuestSession } from '@/lib/net';
import { setHostSession, setGuestSession, clearSessions } from '@/lib/netSession';
import { ChevronLeft, Copy, Users, Wifi, Check } from 'lucide-react';

type Mode = 'choose' | 'host' | 'join';

export default function NetworkLobby() {
  const { setScreen } = useGameStore();
  const [mode, setMode] = useState<Mode>('choose');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [players, setPlayers] = useState<{ name: string; isHost: boolean }[]>([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const hostRef = useRef<HostSession | null>(null);
  const guestRef = useRef<GuestSession | null>(null);

  useEffect(() => {
    return () => {
      // عند مغادرة الردهة دون بدء لعبة، أغلق الجلسات
      if (useGameStore.getState().currentScreen !== 'networkGame') {
        // لا نغلق هنا إن انتقلنا للعبة — NetworkGame يتولى الجلسة
      }
    };
  }, []);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  /* ------------------------- المضيف ------------------------- */
  const handleCreateRoom = async () => {
    if (!name.trim()) {
      setError('أدخل اسمك أولاً');
      return;
    }
    setBusy(true);
    setError('');
    try {
      clearSessions();
      const host = new HostSession(name.trim());
      host.onLobby = (p) => setPlayers(p);
      hostRef.current = host;
      setHostSession(host);
      const code = await host.createInvite();
      setInviteCode(code);
      setPlayers(host.lobbyPlayers());
    } catch {
      setError('فشل إنشاء الغرفة — تحقق من دعم المتصفح لـ WebRTC');
    }
    setBusy(false);
  };

  const handleAcceptAnswer = async () => {
    if (!hostRef.current || !answerInput.trim()) return;
    setBusy(true);
    setError('');
    try {
      const slotIndex = hostRef.current.guests.length - 1;
      await hostRef.current.acceptAnswer(slotIndex, answerInput.trim());
      setAnswerInput('');
      // جهّز دعوة للاعب التالي (حتى 4 لاعبين)
      if (hostRef.current.guests.length < 3) {
        const code = await hostRef.current.createInvite();
        setInviteCode(code);
      } else {
        setInviteCode('');
      }
    } catch {
      setError('رمز الإجابة غير صالح');
    }
    setBusy(false);
  };

  const handleStartGame = () => {
    const host = hostRef.current;
    if (!host) return;
    try {
      host.startGame();
      setScreen('networkGame');
    } catch {
      setError('يلزم انضمام لاعب واحد على الأقل');
    }
  };

  /* ------------------------- الضيف ------------------------- */
  const handleJoin = async () => {
    if (!name.trim()) {
      setError('أدخل اسمك أولاً');
      return;
    }
    if (!joinInput.trim()) {
      setError('الصق رمز الدعوة');
      return;
    }
    setBusy(true);
    setError('');
    try {
      clearSessions();
      const guest = new GuestSession(name.trim());
      guest.onLobby = (p) => setPlayers(p);
      guest.onError = (m) => setError(m);
      guest.onSnapshot = () => setScreen('networkGame');
      guestRef.current = guest;
      setGuestSession(guest);
      const code = await guest.join(joinInput.trim());
      setAnswerCode(code);
    } catch {
      setError('رمز الدعوة غير صالح');
    }
    setBusy(false);
  };

  const handleBack = () => {
    clearSessions();
    hostRef.current = null;
    guestRef.current = null;
    setScreen('menu');
  };

  const connectedCount = players.length;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}assets/wood_panel.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

      <div className="relative z-10 flex items-center p-4">
        <button onClick={handleBack} className="flex items-center gap-2 text-[#C9A84C]">
          <ChevronLeft className="w-5 h-5" />
          <span className="font-arabic">رجوع</span>
        </button>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Wifi className="w-6 h-6 text-[#C9A84C]" />
            <h1 className="text-2xl font-bold gold-text font-arabic">اللعب الجماعي</h1>
          </div>

          <p className="text-[#B8A080] text-sm font-arabic text-center mb-4">
            يعمل على نفس الشبكة (Hotspot / Wi-Fi) وعبر الإنترنت — بدون خادم.
            تبادل رموز الدعوة مع أصدقائك عبر أي تطبيق مراسلة.
          </p>

          {mode === 'choose' && (
            <div className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسمك"
                maxLength={20}
                className="w-full p-3 rounded-xl bg-white/10 text-white font-arabic placeholder:text-white/40 border border-[#C9A84C]/30 focus:outline-none focus:border-[#C9A84C]"
              />
              <button
                onClick={() => setMode('host')}
                disabled={!name.trim()}
                className="w-full p-4 rounded-2xl text-right transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #2D8A3E 0%, #1A5C28 100%)',
                  boxShadow: '0 4px 0 #0F3D18, 0 6px 20px rgba(0,0,0,0.4)',
                }}
              >
                <h3 className="text-white font-bold text-lg font-arabic">إنشاء غرفة</h3>
                <p className="text-white/60 text-sm font-arabic">أنشئ رمز دعوة وشاركه مع أصدقائك</p>
              </button>
              <button
                onClick={() => setMode('join')}
                disabled={!name.trim()}
                className="w-full p-4 rounded-2xl text-right transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #2B5A9E 0%, #1A3A6E 100%)',
                  boxShadow: '0 4px 0 #0F2240, 0 6px 20px rgba(0,0,0,0.4)',
                }}
              >
                <h3 className="text-white font-bold text-lg font-arabic">انضمام إلى غرفة</h3>
                <p className="text-white/60 text-sm font-arabic">الصق رمز الدعوة الذي وصلك</p>
              </button>
            </div>
          )}

          {mode === 'host' && (
            <div className="space-y-4">
              <div className="glass-panel rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-[#C9A84C]" />
                  <span className="text-white font-arabic font-bold">اللاعبون ({connectedCount}/4)</span>
                </div>
                {players.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-white font-arabic">{p.name}</span>
                    {p.isHost && <span className="text-[#C9A84C] text-xs font-arabic">(المضيف)</span>}
                  </div>
                ))}
              </div>

              {!inviteCode && players.length === 0 && (
                <button
                  onClick={handleCreateRoom}
                  disabled={busy}
                  className="w-full py-3 bg-[#2D8A3E] text-white rounded-lg font-bold font-arabic hover:scale-105 transition-transform disabled:opacity-50"
                >
                  {busy ? 'جاري الإنشاء...' : 'إنشاء رمز دعوة'}
                </button>
              )}

              {inviteCode && (
                <div className="glass-panel rounded-xl p-4 space-y-2">
                  <p className="text-[#C9A84C] text-sm font-arabic font-bold">1) أرسل رمز الدعوة لصديقك:</p>
                  <textarea
                    readOnly
                    value={inviteCode}
                    rows={3}
                    className="w-full p-2 rounded-lg bg-black/40 text-white/80 text-xs border border-[#C9A84C]/30 focus:outline-none"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                  <button
                    onClick={() => copy(inviteCode)}
                    className="w-full py-2 bg-[#C9A84C] text-[#1A0E08] rounded-lg font-bold text-sm font-arabic flex items-center justify-center gap-2"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'تم النسخ!' : 'نسخ رمز الدعوة'}
                  </button>

                  <p className="text-[#C9A84C] text-sm font-arabic font-bold pt-2">2) الصق رمز الإجابة الذي يرسله صديقك:</p>
                  <textarea
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    rows={3}
                    placeholder="رمز الإجابة..."
                    className="w-full p-2 rounded-lg bg-black/40 text-white text-xs border border-[#C9A84C]/30 focus:outline-none focus:border-[#C9A84C] placeholder:text-white/30"
                  />
                  <button
                    onClick={handleAcceptAnswer}
                    disabled={busy || !answerInput.trim()}
                    className="w-full py-2 bg-[#2B5A9E] text-white rounded-lg font-bold text-sm font-arabic disabled:opacity-50"
                  >
                    {busy ? 'جاري الاتصال...' : 'قبول اللاعب'}
                  </button>
                </div>
              )}

              {connectedCount >= 2 && (
                <button
                  onClick={handleStartGame}
                  className="w-full py-3 bg-[#2D8A3E] text-white rounded-lg font-bold font-arabic hover:scale-105 transition-transform"
                >
                  بدء المباراة ({connectedCount} لاعبين)
                </button>
              )}
            </div>
          )}

          {mode === 'join' && (
            <div className="space-y-4">
              <div className="glass-panel rounded-xl p-4 space-y-2">
                <p className="text-[#C9A84C] text-sm font-arabic font-bold">1) الصق رمز الدعوة من المضيف:</p>
                <textarea
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  rows={3}
                  placeholder="رمز الدعوة..."
                  className="w-full p-2 rounded-lg bg-black/40 text-white text-xs border border-[#C9A84C]/30 focus:outline-none focus:border-[#C9A84C] placeholder:text-white/30"
                />
                <button
                  onClick={handleJoin}
                  disabled={busy || !joinInput.trim() || !name.trim()}
                  className="w-full py-2 bg-[#2B5A9E] text-white rounded-lg font-bold text-sm font-arabic disabled:opacity-50"
                >
                  {busy ? 'جاري الاتصال...' : 'توليد رمز الإجابة'}
                </button>
              </div>

              {answerCode && (
                <div className="glass-panel rounded-xl p-4 space-y-2">
                  <p className="text-[#C9A84C] text-sm font-arabic font-bold">2) أرسل رمز الإجابة للمضيف:</p>
                  <textarea
                    readOnly
                    value={answerCode}
                    rows={3}
                    className="w-full p-2 rounded-lg bg-black/40 text-white/80 text-xs border border-[#C9A84C]/30 focus:outline-none"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                  <button
                    onClick={() => copy(answerCode)}
                    className="w-full py-2 bg-[#C9A84C] text-[#1A0E08] rounded-lg font-bold text-sm font-arabic flex items-center justify-center gap-2"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'تم النسخ!' : 'نسخ رمز الإجابة'}
                  </button>
                  <p className="text-white/60 text-xs font-arabic text-center pt-1">
                    بانتظار بدء المباراة من المضيف...
                  </p>
                </div>
              )}

              {players.length > 0 && (
                <div className="glass-panel rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-[#C9A84C]" />
                    <span className="text-white font-arabic font-bold">اللاعبون ({players.length}/4)</span>
                  </div>
                  {players.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-white font-arabic">{p.name}</span>
                      {p.isHost && <span className="text-[#C9A84C] text-xs font-arabic">(المضيف)</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm font-arabic text-center mt-4">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}