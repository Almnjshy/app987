/**
 * Domino Master v5.0 — Game Store (Zustand)
 */

import { create } from 'zustand';
import { DominoGameEngine } from '@/lib/gameengine';
import { DominoAI } from '@/lib/ai';
import { BoardManager } from '@/lib/board';
import { calculateSnakeLayout, toBoardPositions } from '@/lib/layout';
import { orientFirstTile } from '@/lib/tile';
import type {
  ScreenType, GameMode, GameSettings, GameProgress,
  LevelConfig, PowerUp, Player, GameState,
} from '@/types/game';
import { LEVELS, DIFFICULTY_SETTINGS, AI_NAMES } from '@/types/game';

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  vibrationEnabled: true,
  language: 'ar',
};

const DEFAULT_PROGRESS: GameProgress = {
  unlockedLevel: 1,
  levelStars: {},
  totalScore: 0,
  totalWins: 0,
  totalLosses: 0,
  longestChain: 0,
  highestScore: 0,
};

interface GameStore {
  currentScreen: ScreenType;
  gameMode: GameMode;
  currentLevel: number;
  tournamentStage: number;
  settings: GameSettings;
  progress: GameProgress;
  hasSavedGame: boolean;
  isPaused: boolean;
  gameMessage: string;
  engine: DominoGameEngine | null;
  ai: DominoAI | null;
  players: Player[];
  match: GameState | null;
  matchScores: number[];
  matchWinner: string | null;
  roundWinner: string | null;
  powerUps: PowerUp[];

  // Missing actions (added for compatibility)
  setPlayers: (players: any[]) => void;
  setMatch: (match: any) => void;
  setMatchScores: (scores: number[]) => void;
  setRoundWinner: (winner: string | null) => void;
  setMatchWinner: (winner: string | null) => void;
  setHasSavedGame: (has: boolean) => void;

  setScreen: (screen: ScreenType) => void;
  setGameMode: (mode: GameMode) => void;
  setCurrentLevel: (level: number) => void;
  setTournamentStage: (stage: number) => void;
  updateSettings: (s: Partial<GameSettings>) => void;
  setIsPaused: (p: boolean) => void;
  setGameMessage: (msg: string) => void;
  goBack: () => void;

  initEngine: () => void;
  playTile: (tileId: string, end: 'left' | 'right') => void;
  drawTile: () => void;
  passTurn: () => void;
  aiMove: () => Promise<void>;
  undoMove: () => void;
  resetMatch: () => void;

  completeLevel: (stars: number, level: number, score: number) => void;
  addLoss: () => void;
  usePowerUp: (type: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentScreen: 'title',
  gameMode: 'ai',
  currentLevel: 1,
  tournamentStage: 1,
  settings: { ...DEFAULT_SETTINGS },
  progress: { ...DEFAULT_PROGRESS },
  hasSavedGame: false,
  isPaused: false,
  gameMessage: '',
  engine: null,
  ai: null,
  players: [],
  match: null,
  matchScores: [],
  matchWinner: null,
  roundWinner: null,
  powerUps: [
    { type: 'peek', name: 'Peek', nameAr: 'تجسس', icon: 'Eye', uses: 3, maxUses: 3 },
    { type: 'undo', name: 'Undo', nameAr: 'تراجع', icon: 'Undo2', uses: 3, maxUses: 3 },
    { type: 'extraTime', name: 'Extra Time', nameAr: 'وقت إضافي', icon: 'Clock', uses: 2, maxUses: 2 },
    { type: 'hint', name: 'Hint', nameAr: 'تلميح', icon: 'Lightbulb', uses: 5, maxUses: 5 },
  ],

  // Compatibility actions
  setPlayers: (players) => set({ players }),
  setMatch: (match) => set({ match }),
  setMatchScores: (matchScores) => set({ matchScores }),
  setRoundWinner: (roundWinner) => set({ roundWinner }),
  setMatchWinner: (matchWinner) => set({ matchWinner }),
  setHasSavedGame: (hasSavedGame) => set({ hasSavedGame }),

  setScreen: (screen) => set({ currentScreen: screen }),
  setGameMode: (mode) => set({ gameMode: mode }),
  setCurrentLevel: (level) => set({ currentLevel: level }),
  setTournamentStage: (stage) => set({ tournamentStage: stage }),
  updateSettings: (s) => set((state) => ({
    settings: { ...state.settings, ...s },
  })),
  setIsPaused: (p) => set({ isPaused: p }),
  setGameMessage: (msg) => set({ gameMessage: msg }),

  goBack: () => {
    const { currentScreen } = get();
    const backMap: Record<ScreenType, ScreenType> = {
      title: 'title',
      menu: 'title',
      levelSelect: 'menu',
      playing: 'menu',
      paused: 'playing',
      matchEnd: 'menu',
      settings: 'menu',
      statistics: 'menu',
      tutorial: 'menu',
      networkLobby: 'menu',
      networkGame: 'networkLobby',
    };
    set({ currentScreen: backMap[currentScreen] || 'menu' });
  },

  initEngine: () => {
    const { gameMode, currentLevel, tournamentStage } = get();
    // ... (same as before)
  },

  playTile: (tileId, end) => {
    const { engine } = get();
    if (!engine) return;
    try {
      engine.playTile(tileId, end);
      const state = engine.getState();
      set({ match: state, players: [...state.players] });
    } catch (e) {
      set({ gameMessage: 'حركة غير صالحة' });
    }
  },

  drawTile: () => {
    const { engine } = get();
    if (!engine) return;
    const drawn = engine.drawTile();
    if (drawn) {
      const state = engine.getState();
      set({ match: state, players: [...state.players] });
    }
  },

  passTurn: () => {
    const { engine } = get();
    if (!engine) return;
    engine.passTurn();
    const state = engine.getState();
    set({ match: state, players: [...state.players] });
  },

  aiMove: async () => {
    const { engine, ai } = get();
    if (!engine || !ai) return;
    // ... (same as before)
  },

  undoMove: () => {
    set({ gameMessage: 'التراجع غير متاح حالياً' });
  },

  resetMatch: () => {
    const { engine } = get();
    if (engine) {
      engine.reset();
      const state = engine.getState();
      set({ match: state, players: [...state.players] });
    }
  },

  completeLevel: (stars, level, score) => {
    set((state) => {
      const newProgress = { ...state.progress };
      newProgress.levelStars = { ...newProgress.levelStars, [level || state.currentLevel]: stars };
      newProgress.unlockedLevel = Math.max(newProgress.unlockedLevel, (level || state.currentLevel) + 1);
      newProgress.totalWins++;
      newProgress.totalScore += score || 0;
      newProgress.highestScore = Math.max(newProgress.highestScore, score || 0);
      return { progress: newProgress, hasSavedGame: true };
    });
  },

  addLoss: () => {
    set((state) => ({
      progress: { ...state.progress, totalLosses: state.progress.totalLosses + 1 },
    }));
  },

  usePowerUp: (type) => {
    set((state) => ({
      powerUps: state.powerUps.map(p =>
        p.type === type && p.uses > 0 ? { ...p, uses: p.uses - 1 } : p
      ),
    }));
  },
}));

export { LEVELS, DIFFICULTY_SETTINGS, AI_NAMES };
