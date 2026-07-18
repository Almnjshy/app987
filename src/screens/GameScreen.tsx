import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import {
  generateAllTiles,
  dealTiles,
  determineFirstPlayer,
  getPlayableTiles,
  canPlayTile,
  placeTileOnBoard,
  getValidSides,
  aiSelectTile,
  calculateRoundWinner,
} from '@/lib/gameEngine';
import { LEVELS, DIFFICULTY_SETTINGS, AI_NAMES } from '@/types/game';
import type { Tile, Player } from '@/types/game';
import { DominoTile } from '@/components/DominoTile';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Board } from '@/components/Board';
import {
  Settings,
  BarChart2,
  MessageCircle,
  Smile,
  Trophy,
  Undo2,
  LogOut,
  Pause,
  Eye,
  Clock,
  Lightbulb,
} from 'lucide-react';

export default function GameScreen() {
  const {
    currentLevel,
    players,
    setPlayers,
    boardTiles,
    setBoardTiles,
    boneyard,
    setBoneyard,
    currentPlayerIndex,
    setCurrentPlayerIndex,
    matchScores,
    setMatchScores,
    setTurnTimer,
    isTimerRunning,
    setIsTimerRunning,
    setRoundWinner,
    matchWinner,
    setMatchWinner,
    isPaused,
    setIsPaused,
    canUndo,
    setCanUndo,
    lastMove,
    setLastMove,
    gameMessage,
    setGameMessage,
    powerUps,
    usePowerUp,
    setScreen,
    completeLevel,
  } = useGameStore();

  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [hintTile, setHintTile] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [scorePopup, setScorePopup] = useState<{ text: string; x: number; y: number } | null>(null);
  const [localTimer, setLocalTimer] = useState(30);
  const [gameReady, setGameReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameInitialized = useRef(false);

  const levelConfig = LEVELS[currentLevel - 1] || LEVELS[0];
  const difficulty = levelConfig.aiDifficulty;
  const targetScore = levelConfig.targetScore;

  // Initialize game
  useEffect(() => {
    if (gameInitialized.current) return;
    gameInitialized.current = true;

    const allTiles = generateAllTiles();
    const tilesPerPlayer = (levelConfig.aiCount + 1) <= 2 ? 7 : 5;
    const { hands, boneyard: newBoneyard } = dealTiles(allTiles, levelConfig.aiCount + 1, tilesPerPlayer);

    const newPlayers: Player[] = [
      {
        id: 'human',
        name: 'أنت',
        avatar: '/assets/avatar_player.png',
        isHuman: true,
        tiles: hands[0],
        score: 0,
        isActive: false,
        tileCount: hands[0].length,
      },
      ...hands.slice(1).map((hand, i) => ({
        id: `ai-${i}`,
        name: AI_NAMES[i % AI_NAMES.length],
        avatar: '/assets/avatar_ai.png',
        isHuman: false,
        tiles: hand,
        score: 0,
        isActive: false,
        tileCount: hand.length,
      })),
    ];

    setPlayers(newPlayers);
    setBoneyard(newBoneyard);
    setBoardTiles([]);
    setMatchScores(new Array(newPlayers.length).fill(0));
    setCurrentPlayerIndex(0);
    setTurnTimer(30);
    setIsTimerRunning(true);
    setRoundWinner(null);
    setMatchWinner(null);
    setCanUndo(false);
    setLastMove(null);
    setGameMessage('');
    setSelectedTile(null);
    setGameReady(true);

    const firstPlayer = determineFirstPlayer(newPlayers);
    setCurrentPlayerIndex(firstPlayer);
    setPlayers(newPlayers.map((p: Player, i: number) => ({ ...p, isActive: i === firstPlayer })));
  }, []);

  // Timer
  useEffect(() => {
    if (!isTimerRunning || isPaused || matchWinner || !gameReady) return;

    setLocalTimer(30);
    timerRef.current = setInterval(() => {
      setLocalTimer((prev: number) => {
        if (prev <= 1) {
          handleTurnTimeout();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, isPaused, matchWinner, currentPlayerIndex, gameReady]);

  // AI Turn
  useEffect(() => {
    if (matchWinner || !gameReady) return;

    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isHuman) return;

    const diffSettings = DIFFICULTY_SETTINGS[difficulty];
    const thinkTime = diffSettings.thinkTimeMin + Math.random() * (diffSettings.thinkTimeMax - diffSettings.thinkTimeMin);

    aiTimeoutRef.current = setTimeout(() => {
      handleAIPlay();
    }, thinkTime);

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [currentPlayerIndex, players, boardTiles, matchWinner, gameReady]);

  const handleTurnTimeout = useCallback(() => {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) return;

    if (boneyard.length > 0) {
      const drawn = boneyard[0];
      const newBoneyard = boneyard.slice(1);
      const newTiles = [...currentPlayer.tiles, drawn];

      setBoneyard(newBoneyard);
      setPlayers(players.map((p: Player, i: number) =>
        i === currentPlayerIndex ? { ...p, tiles: newTiles, tileCount: newTiles.length } : p
      ));

      if (canPlayTile(drawn, boardTiles)) {
        setGameMessage('سحبت قطعة - يمكنك اللعب!');
        setTurnTimer(30);
      } else {
        const nextIndex = (currentPlayerIndex + 1) % players.length;
        setCurrentPlayerIndex(nextIndex);
        setPlayers(players.map((p: Player, i: number) => ({ ...p, isActive: i === nextIndex })));
        setTurnTimer(30);
      }
    } else {
      const nextIndex = (currentPlayerIndex + 1) % players.length;
      setCurrentPlayerIndex(nextIndex);
      setPlayers(players.map((p: Player, i: number) => ({ ...p, isActive: i === nextIndex })));
      setTurnTimer(30);
    }
  }, [players, currentPlayerIndex, boneyard, boardTiles]);

  const handleAIPlay = useCallback(() => {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isHuman) return;

    const playable = getPlayableTiles(currentPlayer.tiles, boardTiles);

    if (playable.length > 0) {
      const move = aiSelectTile(currentPlayer.tiles, boardTiles, difficulty, new Set());
      if (move) {
        const newBoard = placeTileOnBoard(move.tile, boardTiles, move.side);
        const newTiles = currentPlayer.tiles.filter((t: Tile) => t.id !== move.tile.id);

        setBoardTiles(newBoard);
        setPlayers(players.map((p: Player, i: number) =>
          i === currentPlayerIndex ? { ...p, tiles: newTiles, tileCount: newTiles.length } : p
        ));
        setLastMove({ tile: move.tile, fromBoneyard: false });
        setCanUndo(false);

        checkRoundEnd(newTiles, currentPlayerIndex);
      }
    } else {
      if (boneyard.length > 0) {
        const drawn = boneyard[0];
        const newBoneyard = boneyard.slice(1);
        const newTiles = [...currentPlayer.tiles, drawn];

        setBoneyard(newBoneyard);
        setPlayers(players.map((p: Player, i: number) =>
          i === currentPlayerIndex ? { ...p, tiles: newTiles, tileCount: newTiles.length } : p
        ));

        if (canPlayTile(drawn, boardTiles)) {
          setTimeout(() => handleAIPlay(), 1500);
          return;
        } else {
          setGameMessage(`${currentPlayer.name} سحب ومرر`);
        }
      } else {
        setGameMessage(`${currentPlayer.name} مرر`);
      }
      const nextIndex = (currentPlayerIndex + 1) % players.length;
      setCurrentPlayerIndex(nextIndex);
      setPlayers(players.map((p: Player, i: number) => ({ ...p, isActive: i === nextIndex })));
      setTurnTimer(30);
    }
  }, [players, currentPlayerIndex, boardTiles, boneyard, difficulty]);

  const checkRoundEnd = useCallback((playerTiles: Tile[], _playerIndex?: number) => {
    if (playerTiles.length === 0) {
      const { winnerIndex, points } = calculateRoundWinner(players);
      const bonus = 10;
      const totalPoints = points + bonus;

      const newScores = [...matchScores];
      newScores[winnerIndex] += totalPoints;
      setMatchScores(newScores);

      setRoundWinner(players[winnerIndex].name);
      setScorePopup({ text: `+${totalPoints}`, x: 50, y: 50 });
      setTimeout(() => setScorePopup(null), 2000);

      if (newScores[winnerIndex] >= targetScore) {
        setMatchWinner(players[winnerIndex].id);
        setIsTimerRunning(false);
        if (players[winnerIndex].isHuman) {
          const margin = newScores[winnerIndex] - Math.max(...newScores.filter((_: number, i: number) => i !== winnerIndex));
          const stars = margin >= 40 ? 3 : margin >= 20 ? 2 : 1;
          completeLevel(currentLevel, stars, newScores[winnerIndex]);
        }
        setTimeout(() => setScreen('matchEnd'), 2000);
        return;
      }

      setTimeout(() => startNewRound(), 2000);
    } else {
      const nextIndex = (currentPlayerIndex + 1) % players.length;
      setCurrentPlayerIndex(nextIndex);
      setPlayers(players.map((p: Player, i: number) => ({ ...p, isActive: i === nextIndex })));
      setTurnTimer(30);
    }
  }, [players, matchScores, targetScore, currentLevel]);

  const startNewRound = useCallback(() => {
    const allTiles = generateAllTiles();
    const tilesPerPlayer = players.length <= 2 ? 7 : 5;
    const { hands, boneyard: newBoneyard } = dealTiles(allTiles, players.length, tilesPerPlayer);

    const newPlayers = players.map((p: Player, i: number) => ({
      ...p,
      tiles: hands[i],
      tileCount: hands[i].length,
      isActive: false,
    }));

    setPlayers(newPlayers);
    setBoneyard(newBoneyard);
    setBoardTiles([]);
    setRoundWinner(null);
    setCanUndo(false);
    setLastMove(null);
    setGameMessage('');
    setSelectedTile(null);

    const firstPlayer = determineFirstPlayer(newPlayers);
    setCurrentPlayerIndex(firstPlayer);
    setPlayers(newPlayers.map((p: Player, i: number) => ({ ...p, isActive: i === firstPlayer })));
    setTurnTimer(30);
    setIsTimerRunning(true);
  }, [players]);

  const handleTileClick = (tile: Tile) => {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer?.isHuman || matchWinner) return;

    if (!canPlayTile(tile, boardTiles)) {
      setGameMessage('لا يمكن لعب هذه القطعة!');
      setTimeout(() => setGameMessage(''), 1500);
      return;
    }

    if (selectedTile?.id === tile.id) {
      const sides = getValidSides(tile, boardTiles);
      const side = sides[0] || 'right';
      const newBoard = placeTileOnBoard(tile, boardTiles, side);
      const newTiles = currentPlayer.tiles.filter((t: Tile) => t.id !== tile.id);

      setBoardTiles(newBoard);
      setPlayers(players.map((p: Player, i: number) =>
        i === currentPlayerIndex ? { ...p, tiles: newTiles, tileCount: newTiles.length } : p
      ));
      setLastMove({ tile, fromBoneyard: false });
      setCanUndo(true);
      setSelectedTile(null);
      setHintTile(null);

      checkRoundEnd(newTiles, currentPlayerIndex);
    } else {
      setSelectedTile(tile);
    }
  };

  const handleDrawFromBoneyard = () => {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer?.isHuman || matchWinner || boneyard.length === 0) return;

    const drawn = boneyard[0];
    const newBoneyard = boneyard.slice(1);
    const newTiles = [...currentPlayer.tiles, drawn];

    setBoneyard(newBoneyard);
    setPlayers(players.map((p: Player, i: number) =>
      i === currentPlayerIndex ? { ...p, tiles: newTiles, tileCount: newTiles.length } : p
    ));
    setLastMove({ tile: drawn, fromBoneyard: true });

    if (canPlayTile(drawn, boardTiles)) {
      setGameMessage('يمكنك لعب القطعة المسحوبة!');
    } else {
      setTimeout(() => {
        const nextIndex = (currentPlayerIndex + 1) % players.length;
        setCurrentPlayerIndex(nextIndex);
        setPlayers(players.map((p: Player, i: number) => ({ ...p, isActive: i === nextIndex })));
        setTurnTimer(30);
      }, 1000);
    }
  };

  const handleUndo = () => {
    if (!canUndo || !lastMove) return;
    setCanUndo(false);
  };

  const handleUsePowerUp = (type: string) => {
    const powerUp = powerUps.find((p) => p.type === type);
    if (!powerUp || powerUp.uses <= 0) return;

    usePowerUp(type);

    switch (type) {
      case 'hint': {
        const currentPlayer = players[currentPlayerIndex];
        if (currentPlayer?.isHuman) {
          const playable = getPlayableTiles(currentPlayer.tiles, boardTiles);
          if (playable.length > 0) {
            setHintTile(playable[0].id);
            setTimeout(() => setHintTile(null), 3000);
          }
        }
        break;
      }
      case 'extraTime':
        setLocalTimer((prev: number) => Math.min(prev + 15, 60));
        break;
      case 'peek':
        setGameMessage('نظرة خاطفة على قطع الخصم...');
        setTimeout(() => setGameMessage(''), 3000);
        break;
    }
  };

  const handleQuit = () => {
    setIsPaused(true);
    setIsTimerRunning(false);
    setScreen('menu');
  };

  const timerProgress = localTimer / 30;
  const currentPlayer = players[currentPlayerIndex];
  const humanPlayer = players.find((p: Player) => p.isHuman);
  const playableTiles = humanPlayer ? getPlayableTiles(humanPlayer.tiles, boardTiles) : [];

  const emojis = ['😀', '😂', '😎', '😤', '👍', '👎', '🎉', '😱', '🔥', '💀', '🎊', '🤔'];

  if (!gameReady) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0D7A3A]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-arabic">جاري تحميل اللعبة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#0D7A3A]">
      {/* Table background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/app/assets/table_bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

      {/* Top HUD */}
      <div className="relative z-10 flex items-center justify-between p-3">
        {/* Left - Stats */}
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
              <span className="text-white text-sm font-bold">
                {matchScores[0] || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Center - Score */}
        <div className="glass-panel rounded-xl px-4 py-2 text-center">
          <p className="text-[#C9A84C] text-xs font-arabic mb-0.5">
            لعب {targetScore} نقطة
          </p>
          <div className="flex items-center gap-3">
            <span className="text-green-400 font-bold text-lg">
              {matchScores[0] || 0}
            </span>
            <span className="text-white/50">|</span>
            <span className="text-red-400 font-bold text-lg">
              {matchScores[1] || 0}
            </span>
          </div>
        </div>

        {/* Right - Settings */}
        <div className="flex items-center gap-2">
          <div className="glass-panel rounded-lg px-3 py-1.5">
            <span className="text-[#B8A080] text-xs font-arabic">
              قطع {boneyard.length}
            </span>
          </div>
          <button
            onClick={() => setScreen('settings')}
            className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Settings className="w-5 h-5 text-[#C9A84C]" />
          </button>
        </div>
      </div>

      {/* Game area */}
      <div className="relative z-10 flex-1 flex flex-col px-4">
        {/* Top player (AI) */}
        {players.length > 1 && (
          <div className="flex items-center justify-center gap-4 py-2">
            <PlayerAvatar
              player={players[1]}
              isActive={currentPlayerIndex === 1}
              timerProgress={timerProgress}
              position="top"
              tileCount={players[1]?.tileCount}
            />
            {players[2] && (
              <PlayerAvatar
                player={players[2]}
                isActive={currentPlayerIndex === 2}
                timerProgress={timerProgress}
                position="top"
                tileCount={players[2]?.tileCount}
              />
            )}
          </div>
        )}

        {/* Board */}
        <div className="flex-1 flex items-center justify-center py-2">
          <Board boardTiles={boardTiles} className="w-full h-full" />
        </div>

        {/* Bottom player (Human) */}
        <div className="flex items-center justify-center gap-3 py-2">
          <PlayerAvatar
            player={humanPlayer || players[0]}
            isActive={currentPlayerIndex === 0}
            timerProgress={timerProgress}
            position="bottom"
            showTiles
            tileCount={humanPlayer?.tiles.length || 0}
          />
        </div>

        {/* Game message */}
        {gameMessage && (
          <div className="text-center py-1">
            <span className="text-[#C9A84C] text-sm font-arabic animate-fade-in">
              {gameMessage}
            </span>
          </div>
        )}

        {/* Player hand */}
        <div className="py-2">
          <div className="flex items-center justify-center gap-1 overflow-x-auto pb-2 px-2">
            {humanPlayer?.tiles.map((tile: Tile) => {
              const isPlayable = playableTiles.some((t: Tile) => t.id === tile.id);
              const isSelected = selectedTile?.id === tile.id;
              const isHint = hintTile === tile.id;

              return (
                <div
                  key={tile.id}
                  className={`flex-shrink-0 transition-all duration-200 ${
                    isSelected ? '-translate-y-3' : isPlayable ? 'hover:-translate-y-2' : ''
                  } ${isHint ? 'animate-pulse' : ''}`}
                  onClick={() => handleTileClick(tile)}
                >
                  <DominoTile
                    tile={tile}
                    size="sm"
                    faceUp={true}
                    selected={isSelected}
                    playable={isPlayable}
                  />
                </div>
              );
            })}
          </div>

          {/* Boneyard draw button */}
          {currentPlayer?.isHuman && playableTiles.length === 0 && boneyard.length > 0 && (
            <div className="text-center mt-2">
              <button
                onClick={handleDrawFromBoneyard}
                className="px-6 py-2 bg-[#C9A84C] text-[#1A0E08] rounded-lg font-bold text-sm font-arabic hover:scale-105 transition-transform"
              >
                سحب قطعة ({boneyard.length} متبقية)
              </button>
            </div>
          )}

          {/* Pass button */}
          {currentPlayer?.isHuman && playableTiles.length === 0 && boneyard.length === 0 && (
            <div className="text-center mt-2">
              <button
                onClick={() => {
                  const nextIndex = (currentPlayerIndex + 1) % players.length;
                  setCurrentPlayerIndex(nextIndex);
                  setPlayers(players.map((p: Player, i: number) => ({ ...p, isActive: i === nextIndex })));
                  setTurnTimer(30);
                }}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold text-sm font-arabic hover:scale-105 transition-transform"
              >
                تمرير
              </button>
            </div>
          )}
        </div>

        {/* Power-ups bar */}
        <div className="flex items-center justify-center gap-2 py-2">
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

        {/* Bottom action bar */}
        <div className="flex items-center justify-center gap-4 py-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Smile className="w-5 h-5 text-[#C9A84C]" />
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
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

        {/* Emoji picker */}
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

        {/* Score popup */}
        {scorePopup && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
            <div className="text-4xl font-bold text-[#C9A84C] animate-bounce">
              {scorePopup.text}
            </div>
          </div>
        )}

        {/* Pause overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center">
            <div className="glass-panel rounded-2xl p-6 max-w-sm w-full mx-4">
              <h2 className="text-2xl font-bold text-[#C9A84C] text-center mb-6 font-arabic">إيقاف مؤقت</h2>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setIsPaused(false);
                    setIsTimerRunning(true);
                  }}
                  className="w-full py-3 bg-[#2D8A3E] text-white rounded-lg font-bold font-arabic hover:scale-105 transition-transform"
                >
                  استئناف
                </button>
                <button
                  onClick={() => {
                    setIsPaused(false);
                    setScreen('menu');
                  }}
                  className="w-full py-3 bg-[#3D2817] text-[#B8A080] rounded-lg font-bold font-arabic hover:scale-105 transition-transform"
                >
                  الخروج للقائمة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
