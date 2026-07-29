import { create } from 'zustand';
import type {
  ScreenType,
  GameMode,
  GameSettings,
  GameProgress,
  PowerUp,
  Player,
  LevelConfig,
  MatchState,
} from '@/types/game';
import { LEVELS } from '@/types/game';

export interface SavedGame {
  match: MatchState;
  matchScores: number[];
  playerNames: string[];
  playerAvatars: string[];
  level: number;
  mode: GameMode;
  targetScore: number;
}

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

  // Tournament (1 = ربع النهائي ... 3 = النهائي)
  tournamentStage: number;
  setTournamentStage: (stage: number) => void;

  // Game data
  players: Player[];
  setPlayers: (players: Player[] | ((prev: Player[]) => Player[])) => void;
  match: MatchState | null;
  setMatch: (match: MatchState | null | ((prev: MatchState | null) => MatchState | null)) => void;
  matchScores: number[];
  setMatchScores: (scores: number[] | ((prev: number[]) => number[])) => void;
  roundWinner: string | null;
  setRoundWinner: (winner: string | null) => void;
  matchWinner: string | null;
  setMatchWinner: (winner: string | null) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  gameMessage: string;
  setGameMessage: (msg: string) => void;

  // Save / resume
  hasSavedGame: boolean;
  setHasSavedGame: (has: boolean) => void;

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
  addLoss: () => void;

  // Level config
  getCurrentLevelConfig: () => LevelConfig;

  // Actions
  resetMatch: () => void;
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

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

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

  // Tournament
  tournamentStage: 1,
  setTournamentStage: (stage: number) => set({ tournamentStage: stage }),

  // Game data
  players: [],
  setPlayers: (players: Player[] | ((prev: Player[]) => Player[])) => set((s: GameState) => ({
    players: typeof players === 'function' ? players(s.players) : players,
  })),
  match: null,
  setMatch: (match) => set((s: GameState) => ({
    match: typeof match === 'function' ? match(s.match) : match,
  })),
  matchScores: [0, 0, 0, 0],
  setMatchScores: (scores) => set((s: GameState) => ({
    matchScores: typeof scores === 'function' ? scores(s.matchScores) : scores,
  })),
  roundWinner: null,
  setRoundWinner: (winner: string | null) => set({ roundWinner: winner }),
  matchWinner: null,
  setMatchWinner: (winner: string | null) => set({ matchWinner: winner }),
  isPaused: false,
  setIsPaused: (paused: boolean) => set({ isPaused: paused }),
  gameMessage: '',
  setGameMessage: (msg: string) => set({ gameMessage: msg }),

  // Save / resume
  hasSavedGame: (() => {
    try { return !!localStorage.getItem('domino_save'); } catch { return false; }
  })(),
  setHasSavedGame: (has: boolean) => set({ hasSavedGame: has }),

  // Power-ups
  powerUps: [...defaultPowerUps],
  usePowerUp: (type: string) => set((s: GameState) => ({
    powerUps: s.powerUps.map((p: PowerUp) =>
      p.type === type ? { ...p, uses: Math.max(0, p.uses - 1) } : p
    ),
  })),
  resetPowerUps: () => set({ powerUps: defaultPowerUps.map((p: PowerUp) => ({ ...p, uses: p.maxUses })) }),

  // Settings
  settings: loadJSON('domino_settings', defaultSettings),
  updateSettings: (newSettings: Partial<GameSettings>) => set((s: GameState) => {
    const settings = { ...s.settings, ...newSettings };
    try { localStorage.setItem('domino_settings', JSON.stringify(settings)); } catch { /* ignore */ }
    return { settings };
  }),

  // Progress
  progress: loadJSON('domino_progress', defaultProgress),
  updateProgress: (newProgress: Partial<GameProgress>) => set((s: GameState) => {
    const progress = { ...s.progress, ...newProgress };
    try { localStorage.setItem('domino_progress', JSON.stringify(progress)); } catch { /* ignore */ }
    return { progress };
  }),
  completeLevel: (level: number, stars: number, score: number) => set((s: GameState) => {
    const currentStars = s.progress.levelStars[level] || 0;
    const newStars = Math.max(currentStars, stars);
    const newUnlocked = Math.max(s.progress.unlockedLevel, level + 1);
    const progress = {
      ...s.progress,
      unlockedLevel: Math.min(newUnlocked, 10),
      levelStars: { ...s.progress.levelStars, [level]: newStars },
      totalScore: s.progress.totalScore + score,
      totalWins: s.progress.totalWins + 1,
      highestScore: Math.max(s.progress.highestScore, score),
    };
    try { localStorage.setItem('domino_progress', JSON.stringify(progress)); } catch { /* ignore */ }
    return { progress };
  }),
  addLoss: () => set((s: GameState) => {
    const progress = { ...s.progress, totalLosses: s.progress.totalLosses + 1 };
    try { localStorage.setItem('domino_progress', JSON.stringify(progress)); } catch { /* ignore */ }
    return { progress };
  }),

  // Level config
  getCurrentLevelConfig: () => {
    const level = get().currentLevel;
    return LEVELS[level - 1] || LEVELS[0];
  },

  // Actions
  resetMatch: () => set({
    players: [],
    match: null,
    matchScores: [0, 0, 0, 0],
    roundWinner: null,
    matchWinner: null,
    isPaused: false,
    gameMessage: '',
  }),
}));
