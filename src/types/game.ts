/**
 * Domino Master v5.0 — Merged Types
 * صارم + كامل — يخدم المحرك والواجهة
 */

// ============================================
// CORE PIP & TILE TYPES (from local — strict)
// ============================================
export type Pip = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DominoTile {
  readonly id: string;
  readonly top: Pip;
  readonly bottom: Pip;
  readonly isDouble: boolean;
  readonly value: number;
}

export interface OrientedTile extends DominoTile {
  readonly orientation: 'normal' | 'flipped';
  readonly leadingPip: Pip;
  readonly trailingPip: Pip;
}

export type BoardEnd = 'left' | 'right';

// ============================================
// BOARD STATE (from local — strict)
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
// PLAYER & GAME STATE (merged)
// ============================================
export type PlayerType = 'human' | 'ai';
export type AIDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type GamePhase = 'setup' | 'playing' | 'blocked' | 'round_end' | 'game_over';

export interface Player {
  readonly id: string;
  readonly name: string;
  readonly type: PlayerType;
  readonly hand: readonly DominoTile[];
  readonly score: number;
  readonly handValue: number;
  readonly isCurrent: boolean;
}

export interface Move {
  readonly tile: DominoTile;
  readonly end: BoardEnd;
  readonly orientedTile: OrientedTile;
  readonly isPass: boolean;
  readonly isDraw: boolean;
}

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
// LAYOUT TYPES (from local)
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
// AI TYPES (from local)
// ============================================
export interface AIMove {
  readonly tile: DominoTile;
  readonly end: BoardEnd;
  readonly score: number;
}

// ============================================
// UI / STORE TYPES (from repo — preserved)
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

// ============================================
// NETWORK TYPES (from repo — preserved)
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
  chain: any[];
  currentPlayer: number;
  youIndex: number;
  matchWinnerIndex: number | null;
  players: NetPlayerView[];
  message: string | null;
  boneyardCount: number;
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
// ERROR TYPES (from local)
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
