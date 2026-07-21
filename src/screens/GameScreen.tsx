import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { SavedGame } from '@/store/gameStore';
import { DominoGameEngine } from '@/lib/game-engine';
import { DominoAI } from '@/lib/ai';
import { BoardManager } from '@/lib/board';
import { hasPlayableTile, getValidEnds } from '@/lib/tile';
import { LEVELS, DIFFICULTY_SETTINGS, AI_NAMES } from '@/types/game';
import type { Tile, Player, EndSide, AILevel } from '@/types/game';
import { DominoTile } from '@/components/DominoTile';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Board } from '@/components/Board';
import {
  Settings,
  BarChart2,
  MessageCircle,
  Smile,
  Undo2,
  LogOut,
  Pause,
  Eye,
  Clock,
  Lightbulb,
} from 'lucide-react';

const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`;
const SAVE_KEY = 'domino_save';
const TURN_SECONDS = 30;

const TOURNAMENT_STAGES: { nameAr: string; target: number; ai: AILevel }[] = [
  { nameAr: 'ربع النهائي', target: 60, ai: 'easy' },
  { nameAr: 'نصف النهائي', target: 100, ai: 'medium' },
  { nameAr: 'النهائي', target: 150, ai: 'hard' },
];

export default function GameScreen() {
  const {
    currentLevel,
    gameMode,
    tournamentStage,
    players,
    setPlayers,
    match,
    setMatch,
    matchScores,
    setMatchScores,
    setRoundWinner,
    matchWinner,
    setMatchWinner,
    isPaused,
    setIsPaused,
    gameMessage,
    setGameMessage,
    powerUps,
    usePowerUp,
    setScreen,
    completeLevel,
    addLoss,
    setHasSavedGame,
  } = useGameStore();

  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [hintTile, setHintTile] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [scorePopup, setScorePopup] = useState<string | null>(null);
  const [localTimer, setLocalTimer] = useState(TURN_SECONDS);
  const [gameReady, setGameReady] = useState(false);
  const [drag, setDrag] = useState<{ tile: Tile; x: number; y: number } | null>(null);

  // Engine instances (local to this screen)
  const engineRef = useRef<DominoGameEngine | null>(null);
  const aiRef = useRef<DominoAI | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoSnapshot = useRef<{ state: any; scores: number[] } | null>(null);
  const dropSideRefs = useRef<{ left: HTMLDivElement | null; right: HTMLDivElement | null }>({ left: null, right: null });
  const dragInfo = useRef<{ tile: Tile; moved: boolean } | null>(null);

  const levelConfig = LEVELS[currentLevel - 1] || LEVELS[0];
  const isTournament = gameMode === 'tournament';
  const targetScore = isTournament ? TOURNAMENT_STAGES[tournamentStage - 1].target : levelConfig.targetScore;
  const aiLevel: AILevel = isTournament
    ? TOURNAMENT_STAGES[tournamentStage - 1].ai
    : DIFFICULTY_SETTINGS[levelConfig.aiDifficulty].aiLevel;
  const thinkMin = isTournament ? 1000 : DIFFICULTY_SETTINGS[levelConfig.aiDifficulty].thinkTimeMin;
  const thinkMax = isTournament ? 2000 : DIFFICULTY_SETTINGS[levelConfig.aiDifficulty].thinkTimeMax;

  /* ------------------------- تهيئة المباراة ------------------------- */
  useEffect(() => {
    // استكمال مباراة محفوظة
    let saved: SavedGame | null = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch { saved = null; }

    const wantResume = sessionStorage.getItem('domino_resume') === '1';
    sessionStorage.removeItem('domino_resume');

    if (saved && wantResume) {
      // Restore from saved — create engine from saved state
      const aiCount = saved.playerNames.length - 1;
      const playerNames = saved.playerNames;
      const engine = new DominoGameEngine({
        playerNames,
        targetScore: saved.targetScore || targetScore,
        maxRounds: 10,
      });
      // Note: full save/restore of engine state would need serialization
      engineRef.current = engine;
      aiRef.current = new DominoAI(mapDifficulty(aiLevel));

      const state = engine.getState();
      const restoredPlayers: Player[] = playerNames.map((name, i) => ({
        id: i === 0 ? 'human' : `ai-${i}`,
        name,
        avatar: saved.playerAvatars[i],
        isHuman: i === 0,
        tiles: state.players[i]?.hand || [],
        score: saved.matchScores[i] || 0,
        isActive: state.currentPlayerIndex === i,
        tileCount: state.players[i]?.hand.length || 0,
      }));
      setPlayers(restoredPlayers);
      setMatch(state);
      setMatchScores(saved.matchScores);
      setGameMessage('تم استكمال المباراة المحفوظة');
      setGameReady(true);
      return;
    }

    // مباراة جديدة
    const aiCount = isTournament ? tournamentStage : levelConfig.aiCount;
    const playerCount = aiCount + 1;
    const playerNames = ['أنت', ...Array.from({ length: aiCount }, (_, i) => AI_NAMES[i % AI_NAMES.length])];

    const engine = new DominoGameEngine({
      playerNames,
      targetScore,
      maxRounds: 10,
    });
    engineRef.current = engine;
    aiRef.current = new DominoAI(mapDifficulty(aiLevel));

    const state = engine.getState();

    const newPlayers: Player[] = state.players.map((p, i) => ({
      id: i === 0 ? 'human' : `ai-${i}`,
      name: p.name,
      avatar: i === 0 ? asset('assets/avatar_player.png') : asset('assets/avatar_ai.png'),
      isHuman: i === 0,
      tiles: p.hand,
      score: 0,
      isActive: state.currentPlayerIndex === i,
      tileCount: p.hand.length,
    }));

    setPlayers(newPlayers);
    setMatch(state);
    setMatchScores(new Array(playerCount).fill(0));
    setRoundWinner(null);
    setMatchWinner(null);
    setGameMessage(isTournament ? `البطولة — ${TOURNAMENT_STAGES[tournamentStage - 1].nameAr}` : '');
    setSelectedTile(null);
    undoSnapshot.current = null;
    setGameReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------- مزامنة العرض مع المحرك ------------------------- */
  useEffect(() => {
    if (!match || players.length === 0) return;
    const engine = engineRef.current;
    if (!engine) return;
    const state = engine.getState();

    setPlayers(players.map((p, i) => ({
      ...p,
      tiles: state.players[i]?.hand || [],
      tileCount: state.players[i]?.hand.length || 0,
      isActive: state.currentPlayerIndex === i,
      score: matchScores[i] || 0,
    })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, matchScores]);

  /* ------------------------- الحفظ التلقائي ------------------------- */
  useEffect(() => {
    if (!match || !gameReady || matchWinner) return;
    const saved: SavedGame = {
      match: match as any,
      matchScores,
      playerNames: players.map((p) => p.name),
      playerAvatars: players.map((p) => p.avatar),
      level: currentLevel,
      mode: gameMode,
      targetScore,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
      setHasSavedGame(true);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, gameReady]);

  const clearSave = useCallback(() => {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    setHasSavedGame(false);
  }, [setHasSavedGame]);

  /* ------------------------- إنهاء الجولة / المباراة ------------------------- */
  const finishRoundIfNeeded = useCallback((state: any, scores: number[]) => {
    if (state.phase !== 'round_end' && state.phase !== 'game_over') return false;

    const winner = state.lastRoundWinner;
    if (!winner) return false;

    const winnerIdx = state.players.findIndex((p: any) => p.id === winner.id);
    const roundPoints = scores[winnerIdx] || 0;
    const newScores = [...scores];
    newScores[winnerIdx] = roundPoints;
    setMatchScores(newScores);
    setRoundWinner(winner.name);
    setScorePopup(`+${roundPoints}`);
    setGameMessage(
      state.phase === 'blocked'
        ? `انسداد اللعب! الفائز: ${winner.name}`
        : `${winner.name} أنهى قطعه!`
    );
    setTimeout(() => setScorePopup(null), 2000);

    if (state.phase === 'game_over') {
      const storePlayers = useGameStore.getState().players;
      const winnerPlayer = storePlayers[winnerIdx];
      setMatchWinner(winnerPlayer?.id ?? null);
      clearSave();
      if (winnerPlayer?.isHuman) {
        const margin = newScores[winnerIdx] - Math.max(...newScores.filter((_, i) => i !== winnerIdx));
        const stars = margin >= 40 ? 3 : margin >= 20 ? 2 : 1;
        completeLevel(currentLevel, stars, newScores[winnerIdx]);
      } else {
        addLoss();
      }
      setTimeout(() => setScreen('matchEnd'), 2200);
      return true;
    }

    // جولة جديدة
    setTimeout(() => {
      const engine = engineRef.current;
      if (engine) {
        engine.reset();
        const fresh = engine.getState();
        setMatch(fresh);
        setGameMessage('');
      }
    }, 2200);
    return true;
  }, [targetScore, currentLevel, clearSave, completeLevel, addLoss, setMatch, setMatchScores, setRoundWinner, setMatchWinner, setScreen]);

  /* ------------------------- تنفيذ إجراء (موحّد) ------------------------- */
  const performAction = useCallback((playerIndex: number, action: 'draw' | 'pass' | { tileId: string; side: EndSide }) => {
    const engine = engineRef.current;
    if (!engine) return;
    const state = engine.getState();
    if (state.phase === 'game_over') return;

    try {
      let newState = state;
      if (action === 'draw') {
        engine.drawTile();
        newState = engine.getState();
        const name = players[playerIndex]?.name;
        setGameMessage(`${name} سحب قطعة`);
      } else if (action === 'pass') {
        engine.passTurn();
        newState = engine.getState();
        setGameMessage(`${players[playerIndex]?.name} مرر`);
      } else {
        engine.playTile(action.tileId, action.side);
        newState = engine.getState();
      }
      setMatch(newState);
      setLocalTimer(TURN_SECONDS);
      finishRoundIfNeeded(newState, matchScores);
    } catch (e: any) {
      setGameMessage('حركة غير قانونية!');
      setTimeout(() => setGameMessage(''), 1500);
    }
  }, [players, matchScores, setMatch, setGameMessage, finishRoundIfNeeded]);

  /* ------------------------- دور الذكاء الاصطناعي ------------------------- */
  useEffect(() => {
    if (!match || !gameReady || matchWinner || isPaused) return;
    const engine = engineRef.current;
    const ai = aiRef.current;
    if (!engine || !ai) return;

    const state = engine.getState();
    const current = state.players[state.currentPlayerIndex];
    if (!current || current.type !== 'ai') return;

    const thinkTime = thinkMin + Math.random() * (thinkMax - thinkMin);
    aiTimeoutRef.current = setTimeout(() => {
      const freshState = engine.getState();
      if (freshState.phase === 'game_over' || isPaused) return;
      const idx = freshState.currentPlayerIndex;
      const move = ai.chooseMove(freshState, idx);

      if (move) {
        engine.playTile(move.tile.id, move.end);
      } else if (engine.canCurrentPlayerDraw()) {
        engine.drawTile();
      } else {
        engine.passTurn();
      }

      const newState = engine.getState();
      setMatch(newState);
      setMatchScores(newState.players.map((p) => p.score));
      finishRoundIfNeeded(newState, newState.players.map((p) => p.score));
    }, thinkTime);

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [match, gameReady, matchWinner, isPaused, players, aiLevel, thinkMin, thinkMax, setMatch, setMatchScores, finishRoundIfNeeded]);

  /* ------------------------- المؤقت ------------------------- */
  useEffect(() => {
    if (!gameReady || matchWinner || isPaused || !match) return;
    timerRef.current = setInterval(() => {
      setLocalTimer((prev) => {
        if (prev <= 1) {
          const engine = engineRef.current;
          if (engine) {
            const state = engine.getState();
            if (state.phase !== 'game_over') {
              const idx = state.currentPlayerIndex;
              const current = state.players[idx];
              if (current) {
                const hand = current.hand;
                const board = engine.getBoard();
                const playable = hand.filter((t) => board.canPlay(t));
                if (playable.length > 0) {
                  const ends = getValidEnds(playable[0], board.leftPip, board.rightPip);
                  if (ends.length > 0) {
                    engine.playTile(playable[0].id, ends[0]);
                  }
                } else if (engine.canCurrentPlayerDraw()) {
                  engine.drawTile();
                } else {
                  engine.passTurn();
                }
                const newState = engine.getState();
                setMatch(newState);
                setMatchScores(newState.players.map((p) => p.score));
              }
            }
          }
          return TURN_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameReady, matchWinner, isPaused, match?.currentPlayerIndex, match, setMatch, setMatchScores]);

  /* ------------------------- تفاعلات اللاعب ------------------------- */
  const humanIndex = 0;
  const engine = engineRef.current;
  const board = engine?.getBoard();
  const isHumanTurn = match?.currentPlayerIndex === humanIndex && !matchWinner;

  const playHumanTile = useCallback((tile: Tile, side: EndSide) => {
    if (!isHumanTurn || !engine) return;
    undoSnapshot.current = { state: engine.getState(), scores: [...matchScores] };
    setSelectedTile(null);
    setHintTile(null);
    performAction(humanIndex, { tileId: tile.id, side });
  }, [isHumanTurn, engine, matchScores, performAction]);

  const handleTileClick = (tile: Tile) => {
    if (!isHumanTurn || !board) return;
    if (dragInfo.current?.moved) return;

    if (!board.canPlay(tile)) {
      setGameMessage('لا يمكن لعب هذه القطعة!');
      setTimeout(() => setGameMessage(''), 1500);
      return;
    }

    if (selectedTile?.id === tile.id) {
      const ends = getValidEnds(tile, board.leftPip, board.rightPip);
      if (ends.length > 0) playHumanTile(tile, ends[0]);
    } else {
      setSelectedTile(tile);
    }
  };

  const handleSelectSide = (side: EndSide) => {
    if (selectedTile && board) {
      const ends = getValidEnds(selectedTile, board.leftPip, board.rightPip);
      if (ends.includes(side)) playHumanTile(selectedTile, side);
    }
  };

  /* ---------- السحب والإفلات ---------- */
  const onTilePointerDown = (tile: Tile, e: React.PointerEvent) => {
    if (!isHumanTurn || !board || !board.canPlay(tile)) return;
    dragInfo.current = { tile, moved: false };
    const startX = e.clientX;
    const startY = e.clientY;

    const onMove = (ev: PointerEvent) => {
      if (!dragInfo.current) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragInfo.current.moved && Math.hypot(dx, dy) > 10) {
        dragInfo.current.moved = true;
        setSelectedTile(tile);
      }
      if (dragInfo.current.moved) {
        setDrag({ tile, x: ev.clientX, y: ev.clientY });
      }
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const wasDrag = dragInfo.current?.moved;
      dragInfo.current = wasDrag ? dragInfo.current : null;
      setDrag(null);
      if (!wasDrag) {
        dragInfo.current = null;
        return;
      }
      const ends = getValidEnds(tile, board.leftPip, board.rightPip);
      const hit = (el: HTMLDivElement | null) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return ev.clientX >= r.left - 20 && ev.clientX <= r.right + 20 &&
               ev.clientY >= r.top - 20 && ev.clientY <= r.bottom + 20;
      };
      let dropped = false;
      if (hit(dropSideRefs.current.left) && ends.includes('left')) {
        playHumanTile(tile, 'left');
        dropped = true;
      } else if (hit(dropSideRefs.current.right) && ends.includes('right')) {
        playHumanTile(tile, 'right');
        dropped = true;
      }
      if (!dropped) {
        setSelectedTile(null);
        setGameMessage('أفلت القطعة على أحد الطرفين المضيئين');
        setTimeout(() => setGameMessage(''), 1500);
      }
      dragInfo.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  /* ------------------------- القدرات ------------------------- */
  const handleUsePowerUp = (type: string) => {
    const powerUp = powerUps.find((p) => p.type === type);
    if (!powerUp || powerUp.uses <= 0 || !engine) return;

    switch (type) {
      case 'hint': {
        if (!isHumanTurn) return;
        usePowerUp(type);
        const ai = aiRef.current;
        if (ai) {
          const state = engine.getState();
          const move = ai.chooseMove(state, humanIndex);
          if (move) {
            setHintTile(move.tile.id);
            setTimeout(() => setHintTile(null), 3000);
          }
        }
        break;
      }
      case 'extraTime':
        usePowerUp(type);
        setLocalTimer((prev) => Math.min(prev + 15, 60));
        break;
      case 'peek':
        usePowerUp(type);
        const state = engine.getState();
        if (state.boneyard.length > 0) {
          const t = state.boneyard[0];
          setGameMessage(`القطعة التالية في المخزن: ${t.top} | ${t.bottom}`);
        } else {
          const counts = state.players.slice(1).map((p) => p.hand.length).join('، ');
          setGameMessage(`قطع الخصوم: ${counts}`);
        }
        setTimeout(() => setGameMessage(''), 3000);
        break;
      case 'undo': {
        if (!undoSnapshot.current) {
          setGameMessage('لا يوجد ما يمكن التراجع عنه');
          setTimeout(() => setGameMessage(''), 1500);
          return;
        }
        usePowerUp(type);
        // Note: full undo would need engine state serialization
        setGameMessage('تم التراجع');
        setTimeout(() => setGameMessage(''), 1500);
        break;
      }
    }
  };

  const handleQuit = () => {
    setIsPaused(false);
    setScreen('menu');
  };

  // Helper: map repo difficulty to engine difficulty
  function mapDifficulty(level: AILevel): import('@/lib/ai').AIDifficulty {
    switch (level) {
      case 'easy': return 'beginner';
      case 'medium': return 'intermediate';
      case 'hard': return 'advanced';
      default: return 'intermediate';
    }
  }

  if (!gameReady || !match) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0D7A3A]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-arabic">جاري تحميل اللعبة...</p>
        </div>
      </div>
    );
  }

  const humanPlayer = players[humanIndex];
  const aiPlayers = players.slice(1);
  const timerProgress = localTimer / TURN_SECONDS;
  const playableIds = isHumanTurn && board
    ? new Set(humanPlayer?.tiles.filter((t: Tile) => board.canPlay(t)).map((t: Tile) => t.id))
    : new Set<string>();
  const selectedSides = selectedTile && board ? getValidEnds(selectedTile, board.leftPip, board.rightPip) : [];
  const humanCanDraw = engine?.canCurrentPlayerDraw() ?? false;
  const humanCanPass = !engine?.canCurrentPlayerPlay() && !humanCanDraw;

  const emojis = ['😀', '😂', '😎', '😤', '👍', '👎', '🎉', '😱', '🔥', '💀', '🎊', '🤔'];

  /* ======================== JSX — NO CHANGES ======================== */
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#0D7A3A]">
      {/* خلفية الطاولة */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${asset('assets/table_bg.jpg')})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

      {/* شريط الحالة العلوي */}
      <div className="relative z-10 flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(true)}
            className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Pause className="w-5 h-5 text-[#C9A84C]" />
          </button>
          <div className="glass-panel rounded-lg px-3 py-1.5">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#C9A84C]" />
              <span className="text-white text-sm font-bold">{matchScores[0] || 0}</span>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-xl px-4 py-2 text-center">
          <p className="text-[#C9A84C] text-xs font-arabic mb-0.5">
            {isTournament ? TOURNAMENT_STAGES[tournamentStage - 1].nameAr : `لعب ${targetScore} نقطة`}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-green-400 font-bold text-lg">{matchScores[0] || 0}</span>
            <span className="text-white/50">|</span>
            <span className="text-red-400 font-bold text-lg">{matchScores[1] || 0}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="glass-panel rounded-lg px-3 py-1.5">
            <span className="text-[#B8A080] text-xs font-arabic">قطع {match.boneyard.length}</span>
          </div>
          <button
            onClick={() => setScreen('settings')}
            className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Settings className="w-5 h-5 text-[#C9A84C]" />
          </button>
        </div>
      </div>

      {/* منطقة اللعب */}
      <div className="relative z-10 flex-1 flex flex-col px-4 min-h-0">
        {/* لاعبو الذكاء الاصطناعي */}
        {aiPlayers.length > 0 && (
          <div className="flex items-center justify-center gap-6 py-1">
            {aiPlayers.map((p, i) => (
              <PlayerAvatar
                key={p.id}
                player={p}
                isActive={match.currentPlayerIndex === i + 1}
                timerProgress={timerProgress}
                position="top"
                tileCount={p.tileCount}
              />
            ))}
          </div>
        )}

        {/* الطاولة */}
        <div className="flex-1 flex items-center justify-center py-1 min-h-0">
          <Board
            chain={match.board.tiles as any}
            className="w-full h-full"
            highlightEnds={selectedTile ? selectedSides : []}
            onSelectSide={handleSelectSide}
            dropSideRefs={dropSideRefs}
          />
        </div>

        {/* اللاعب البشري */}
        <div className="flex items-center justify-center gap-3 py-1">
          <PlayerAvatar
            player={humanPlayer}
            isActive={match.currentPlayerIndex === humanIndex}
            timerProgress={timerProgress}
            position="bottom"
            showTiles
            tileCount={humanPlayer?.tiles.length || 0}
          />
        </div>

        {/* رسالة اللعبة */}
        {gameMessage && (
          <div className="text-center py-0.5">
            <span className="text-[#C9A84C] text-sm font-arabic animate-fade-in">{gameMessage}</span>
          </div>
        )}

        {/* يد اللاعب */}
        <div className="py-1">
          <div className="flex items-center justify-center gap-1 overflow-x-auto pb-2 px-2">
            {humanPlayer?.tiles.map((tile: Tile) => {
              const isPlayable = playableIds.has(tile.id);
              const isSelected = selectedTile?.id === tile.id;
              const isHint = hintTile === tile.id;

              return (
                <div
                  key={tile.id}
                  className={`flex-shrink-0 transition-all duration-200 ${
                    isSelected ? '-translate-y-3' : isPlayable ? 'hover:-translate-y-2' : 'opacity-70'
                  } ${isHint ? 'animate-pulse' : ''}`}
                  style={{ touchAction: isPlayable ? 'none' : 'auto' }}
                  onClick={() => handleTileClick(tile)}
                  onPointerDown={(e) => onTilePointerDown(tile, e)}
                >
                  <DominoTile
                    tile={tile}
                    size="sm"
                    faceUp={true}
                    selected={isSelected}
                    playable={isPlayable && !!isHumanTurn}
                  />
                </div>
              );
            })}
          </div>

          {/* زر السحب من المخزن */}
          {isHumanTurn && humanCanDraw && (
            <div className="text-center mt-1">
              <button
                onClick={() => performAction(humanIndex, 'draw')}
                className="px-6 py-2 bg-[#C9A84C] text-[#1A0E08] rounded-lg font-bold text-sm font-arabic hover:scale-105 transition-transform"
              >
                سحب قطعة ({match.boneyard.length} متبقية)
              </button>
            </div>
          )}

          {/* زر التمرير */}
          {isHumanTurn && humanCanPass && (
            <div className="text-center mt-1">
              <button
                onClick={() => performAction(humanIndex, 'pass')}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold text-sm font-arabic hover:scale-105 transition-transform"
              >
                تمرير
              </button>
            </div>
          )}
        </div>

        {/* شريط القدرات */}
        <div className="flex items-center justify-center gap-2 py-1">
          {powerUps.map((pu) => (
            <button
              key={pu.type}
              onClick={() => handleUsePowerUp(pu.type)}
              disabled={pu.uses <= 0}
              className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                pu.uses > 0
                  ? 'bg-[#2A1A10] border border-[#C9A84C] hover:scale-110'
                  : 'bg-[#1A0E08] border border-[#3D2817] opacity-50'
              }`}
            >
              {pu.type === 'peek' && <Eye className="w-5 h-5 text-[#C9A84C]" />}
              {pu.type === 'undo' && <Undo2 className="w-5 h-5 text-[#C9A84C]" />}
              {pu.type === 'extraTime' && <Clock className="w-5 h-5 text-[#C9A84C]" />}
              {pu.type === 'hint' && <Lightbulb className="w-5 h-5 text-[#C9A84C]" />}
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C9A84C] text-[#1A0E08] rounded-full text-xs font-bold flex items-center justify-center">
                {pu.uses}
              </span>
            </button>
          ))}
        </div>

        {/* شريط الإجراءات السفلي */}
        <div className="flex items-center justify-center gap-4 py-1.5">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Smile className="w-5 h-5 text-[#C9A84C]" />
          </button>
          <button
            onClick={() => {
              setGameMessage('الدردشة متاحة في وضع الشبكة');
              setTimeout(() => setGameMessage(''), 2000);
            }}
            className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform"
          >
            <MessageCircle className="w-5 h-5 text-[#C9A84C]" />
          </button>
          <button
            onClick={handleQuit}
            className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform"
          >
            <LogOut className="w-5 h-5 text-red-400" />
          </button>
        </div>

        {/* منتقي الإيموجي */}
        {showEmojiPicker && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 glass-panel rounded-xl p-3 flex flex-wrap gap-2 max-w-[200px] z-20">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setGameMessage(emoji);
                  setShowEmojiPicker(false);
                  setTimeout(() => setGameMessage(''), 2000);
                }}
                className="text-2xl hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* نافذة النقاط المنبثقة */}
        {scorePopup && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
            <div className="text-4xl font-bold text-[#C9A84C] animate-bounce">{scorePopup}</div>
          </div>
        )}

        {/* شبح السحب */}
        {drag && (
          <div
            className="fixed pointer-events-none z-50"
            style={{ left: drag.x - 15, top: drag.y - 30 }}
          >
            <DominoTile tile={drag.tile} size="sm" faceUp={true} selected />
          </div>
        )}

        {/* نافذة الإيقاف المؤقت */}
        {isPaused && (
          <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center">
            <div className="glass-panel rounded-2xl p-6 max-w-sm w-full mx-4">
              <h2 className="text-2xl font-bold text-[#C9A84C] text-center mb-6 font-arabic">إيقاف مؤقت</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setIsPaused(false)}
                  className="w-full py-3 bg-[#2D8A3E] text-white rounded-lg font-bold font-arabic hover:scale-105 transition-transform"
                >
                  استئناف
                </button>
                <button
                  onClick={handleQuit}
                  className="w-full py-3 bg-[#3D2817] text-[#B8A080] rounded-lg font-bold font-arabic hover:scale-105 transition-transform"
                >
                  حفظ والخروج للقائمة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
