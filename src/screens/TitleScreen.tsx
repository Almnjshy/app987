import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';

export default function TitleScreen() {
  const { setScreen } = useGameStore();
  const [showTap, setShowTap] = useState(false);
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    rotation: number;
    size: number;
    duration: number;
    delay: number;
  }>>([]);

  useEffect(() => {
    const timer = setTimeout(() => setShowTap(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const newParticles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      rotation: Math.random() * 360,
      size: 20 + Math.random() * 30,
      duration: 8 + Math.random() * 12,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      onClick={() => setScreen('menu')}
    >
      {/* Background image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(./assets/title_bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />

      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute pointer-events-none opacity-20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size * 2,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        >
          <div
            className="w-full h-full rounded"
            style={{
              background: 'linear-gradient(180deg, #C9A84C 0%, #A08030 100%)',
              transform: `rotate(${p.rotation}deg)`,
              opacity: 0.3,
            }}
          />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4">
        {/* Domino tiles decoration */}
        <div className="flex items-center gap-4 mb-2">
          <div
            className="w-12 h-20 rounded-lg border-2 border-[#C9A84C]/40 flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #FFFEF8 0%, #F5EDE0 100%)',
              transform: 'rotate(-15deg)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            }}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-[#1A1A1A]" />
                <div className="w-2 h-2 rounded-full bg-[#1A1A1A]" />
              </div>
              <div className="w-full h-px bg-[#C9A84C]/50" />
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-[#1A1A1A]" />
                <div className="w-2 h-2 rounded-full bg-[#1A1A1A]" />
              </div>
            </div>
          </div>

          {/* Crown */}
          <div className="text-5xl animate-pulse-glow">👑</div>

          <div
            className="w-12 h-20 rounded-lg border-2 border-[#C9A84C]/40 flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #FFFEF8 0%, #F5EDE0 100%)',
              transform: 'rotate(15deg)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            }}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-[#1A1A1A]" />
                <div className="w-2 h-2 rounded-full bg-[#1A1A1A]" />
                <div className="w-2 h-2 rounded-full bg-[#1A1A1A]" />
              </div>
              <div className="w-full h-px bg-[#C9A84C]/50" />
              <div className="w-2 h-2 rounded-full bg-[#1A1A1A]" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1
          className="font-display text-6xl md:text-7xl font-bold tracking-wider gold-text"
          style={{
            textShadow: '0 4px 20px rgba(0,0,0,0.8), 0 0 60px rgba(201,168,76,0.3)',
            letterSpacing: '0.15em',
          }}
        >
          DOMINO
        </h1>

        {/* Arabic subtitle */}
        <p
          className="text-xl text-[#C9A84C]/80 font-arabic font-semibold tracking-widest"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
        >
          دومينو
        </p>

        {/* Tap to start */}
        <div
          className={`mt-12 transition-all duration-700 ${
            showTap ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <p
            className="text-lg text-white/70 font-arabic animate-pulse cursor-pointer"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
          >
            اضغط للبدء
          </p>
        </div>
      </div>

      {/* Bottom decorative tiles */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 opacity-30">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-6 h-10 rounded border border-[#C9A84C]/30"
            style={{
              background: 'linear-gradient(180deg, #FFFEF8 0%, #F5EDE0 100%)',
              transform: `rotate(${(i - 2) * 8}deg)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
