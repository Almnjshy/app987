/**
 * Domino Master v5.0 — Tile Operations
 * عمليات القطع المصححة رياضياً
 */

import { Pip, DominoTile, OrientedTile } from '../types/game';

export const MAX_PIPS = 6;
export const TOTAL_TILES = 28;
export const TILES_PER_PLAYER = 7;

let tileCounter = 0;

export function createTile(top: Pip, bottom: Pip): DominoTile {
  if (top < 0 || top > MAX_PIPS || bottom < 0 || bottom > MAX_PIPS) {
    throw new Error(`Invalid pip values: ${top}, ${bottom}`);
  }
  const [a, b] = top <= bottom ? [top, bottom] : [bottom, top];
  const id = `tile-${++tileCounter}-${a}-${b}`;
  return Object.freeze({ top: a, bottom: b, id, isDouble: a === b, value: a + b });
}

export function resetCounter(): void { tileCounter = 0; }

export function generateDeck(): readonly DominoTile[] {
  const tiles: DominoTile[] = [];
  for (let i = 0; i <= MAX_PIPS; i++) {
    for (let j = i; j <= MAX_PIPS; j++) {
      tiles.push(createTile(i as Pip, j as Pip));
    }
  }
  return Object.freeze(tiles);
}

export function shuffle(tiles: readonly DominoTile[]): readonly DominoTile[] {
  const arr = [...tiles];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return Object.freeze(arr);
}

// ============================================
// ORIENTATION — CORE FIX
// ============================================

/**
 * تدوير القطعة لتناسب طرف معين
 * leadingPip = القيمة المطابقة (داخلية)
 * trailingPip = القيمة الجديدة (خارجية — طرف مفتوح)
 */
export function orientTile(tile: DominoTile, targetPip: Pip): OrientedTile | null {
  if (tile.top === targetPip) {
    return Object.freeze({
      ...tile,
      orientation: 'normal' as const,
      leadingPip: tile.top,
      trailingPip: tile.bottom,
    });
  }
  if (tile.bottom === targetPip) {
    return Object.freeze({
      ...tile,
      orientation: 'flipped' as const,
      leadingPip: tile.bottom,
      trailingPip: tile.top,
    });
  }
  return null;
}

/** أول قطعة على اللوحة الفارغة */
export function orientFirstTile(tile: DominoTile): OrientedTile {
  return Object.freeze({
    ...tile,
    orientation: 'normal' as const,
    leadingPip: tile.top,
    trailingPip: tile.bottom,
  });
}

// ============================================
// CONNECTION LOGIC
// ============================================

export function canConnect(tile: DominoTile, pip: Pip): boolean {
  return tile.top === pip || tile.bottom === pip;
}

export function getOppositePip(tile: DominoTile, pip: Pip): Pip | null {
  if (tile.top === pip) return tile.bottom;
  if (tile.bottom === pip) return tile.top;
  return null;
}

// ============================================
// HAND OPERATIONS
// ============================================

export function calculateHandValue(hand: readonly DominoTile[]): number {
  return hand.reduce((sum, t) => sum + t.value, 0);
}

export function findDoubles(hand: readonly DominoTile[]): readonly DominoTile[] {
  return Object.freeze(hand.filter(t => t.isDouble));
}

export function findHighestDouble(hand: readonly DominoTile[]): DominoTile | null {
  const doubles = findDoubles(hand);
  if (doubles.length === 0) return null;
  return doubles.reduce((max, t) => (t.top > max.top ? t : max));
}

/** هل يوجد قطعة قابلة للعب على الأطراف المفتوحة؟ */
export function hasPlayableTile(
  hand: readonly DominoTile[],
  leftPip: Pip | null,
  rightPip: Pip | null
): boolean {
  if (leftPip === null && rightPip === null) return hand.length > 0;
  for (const tile of hand) {
    if (leftPip !== null && canConnect(tile, leftPip)) return true;
    if (rightPip !== null && canConnect(tile, rightPip)) return true;
  }
  return false;
}

/** الأطراف الصالحة لقطعة معينة */
export function getValidEnds(
  tile: DominoTile,
  leftPip: Pip | null,
  rightPip: Pip | null
): ('left' | 'right')[] {
  const ends: ('left' | 'right')[] = [];
  if (leftPip === null && rightPip === null) return ['left', 'right'];
  if (leftPip !== null && canConnect(tile, leftPip)) ends.push('left');
  if (rightPip !== null && canConnect(tile, rightPip)) {
    if (leftPip !== rightPip || ends.length === 0) ends.push('right');
  }
  return ends;
}
