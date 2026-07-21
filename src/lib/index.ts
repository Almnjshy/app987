/**
 * Domino Master v5.0 — Library Exports
 */

// تصدير BoardManager
export { BoardManager } from './board';

// تصدير من tile.ts (كلها قيم)
export {
  MAX_PIPS,
  TOTAL_TILES,
  TILES_PER_PLAYER,
  createTile,
  resetCounter,
  generateDeck,
  shuffle,
  orientTile,
  orientFirstTile,
  canConnect,
  getOppositePip,
  calculateHandValue,
  findDoubles,
  findHighestDouble,
  hasPlayableTile,
  getValidEnds,
} from './tile';

// تصدير الأنواع فقط (export type) لـ isolatedModules
export type {
  GameConfig,
  Move,
  PlayerState,
  AIMove,
  LayoutConfig,
  LayoutNode,
} from './gameengine';

// تصدير الأنواع مع أسماء مستعارة
export type { GameState as EngineGameState } from './gameengine';

// تصدير القيم من gameengine.ts (دوال، classes، constants)
export {
  DominoGameEngine,
  createRound,
  getValidSides,
  canPlayTile,
  legalMoves,
  canDraw,
  canPass,
  applyMove,
  applyDraw,
  applyPass,
  roundStatus,
  DominoAI,
  DEFAULT_LAYOUT,
  calculateSnakeLayout,
  toBoardPositions,
  runAllTests,
} from './gameengine';

// تصدير الشبكة (net.ts و netSession.ts — كلها قيم)
export * from './net';
export * from './netSession';
