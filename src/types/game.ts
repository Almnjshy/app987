/**
 * Domino Master v5.0 — Core Types (merged)
 */

// ============================================
// CORE PIP & TILE TYPES
// ============================================
export type Pip = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DominoTile {
  readonly id: string;
  readonly top: Pip;
  readonly bottom: Pip;
  readonly isDouble: boolean;
  readonly value: number;
}

/** Alias for backward compatibility */
export type Tile = DominoTile;

export interface OrientedTile extends DominoTile {
  readonly orientation: 'normal' | 'flipped';
  readonly leadingPip: Pip;
  readonly trailingPip: Pip;
}

export type BoardEnd = 'left' | 'right';
/** Alias for backward compatibility */
export type EndSide = BoardEnd;

// ============================================
// BOARD STATE
// ============================================
export interface BoardState {
  readonly tiles: readonly OrientedTile[];
  readonly leftPip: Pip | null;
  readonly rightPip: Pip | null;
  readonly length: number;
  readonly isEmpty: boolean;
  readonly hash: string;
}

// ============================================
// CHAIN TILE (from original repo)
// ============================================
export interface ChainTile {
  readonly tile: DominoTile;
  readonly left: Pip;
  readonly right: Pip;
  readonly orientation: 'normal' | 'flipped';
  readonly side?: 'left' | 'right';
}

// ============================================
// PLAYER & GAME STATE
// ============================================
export type PlayerType = 'human' | 'ai';

export interface Player {
  readonly id: string;
  readonly name: string;
  readonly type: PlayerType;
  readonly hand: readonly DominoTile[];
  readonly score: number;
  readonly handValue: number;
  readonly isCurrent: boolean;
  // إضافات للتوافق مع PlayerView والمكونات
  readonly avatar?: string;
  readonly isHuman?: boolean;
  readonly tiles?: readonly DominoTile[];
  readonly tileCount?: number;
  readonly isActive?: boolean;
}

/** Player view for UI (from original repo) */
export interface PlayerView {
  readonly id: string;
  readonly name: string;
  readonly avatar: string;
  readonly isHuman: boolean;
  readonly tiles: readonly DominoTile[];
  readonly score: number;
  readonly isActive: boolean;
  readonly tileCount: number;
}

export interface Move {
  readonly tile: DominoTile;
  readonly end: BoardEnd;
  readonly orientedTile: OrientedTile;
  readonly isPass: boolean;
  readonly isDraw: boolean;
}

export type GamePhase = 'setup' | 'playing' | 'blocked' | 'round_end' | 'game_over';

export interface GameState {
  readonly board: BoardState;
  readonly players: readonly Player[];
  readonly currentPlayerIndex: number;
  readonly boneyard: readonly DominoTile[];
  readonly phase: GamePhase;
  readonly round: number;
  readonly moveHistory: readonly Move[];
  readonly consecutivePasses: number;
  readonly winner: Player | null;
  readonly lastRoundWinner: Player | null;
  readonly scores: ReadonlyMap<string, number>;
}

export interface GameConfig {
  readonly playerNames: readonly string[];
  readonly targetScore: number;
  readonly maxRounds: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  playerNames: ['Player 1', 'Player 2'],
  targetScore: 100,
  maxRounds: 10,
};

// ============================================
// MATCH STATE (from original repo)
// ============================================
export interface MatchState {
  readonly hands: readonly (readonly DominoTile[])[];
  readonly chain: readonly ChainTile[];
  readonly boneyard: readonly DominoTile[];
  readonly currentPlayer: number;
  readonly playerCount: number;
  readonly variant: 'draw' | 'block';
  readonly scores: readonly number[];
}

// ============================================
// LAYOUT TYPES
// ============================================
export interface BoardPosition {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly tile: OrientedTile;
  readonly index: number;
  readonly width: number;
  readonly height: number;
}

export interface LayoutConfig {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly gap: number;
  readonly maxRowLength: number;
}

export const DEFAULT_LAYOUT: LayoutConfig = {
  viewportWidth: 800,
  viewportHeight: 600,
  tileWidth: 60,
  tileHeight: 30,
  gap: 5,
  maxRowLength: 8,
};

// ============================================
// AI TYPES
// ============================================
export type AIDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface AIMove {
  readonly tile: DominoTile;
  readonly end: BoardEnd;
  readonly score: number;
}

// ============================================
// UI / STORE TYPES (from original repo)
// ============================================
export type ScreenType =
  | 'title'
  | 'menu'
  | 'levelSelect'
  | 'playing'
  | 'paused'
  | 'matchEnd'
  | 'settings'
  | 'statistics'
  | 'tutorial'
  | 'networkLobby'
  | 'networkGame';

export type Difficulty = 'veryEasy' | 'easy' | 'medium' | 'hard' | 'veryHard' | 'expert' | 'champion';
export type AILevel = 'easy' | 'medium' | 'hard';

export interface LevelConfig {
  level: number;
  name: string;
  nameAr: string;
  targetScore: number;
  aiCount: number;
  aiDifficulty: Difficulty;
  description: string;
  descriptionAr: string;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  language: 'ar' | 'en';
}

export interface GameProgress {
  unlockedLevel: number;
  levelStars: Record<number, number>;
  totalScore: number;
  totalWins: number;
  totalLosses: number;
  longestChain: number;
  highestScore: number;
}

export type PowerUpType = 'peek' | 'undo' | 'extraTime' | 'hint';

export interface PowerUp {
  type: PowerUpType;
  name: string;
  nameAr: string;
  icon: string;
  uses: number;
  maxUses: number;
}

export type GameMode = 'ai' | 'network' | 'tournament' | 'online';

export interface SavedGame {
  match: MatchState;
  matchScores: number[];
  playerNames: string[];
  playerAvatars: string[];
  level: number;
  mode: GameMode;
  targetScore: number;
}

// ============================================
// NETWORK TYPES (from original repo)
// ============================================
export interface NetPlayerView {
  name: string;
  isYou: boolean;
  isActive: boolean;
  tileCount: number;
  score: number;
  connected: boolean;
}

export interface NetSnapshot {
  chain: ChainTile[];
  currentPlayer: number;
  youIndex: number;
  matchWinnerIndex: number | null;
  players: NetPlayerView[];
  message: string | null;
  boneyardCount: number;
  targetScore: number;
  yourHand: DominoTile[];
}

export type ClientAction =
  | { type: 'join'; name: string }
  | { type: 'play'; tileId: string; side: BoardEnd }
  | { type: 'draw' }
  | { type: 'pass' }
  | { type: 'chat'; text: string }
  | { type: 'leave' };

export type HostMessage =
  | { type: 'lobby'; players: { name: string; isHost: boolean }[] }
  | { type: 'snapshot'; snap: NetSnapshot }
  | { type: 'chat'; from: string; text: string }
  | { type: 'error'; message: string }
  | { type: 'closed' };

// ============================================
// ERROR TYPES
// ============================================
export class DominoError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DominoError';
  }
}

export class InvalidMoveError extends DominoError {
  constructor(reason: string) {
    super(`Invalid move: ${reason}`, 'INVALID_MOVE');
  }
}

export class GameStateError extends DominoError {
  constructor(reason: string) {
    super(`Game state error: ${reason}`, 'GAME_STATE');
  }
}

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

export const DIFFICULTY_SETTINGS: Record<string, { aiLevel: AILevel; thinkTimeMin: number; thinkTimeMax: number }> = {
  veryEasy: { aiLevel: 'easy', thinkTimeMin: 500, thinkTimeMax: 1500 },
  easy: { aiLevel: 'easy', thinkTimeMin: 800, thinkTimeMax: 2000 },
  medium: { aiLevel: 'medium', thinkTimeMin: 1000, thinkTimeMax: 2500 },
  hard: { aiLevel: 'hard', thinkTimeMin: 1200, thinkTimeMax: 3000 },
  veryHard: { aiLevel: 'hard', thinkTimeMin: 1500, thinkTimeMax: 3500 },
  expert: { aiLevel: 'hard', thinkTimeMin: 2000, thinkTimeMax: 4000 },
  champion: { aiLevel: 'hard', thinkTimeMin: 2500, thinkTimeMax: 5000 },
};

export const AI_NAMES = ['آدم', 'بلال', 'سامي', 'وائل', 'زياد', 'رامي', 'هشام', 'فادي'];
