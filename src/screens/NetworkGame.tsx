import { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getHostSession, getGuestSession, clearSessions } from '@/lib/netSession';
import type { NetSnapshot } from '@/lib/net';
import { BoardManager } from '@/lib/board';
import { getValidEnds, hasPlayableTile } from '@/lib/tile';
import type { DominoTile as Tile, BoardEnd as EndSide } from '@/types/game';
import { DominoTile } from '@/components/DominoTile';
import { Board } from '@/components/Board';
import { MessageCircle, Smile, LogOut, Send, Trophy } from 'lucide-react';

interface ChatMsg {
  from: string;
  text: string;
}

export default function NetworkGame() {
  const { setScreen } = useGameStore();
  const [snap, setSnap] = useState<NetSnapshot | null>(null);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [message, setMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const host = getHostSession();
  const guest = getGuestSession();

  // Helper: create BoardManager from snapshot chain
  const getBoardFromSnap = useCallback(() => {
    if (!snap || snap.chain.length === 0) return BoardManager.createEmpty();
    const first = snap.chain[0];
    const last = snap.chain[snap.chain.length - 1];
    return BoardManager.fromState({
      tiles: snap.chain as any,
      leftPip: first?.left ?? null,
      rightPip: last?.right ?? null,
      length: snap.chain.length,
      isEmpty: snap.chain.length === 0,
      hash: '',
    });
  }, [snap]);

  useEffect(() => {
    if (host) {
      host.onSnapshot = (s) => {
        setSnap(s);
        if (s.message) {
          setMessage(s.message);
        }
      };
      host.onChat = (from, text) => setChat((c) => [...c, { from, text }]);
      host.broadcastAll();
      const interval = setInterval(() => host.autoPlayDisconnected(), 2000);
      return () => clearInterval(interval);
    }
    if (guest) {
      guest.onSnapshot = (s) => {
        setSnap(s);
        if (s.message) setMessage(s.message);
      };
      guest.onChat = (from, text) => setChat((c) => [...c, { from, text }]);
      guest.onClosed = () => {
        setMessage('انقطع الاتصال بالمضيف');
      };
    }
  }, [host, guest]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, showChat]);

  const isMyTurn = snap ? snap.currentPlayer === snap.youIndex && snap.matchWinnerIndex === null : false;

  const sendAction = useCallback((action: { type: 'play'; tileId: string; side: EndSide } | { type: 'draw' } | { type: 'pass' }) => {
    if (host) host.hostAction(action);
    else if (guest) guest.send(action);
    setSelectedTile(null);
  }, [host, guest]);

  const handleTileClick = (tile: Tile) => {
    if (!isMyTurn || !snap) return;
    const board = getBoardFromSnap();
    if (!board.canPlay(tile)) return;
    if (selectedTile?.id === tile.id) {
      const sides = getValidEnds(tile, board.leftPip, board.rightPip);
      if (sides.length > 0) {
        sendAction({ type: 'play', tileId: tile.id, side: sides[0] });
      }
    } else {
      setSelectedTile(tile);
    }
  };

  const handleSelectSide = (side: EndSide) => {
    if (selectedTile && snap) {
      const board = getBoardFromSnap();
      const sides = getValidEnds(selectedTile, board.leftPip, board.rightPip);
      if (sides.includes(side)) sendAction({ type: 'play', tileId: selectedTile.id, side });
    }
  };

  const sendChat = (text: string) => {
    if (!text.trim()) return;
    const myName = snap?.players[snap.youIndex]?.name ?? 'أنا';
    if (host) {
      (host as unknown as { broadcast: (m: unknown) => void }).broadcast({ type: 'chat', from: myName, text: text.trim() });
      setChat((c) => [...c, { from: myName, text: text.trim() }]);
    } else if (guest) {
      guest.send({ type: 'chat', text: text.trim() });
      setChat((c) => [...c, { from: myName, text: text.trim() }]);
    }
    setChatInput('');
  };

  const handleQuit = () => {
    if (guest) guest.send({ type: 'leave' });
    clearSessions();
    setScreen('menu');
  };

  if (!host && !guest) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0D7A3A]">
        <p className="text-white font-arabic">لا توجد جلسة شبكة — عودة للقائمة...</p>
      </div>
    );
  }

  if (!snap) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0D7A3A]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-arabic">بانتظار بدء المباراة...</p>
        </div>
      </div>
    );
  }

  // Calculate playable tiles using new engine
  const board = getBoardFromSnap();
  const myMoves = isMyTurn && snap.yourHand
    ? snap.yourHand.filter((t: Tile) => board.canPlay(t)).map((t: Tile) => ({
        tileId: t.id,
        side: getValidEnds(t, board.leftPip, board.rightPip)[0] || 'right' as EndSide,
      }))
    : [];
  const playableIds = new Set(myMoves.map((m) => m.tileId));
  const selectedSides = selectedTile ? getValidEnds(selectedTile, board.leftPip, board.rightPip) : [];
  const canIDraw = isMyTurn && myMoves.length === 0 && snap.boneyardCount > 0;
  const canIPass = isMyTurn && myMoves.length === 0 && snap.boneyardCount === 0;
  const opponents = snap.players.filter((_, i) => i !== snap.youIndex);
  const me = snap.players[snap.youIndex];
  const winner = snap.matchWinnerIndex !== null ? snap.players[snap.matchWinnerIndex] : null;
  const iWon = snap.matchWinnerIndex === snap.youIndex;

  const emojis = ['😀', '😂', '😎', '😤', '👍', '👎', '🎉', '🔥'];

  /* ======================== JSX — NO CHANGES ======================== */
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#0D7A3A]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}assets/table_bg.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

      {/* شريط علوي */}
      <div className="relative z-10 flex items-center justify-between p-3">
        <div className="glass-panel rounded-lg px-3 py-1.5">
          <span className="text-[#C9A84C] text-sm font-bold font-arabic">{snap.targetScore} نقطة</span>
        </div>
        <div className="glass-panel rounded-xl px-4 py-2 text-center">
          <div className="flex items-center gap-3">
            <span className="text-green-400 font-bold text-lg">{me?.score ?? 0}</span>
            <span className="text-white/50">|</span>
            <span className="text-red-400 font-bold text-lg">
              {Math.max(...opponents.map((o) => o.score), 0)}
            </span>
          </div>
        </div>
        <div className="glass-panel rounded-lg px-3 py-1.5">
          <span className="text-[#B8A080] text-xs font-arabic">قطع {snap.boneyardCount}</span>
        </div>
      </div>

      {/* الخصوم */}
      <div className="relative z-10 flex items-center justify-center gap-6 py-1">
        {opponents.map((p, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                p.isActive ? 'ring-2 ring-[#C9A84C]' : ''
              } ${p.connected ? 'bg-[#2A1A10]' : 'bg-red-900/60'}`}
            >
              {p.name.charAt(0)}
            </div>
            <span className="text-white text-xs font-arabic mt-1">{p.name}</span>
            <span className="text-[#C9A84C] text-xs">{p.score} ({p.tileCount})</span>
            {!p.connected && <span className="text-red-400 text-[10px] font-arabic">منقطع — يلعب آلياً</span>}
          </div>
        ))}
      </div>

      {/* الطاولة */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-1 min-h-0">
        <Board
          chain={snap.chain}
          className="w-full h-full"
          highlightEnds={selectedTile ? selectedSides : []}
          onSelectSide={handleSelectSide}
        />
      </div>

      {/* رسالة */}
      {message && (
        <div className="relative z-10 text-center py-0.5">
          <span className="text-[#C9A84C] text-sm font-arabic">{message}</span>
        </div>
      )}
      {isMyTurn && (
        <div className="relative z-10 text-center py-0.5">
          <span className="text-green-400 text-sm font-arabic animate-pulse">دورك!</span>
        </div>
      )}

      {/* يدي */}
      <div className="relative z-10 py-1">
        <div className="flex items-center justify-center gap-1 overflow-x-auto pb-2 px-2">
          {snap.yourHand.map((tile: Tile) => {
            const isPlayable = playableIds.has(tile.id);
            const isSelected = selectedTile?.id === tile.id;
            return (
              <div
                key={tile.id}
                className={`flex-shrink-0 transition-all duration-200 ${
                  isSelected ? '-translate-y-3' : isPlayable ? 'hover:-translate-y-2' : 'opacity-70'
                }`}
                onClick={() => handleTileClick(tile)}
              >
                <DominoTile tile={tile} size="sm" faceUp selected={isSelected} playable={isPlayable && isMyTurn} />
              </div>
            );
          })}
        </div>

        {canIDraw && (
          <div className="text-center mt-1">
            <button
              onClick={() => sendAction({ type: 'draw' })}
              className="px-6 py-2 bg-[#C9A84C] text-[#1A0E08] rounded-lg font-bold text-sm font-arabic hover:scale-105 transition-transform"
            >
              سحب قطعة ({snap.boneyardCount})
            </button>
          </div>
        )}
        {canIPass && (
          <div className="text-center mt-1">
            <button
              onClick={() => sendAction({ type: 'pass' })}
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold text-sm font-arabic hover:scale-105 transition-transform"
            >
              تمرير
            </button>
          </div>
        )}
      </div>

      {/* شريط الإجراءات */}
      <div className="relative z-10 flex items-center justify-center gap-4 py-2">
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform"
        >
          <Smile className="w-5 h-5 text-[#C9A84C]" />
        </button>
        <button
          onClick={() => setShowChat(!showChat)}
          className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform relative"
        >
          <MessageCircle className="w-5 h-5 text-[#C9A84C]" />
          {chat.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
              {chat.length}
            </span>
          )}
        </button>
        <button
          onClick={handleQuit}
          className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform"
        >
          <LogOut className="w-5 h-5 text-red-400" />
        </button>
      </div>

      {/* الإيموجي */}
      {showEmoji && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 glass-panel rounded-xl p-3 flex flex-wrap gap-2 max-w-[200px] z-20">
          {emojis.map((e) => (
            <button
              key={e}
              onClick={() => {
                sendChat(e);
                setShowEmoji(false);
              }}
              className="text-2xl hover:scale-125 transition-transform"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* الدردشة */}
      {showChat && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 glass-panel rounded-xl p-3 w-72 z-20">
          <div className="max-h-40 overflow-y-auto mb-2 space-y-1">
            {chat.length === 0 && <p className="text-white/40 text-xs font-arabic text-center">لا رسائل بعد</p>}
            {chat.map((m, i) => (
              <div key={i} className="text-sm">
                <span className="text-[#C9A84C] font-arabic">{m.from}: </span>
                <span className="text-white font-arabic">{m.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat(chatInput)}
              placeholder="رسالة..."
              maxLength={200}
              className="flex-1 p-2 rounded-lg bg-black/40 text-white text-sm font-arabic border border-[#C9A84C]/30 focus:outline-none placeholder:text-white/30"
            />
            <button
              onClick={() => sendChat(chatInput)}
              className="w-9 h-9 rounded-lg bg-[#C9A84C] flex items-center justify-center"
            >
              <Send className="w-4 h-4 text-[#1A0E08]" />
            </button>
          </div>
        </div>
      )}

      {/* نهاية المباراة */}
      {winner && (
        <div className="absolute inset-0 bg-black/80 z-30 flex items-center justify-center">
          <div className="glass-panel rounded-2xl p-6 max-w-sm w-full mx-4 text-center">
            {iWon ? (
              <Trophy className="w-16 h-16 text-[#C9A84C] mx-auto mb-4" />
            ) : (
              <div className="text-6xl mb-4">😞</div>
            )}
            <h2 className={`text-2xl font-bold font-arabic mb-2 ${iWon ? 'text-[#C9A84C]' : 'text-white'}`}>
              {iWon ? 'فزت! 🎉' : `الفائز: ${winner.name}`}
            </h2>
            <div className="bg-[#2D1810]/50 rounded-xl p-4 my-4">
              {snap.players.map((p, i) => (
                <div key={i} className="flex justify-between py-1">
                  <span className="text-white font-arabic">{p.name}</span>
                  <span className="text-[#C9A84C] font-bold">{p.score}</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleQuit}
              className="w-full py-3 bg-[#2D8A3E] text-white rounded-lg font-bold font-arabic hover:scale-105 transition-transform"
            >
              العودة للقائمة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// نوع مساعد لتفادي أخطاء TS في استدعاء broadcast الخاص
type HostSessionType = ReturnType<typeof getHostSession> extends infer T ? T : never;
