import { create } from 'zustand';
import type {
  ScreenType,
  GameMode,
  GameSettings,
  GameProgress,
  PowerUp,
  Tile,
  Player,
  PlacedTile,
  LevelConfig,
} from '@/types/game';
import { LEVELS } from '@/types/game';

interface GameState {
  // Screen
  currentScreen: ScreenType;
  previousScreen: ScreenType;
  setScreen: (screen: ScreenType) => void;
  goBack: () => void;

  // Game mode
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;

  // Level
  currentLevel: number;
  setCurrentLevel: (level: number) => void;

  // Game data
  players: Player[];
  setPlayers: (players: Player[] | ((prev: Player[]) => Player[])) => void;
  boardTiles: PlacedTile[];
  setBoardTiles: (tiles: PlacedTile[] | ((prev: PlacedTile[]) => PlacedTile[])) => void;
  boneyard: Tile[];
  setBoneyard: (tiles: Tile[] | ((prev: Tile[]) => Tile[])) => void;
  currentPlayerIndex: number;
  setCurrentPlayerIndex: (index: number) => void;
  matchScores: number[];
  setMatchScores: (scores: number[] | ((prev: number[]) => number[])) => void;
  turnTimer: number;
  setTurnTimer: (time: number) => void;
  isTimerRunning: boolean;
  setIsTimerRunning: (running: boolean) => void;
  roundWinner: string | null;
  setRoundWinner: (winner: string | null) => void;
  matchWinner: string | null;
  setMatchWinner: (winner: string | null) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  canUndo: boolean;
  setCanUndo: (can: boolean) => void;
  lastMove: { tile: Tile; fromBoneyard: boolean } | null;
  setLastMove: (move: { tile: Tile; fromBoneyard: boolean } | null) => void;
  gameMessage: string;
  setGameMessage: (msg: string) => void;
  animatingTiles: string[];
  setAnimatingTiles: (tiles: string[]) => void;

  // Power-ups
  powerUps: PowerUp[];
  usePowerUp: (type: string) => void;
  resetPowerUps: () => void;

  // Settings
  settings: GameSettings;
  updateSettings: (settings: Partial<GameSettings>) => void;

  // Progress
  progress: GameProgress;
  updateProgress: (progress: Partial<GameProgress>) => void;
  completeLevel: (level: number, stars: number, score: number) => void;

  // Level config
  getCurrentLevelConfig: () => LevelConfig;

  // Stats
  gamesPlayed: number;
  gamesWon: number;
  setGamesPlayed: (n: number) => void;
  setGamesWon: (n: number) => void;

  // Actions
  resetMatch: () => void;
  resetAll: () => void;
}

const defaultSettings: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  vibrationEnabled: true,
  language: 'ar',
};

const defaultProgress: GameProgress = {
  unlockedLevel: 1,
  levelStars: {},
  totalScore: 0,
  totalWins: 0,
  totalLosses: 0,
  longestChain: 0,
  highestScore: 0,
};

const defaultPowerUps: PowerUp[] = [
  { type: 'peek', name: 'Peek', nameAr: 'تلصص', icon: 'eye', uses: 2, maxUses: 2 },
  { type: 'undo', name: 'Undo', nameAr: 'تراجع', icon: 'undo', uses: 1, maxUses: 1 },
  { type: 'extraTime', name: 'Extra Time', nameAr: 'وقت إضافي', icon: 'clock', uses: 2, maxUses: 2 },
  { type: 'hint', name: 'Hint', nameAr: 'تلميح', icon: 'lightbulb', uses: 3, maxUses: 3 },
];

export const useGameStore = create<GameState>((set, get) => ({
  // Screen
  currentScreen: 'title',
  previousScreen: 'title',
  setScreen: (screen: ScreenType) => set((s: GameState) => ({ previousScreen: s.currentScreen, currentScreen: screen })),
  goBack: () => set((s: GameState) => ({ currentScreen: s.previousScreen })),

  // Game mode
  gameMode: 'ai',
  setGameMode: (mode: GameMode) => set({ gameMode: mode }),

  // Level
  currentLevel: 1,
  setCurrentLevel: (level: number) => set({ currentLevel: level }),

  // Game data
  players: [],
  setPlayers: (players: Player[] | ((prev: Player[]) => Player[])) => set((s: GameState) => ({
    players: typeof players === 'function' ? players(s.players) : players,
  })),
  boardTiles: [],
  setBoardTiles: (tiles: PlacedTile[] | ((prev: PlacedTile[]) => PlacedTile[])) => set((s: GameState) => ({
    boardTiles: typeof tiles === 'function' ? tiles(s.boardTiles) : tiles,
  })),
  boneyard: [],
  setBoneyard: (tiles: Tile[] | ((prev: Tile[]) => Tile[])) => set((s: GameState) => ({
    boneyard: typeof tiles === 'function' ? tiles(s.boneyard) : tiles,
  })),
  currentPlayerIndex: 0,
  setCurrentPlayerIndex: (index: number) => set({ currentPlayerIndex: index }),
  matchScores: [0, 0, 0, 0],
  setMatchScores: (scores: number[] | ((prev: number[]) => number[])) => set((s: GameState) => ({
    matchScores: typeof scores === 'function' ? scores(s.matchScores) : scores,
  })),
  turnTimer: 30,
  setTurnTimer: (time: number) => set({ turnTimer: time }),
  isTimerRunning: false,
  setIsTimerRunning: (running: boolean) => set({ isTimerRunning: running }),
  roundWinner: null,
  setRoundWinner: (winner: string | null) => set({ roundWinner: winner }),
  matchWinner: null,
  setMatchWinner: (winner: string | null) => set({ matchWinner: winner }),
  isPaused: false,
  setIsPaused: (paused: boolean) => set({ isPaused: paused }),
  canUndo: false,
  setCanUndo: (can: boolean) => set({ canUndo: can }),
  lastMove: null,
  setLastMove: (move: { tile: Tile; fromBoneyard: boolean } | null) => set({ lastMove: move }),
  gameMessage: '',
  setGameMessage: (msg: string) => set({ gameMessage: msg }),
  animatingTiles: [],
  setAnimatingTiles: (tiles: string[]) => set({ animatingTiles: tiles }),

  // Power-ups
  powerUps: [...defaultPowerUps],
  usePowerUp: (type: string) => set((s: GameState) => ({
    powerUps: s.powerUps.map((p: PowerUp) =>
      p.type === type ? { ...p, uses: Math.max(0, p.uses - 1) } : p
    ),
  })),
  resetPowerUps: () => set({ powerUps: defaultPowerUps.map((p: PowerUp) => ({ ...p, uses: p.maxUses })) }),

  // Settings
  settings: { ...defaultSettings },
  updateSettings: (newSettings: Partial<GameSettings>) => set((s: GameState) => ({
    settings: { ...s.settings, ...newSettings },
  })),

  // Progress
  progress: { ...defaultProgress },
  updateProgress: (newProgress: Partial<GameProgress>) => set((s: GameState) => ({
    progress: { ...s.progress, ...newProgress },
  })),
  completeLevel: (level: number, stars: number, score: number) => set((s: GameState) => {
    const currentStars = s.progress.levelStars[level] || 0;
    const newStars = Math.max(currentStars, stars);
    const newUnlocked = Math.max(s.progress.unlockedLevel, level + 1);
    return {
      progress: {
        ...s.progress,
        unlockedLevel: Math.min(newUnlocked, 10),
        levelStars: { ...s.progress.levelStars, [level]: newStars },
        totalScore: s.progress.totalScore + score,
        totalWins: s.progress.totalWins + 1,
        highestScore: Math.max(s.progress.highestScore, score),
      },
    };
  }),

  // Level config
  getCurrentLevelConfig: () => {
    const level = get().currentLevel;
    return LEVELS[level - 1] || LEVELS[0];
  },

  // Stats
  gamesPlayed: 0,
  gamesWon: 0,
  setGamesPlayed: (n: number) => set({ gamesPlayed: n }),
  setGamesWon: (n: number) => set({ gamesWon: n }),

  // Actions
  resetMatch: () => set({
    boardTiles: [],
    boneyard: [],
    currentPlayerIndex: 0,
    matchScores: [0, 0, 0, 0],
    turnTimer: 30,
    isTimerRunning: false,
    roundWinner: null,
    matchWinner: null,
    isPaused: false,
    canUndo: false,
    lastMove: null,
    gameMessage: '',
    animatingTiles: [],
    players: [],
  }),

  resetAll: () => set({
    currentScreen: 'title',
    previousScreen: 'title',
    gameMode: 'ai',
    currentLevel: 1,
    players: [],
    boardTiles: [],
    boneyard: [],
    currentPlayerIndex: 0,
    matchScores: [0, 0, 0, 0],
    turnTimer: 30,
    isTimerRunning: false,
    roundWinner: null,
    matchWinner: null,
    isPaused: false,
    canUndo: false,
    lastMove: null,
    gameMessage: '',
    animatingTiles: [],
    powerUps: defaultPowerUps.map((p: PowerUp) => ({ ...p, uses: p.maxUses })),
    settings: { ...defaultSettings },
    progress: { ...defaultProgress },
    gamesPlayed: 0,
    gamesWon: 0,
  }),
}));
