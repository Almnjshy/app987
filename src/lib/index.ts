/**
 * Domino Master v5.0 — Library Exports
 */

// تصدير BoardManager (لا يوجد تضارب)
export { BoardManager } from './board';

// تصدير من tile.ts (الدوال الأساسية)
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

// تصدير من gameengine.ts (بدون ما تم تصديره من tile.ts لتجنب التضارب)
export {
  // الأنواع
  GameConfig,
  DEFAULT_CONFIG,
  Move,
  PlayerState,
  GameState as EngineGameState,
  // المحرك
  DominoGameEngine,
  // الدوال القديمة للتوافق
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
  // الذكاء الاصطناعي
  AIMove,
  DominoAI,
  // التخطيط
  LayoutConfig,
  DEFAULT_LAYOUT,
  LayoutNode,
  calculateSnakeLayout,
  toBoardPositions,
  // الاختبارات
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
