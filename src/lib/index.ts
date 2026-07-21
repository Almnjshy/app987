/**
 * Domino Master v5.0 — Library Exports
 */

// تصدير BoardManager
export { BoardManager } from './board';

// تصدير من tile.ts
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
  DEFAULT_CONFIG,
  Move,
  PlayerState,
} from './gameengine';

// تصدير الأنواع مع أسماء مستعارة
export type { GameState as EngineGameState } from './gameengine';

// تصدير المحرك والدوال
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
  AIMove,
  DominoAI,
  LayoutConfig,
  DEFAULT_LAYOUT,
  LayoutNode,
  calculateSnakeLayout,
  toBoardPositions,
  runAllTests,
} from './gameengine';

// تصدير الشبكة
export * from './net';
export * from './netSession';

// تصدير التخطيط
export * from './layout';

// تصدير الذكاء الاصطناعي
export * from './ai';

// تصدير الاختبارات
export * from './tests';
