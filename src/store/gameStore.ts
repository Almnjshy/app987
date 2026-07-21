/**
 * Domino Master v5.0 — Game Store (Zustand)
 * مخزن مبسط: يحتفظ بـ UI state فقط، يستخدم DominoGameEngine للمنطق
 */

import { create } from 'zustand';
import { DominoGameEngine } from '@/lib/game-engine';
import { DominoAI } from '@/lib/ai';
import { BoardManager } from '@/lib/board';
import { calculateSnakeLayout, toBoardPositions } from '@/lib/layout';
import { orientFirstTile } from '@/lib/tile';
import type {
  ScreenType, GameMode, GameSettings, GameProgress,
  LevelConfig, PowerUp, Player, GameState,
} from '@/types/game';

// ============================================
// CONSTANTS (from original repo)
// ============================================

export const LEVELS: LevelConfig[] = [
  { level: 1, name: 'First Steps', nameAr: 'الخطوات الأولى', targetScore: 50, aiCount: 1, aiDifficulty: 'veryEasy', description: 'Learn the basics', descriptionAr: 'تعلم الأساسيات' },
  { level: 2, name: 'Apprentice', nameAr: 'المبتدئ', targetScore: 60, aiCount: 1, aiDifficulty: 'easy', description: 'Standard play', descriptionAr: 'لعب قياسي' },
  { level: 3, name: 'Rising Star', nameAr: 'النجم الصاعد', targetScore: 70, aiCount: 1, aiDifficulty: 'medium', description: 'Faster AI', descriptionAr: 'ذكاء أسرع' },
  { level: 4, name: 'Challenger', nameAr: 'المتحدي', targetScore: 80, aiCount: 2, aiDifficulty: 'medium', description: '2 AI opponents', descriptionAr: 'خصمان' },
  { level: 5, name: 'Expert', nameAr: 'الخبير', targetScore: 100, aiCount: 2, aiDifficulty: 'hard', description: 'Tough opponents', descriptionAr: 'خصوم أقوياء' },
  { level: 6, name: 'Master', nameAr: 'المعلم', targetScore: 120, aiCount: 2, aiDifficulty: 'hard', description: 'Strategic play', descriptionAr: 'لعب استراتيجي' },
  { level: 7, name: 'Grandmaster', nameAr: 'الأستاذ الكبير', targetScore: 140, aiCount: 3, aiDifficulty: 'veryHard', description: '3 AI opponents', descriptionAr: '3 خصوم' },
  { level: 8, name: 'Legend', nameAr: 'الأسطورة', targetScore: 160, aiCount: 3, aiDifficulty: 'veryHard', description: 'Elite AI', descriptionAr: 'ذكاء النخبة' },
  { level: 9, name: 'Immortal', nameAr: 'الخلود', targetScore: 180, aiCount: 3, aiDifficulty: 'expert', description: 'Near perfect', descriptionAr: 'قرب الكمال' },
  { level: 10, name: 'Champion', nameAr: 'البطل', targetScore: 200, aiCount: 3, aiDifficulty: 'champion', description: 'Ultimate challenge', descriptionAr: 'التحدي الأقصى' },
];

export const DIFFICULTY_SETTINGS: Record<string, { aiLevel: any; thinkTimeMin: number; thinkTimeMax: number }> = {
  veryEasy: { aiLevel: 'beginner', thinkTimeMin: 500, thinkTimeMax: 1500 },
  easy: { aiLevel: 'beginner', thinkTimeMin: 800, thinkTimeMax: 2000 },
  medium: { aiLevel: 'intermediate', thinkTimeMin: 1000, thinkTimeMax: 2500 },
  hard: { aiLevel: 'advanced', thinkTimeMin: 1200, thinkTimeMax: 3000 },
  veryHard: { aiLevel: 'advanced', thinkTimeMin: 1500, thinkTimeMax: 3500 },
  expert: { aiLevel: 'expert', thinkTimeMin: 1800, thinkTimeMax: 4000 },
  champion: { aiLevel: 'expert', thinkTimeMin: 2000, thinkTimeMax: 4500 },
};

export const AI_NAMES = ['كريم', 'سامي', 'عمر', 'خالد', 'طارق', 'ياسر', 'هشام', 'فادي'];

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

// ============================================
// STORE INTERFACE
// ============================================

interface GameStore {
  // UI State
  currentScreen: ScreenType;
  gameMode: GameMode;
  currentLevel: number;
  tournamentStage: number;
  settings: GameSettings;
  progress: GameProgress;
  hasSavedGame: boolean;
  isPaused: boolean;
  gameMessage: string;

  // Engine instances (NOT serialized)
  engine: DominoGameEngine | null;
  ai: DominoAI | null;

  // Computed getters
  currentScreen: ScreenType;
  players: Player[];
  match: GameState | null;
  matchScores: number[];
  matchWinner: string | null;
  roundWinner: string | null;

  // Actions
  setScreen: (screen: ScreenType) => void;
  setGameMode: (mode: GameMode) => void;
  setCurrentLevel: (level: number) => void;
  setTournamentStage: (stage: number) => void;
  updateSettings: (s: Partial<GameSettings>) => void;

  // Engine actions
  initEngine: () => void;
  playTile: (tileId: string, end: 'left' | 'right') => void;
  drawTile: () => void;
  passTurn: () => void;
  aiMove: () => Promise<void>;
  undoMove: () => void;
  resetMatch: () => void;

  // Game flow
  completeLevel: (stars: number) => void;
  addLoss: () => void;
  setIsPaused: (p: boolean) => void;
  setGameMessage: (msg: string) => void;
  goBack: () => void;

  // Power-ups
  powerUps: PowerUp[];
  usePowerUp: (type: string) => void;
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
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

  // ============================================
  // UI ACTIONS
  // ============================================

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

  // ============================================
  // ENGINE INITIALIZATION
  // ============================================

  initEngine: () => {
    const { gameMode, currentLevel, tournamentStage, settings } = get();

    let playerNames: string[];
    let targetScore: number;
    let aiDifficulty: string;

    if (gameMode === 'tournament') {
      const stages = [
        { nameAr: 'ربع النهائي', target: 60, ai: 'easy' },
        { nameAr: 'نصف النهائي', target: 100, ai: 'medium' },
        { nameAr: 'النهائي', target: 150, ai: 'hard' },
      ];
      const stage = stages[tournamentStage - 1] || stages[0];
      playerNames = ['أنت', AI_NAMES[0]];
      targetScore = stage.target;
      aiDifficulty = stage.ai;
    } else {
      const level = LEVELS[currentLevel - 1] || LEVELS[0];
      const aiCount = level.aiCount;
      playerNames = ['أنت'];
      for (let i = 0; i < aiCount; i++) {
        playerNames.push(AI_NAMES[i % AI_NAMES.length]);
      }
      targetScore = level.targetScore;
      aiDifficulty = level.aiDifficulty;
    }

    const engine = new DominoGameEngine({
      playerNames,
      targetScore,
      maxRounds: 10,
    });

    const diffSetting = DIFFICULTY_SETTINGS[aiDifficulty];
    const ai = new DominoAI(diffSetting?.aiLevel || 'intermediate');

    const state = engine.getState();

    set({
      engine,
      ai,
      match: state,
      players: [...state.players],
      matchScores: state.players.map(p => p.score),
      matchWinner: null,
      roundWinner: null,
      gameMessage: '',
    });
  },

  // ============================================
  // GAME ACTIONS (delegated to engine)
  // ============================================

  playTile: (tileId, end) => {
    const { engine, ai } = get();
    if (!engine) return;

    try {
      engine.playTile(tileId, end);
      const state = engine.getState();

      // Record for AI memory if opponent passes
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (!currentPlayer.isCurrent && ai) {
        // AI will handle its own memory
      }

      set({
        match: state,
        players: [...state.players],
        matchScores: state.players.map(p => p.score),
      });

      if (state.phase === 'round_end' || state.phase === 'game_over') {
        const winner = state.lastRoundWinner;
        if (winner) {
          set({
            roundWinner: winner.id,
            matchWinner: state.phase === 'game_over' ? winner.id : null,
            currentScreen: 'matchEnd',
          });
        }
      }
    } catch (e) {
      console.error('Play tile error:', e);
      set({ gameMessage: 'حركة غير صالحة' });
    }
  },

  drawTile: () => {
    const { engine } = get();
    if (!engine) return;

    const drawn = engine.drawTile();
    if (drawn) {
      const state = engine.getState();
      set({
        match: state,
        players: [...state.players],
        gameMessage: `سحبت [${drawn.top}|${drawn.bottom}]`,
      });
    } else {
      // Cannot draw — must pass
      engine.passTurn();
      const state = engine.getState();
      set({
        match: state,
        players: [...state.players],
        gameMessage: 'مررت دورك',
      });
    }
  },

  passTurn: () => {
    const { engine } = get();
    if (!engine) return;

    engine.passTurn();
    const state = engine.getState();
    set({
      match: state,
      players: [...state.players],
      gameMessage: 'مررت دورك',
    });
  },

  aiMove: async () => {
    const { engine, ai, settings } = get();
    if (!engine || !ai) return;

    const state = engine.getState();
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer.type !== 'ai') return;

    // Simulate thinking time
    const diff = get().currentLevel;
    const thinkTime = DIFFICULTY_SETTINGS[LEVELS[diff - 1]?.aiDifficulty || 'medium']?.thinkTimeMin || 1000;
    await new Promise(r => setTimeout(r, thinkTime));

    const move = ai.chooseMove(state, state.currentPlayerIndex);

    if (move) {
      engine.playTile(move.tile.id, move.end);
    } else if (engine.canCurrentPlayerDraw()) {
      engine.drawTile();
    } else {
      engine.passTurn();
    }

    const newState = engine.getState();
    set({
      match: newState,
      players: [...newState.players],
      matchScores: newState.players.map(p => p.score),
    });

    if (newState.phase === 'round_end' || newState.phase === 'game_over') {
      const winner = newState.lastRoundWinner;
      if (winner) {
        set({
          roundWinner: winner.id,
          matchWinner: newState.phase === 'game_over' ? winner.id : null,
          currentScreen: 'matchEnd',
        });
      }
    }
  },

  undoMove: () => {
    // TODO: Implement using moveHistory from engine
    set({ gameMessage: 'التراجع غير متاح حالياً' });
  },

  resetMatch: () => {
    const { engine } = get();
    if (engine) {
      engine.reset();
      const state = engine.getState();
      set({
        match: state,
        players: [...state.players],
        matchScores: state.players.map(p => p.score),
        matchWinner: null,
        roundWinner: null,
      });
    }
  },

  // ============================================
  // PROGRESS & POWER-UPS
  // ============================================

  completeLevel: (stars) => {
    set((state) => {
      const newProgress = { ...state.progress };
      newProgress.levelStars = { ...newProgress.levelStars, [state.currentLevel]: stars };
      newProgress.unlockedLevel = Math.max(newProgress.unlockedLevel, state.currentLevel + 1);
      newProgress.totalWins++;
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
