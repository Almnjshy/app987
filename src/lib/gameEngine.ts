/**
 * محرك الدومينو الاحترافي — مستقل تماماً عن الواجهة.
 * يحتوي على جميع قواعد اللعبة ويعمل مع جميع الأوضاع (Block / Draw)
 * وجميع أعداد اللاعبين (2 / 3 / 4) دون أي منطق خاص بكل حالة.
 */

import type { Tile, ChainTile, MatchState, Move, EndSide, RoundResult, AILevel } from '@/types/game';

let tileIdCounter = 0;

/* ------------------------------------------------------------------ */
/* إنشاء القطع والتوزيع                                               */
/* ------------------------------------------------------------------ */

export function generateAllTiles(): Tile[] {
  tileIdCounter = 0;
  const tiles: Tile[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push({
        id: `tile-${tileIdCounter++}`,
        top: i,
        bottom: j,
        isDouble: i === j,
        total: i + j,
      });
    }
  }
  return tiles;
}

export function shuffleTiles(tiles: Tile[]): Tile[] {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function tilesPerPlayer(playerCount: number): number {
  if (playerCount < 2 || playerCount > 4) throw new Error('playerCount must be 2..4');
  return 7;
}

export function dealTiles(playerCount: number): { hands: Tile[][]; boneyard: Tile[] } {
  const shuffled = shuffleTiles(generateAllTiles());
  const per = tilesPerPlayer(playerCount);
  const hands: Tile[][] = [];
  let idx = 0;
  for (let p = 0; p < playerCount; p++) {
    hands.push(shuffled.slice(idx, idx + per));
    idx += per;
  }
  return { hands, boneyard: shuffled.slice(idx) };
}

/* ------------------------------------------------------------------ */
/* إنشاء الجولة                                                       */
/* ------------------------------------------------------------------ */

export function determineFirstPlayer(hands: Tile[][]): number {
  let bestDouble = -1;
  let bestPlayer = -1;
  for (let i = 0; i < hands.length; i++) {
    for (const t of hands[i]) {
      if (t.isDouble && t.top > bestDouble) {
        bestDouble = t.top;
        bestPlayer = i;
      }
    }
  }
  if (bestPlayer >= 0) return bestPlayer;

  let bestScore = -1;
  for (let i = 0; i < hands.length; i++) {
    for (const t of hands[i]) {
      const score = t.total * 10 + Math.max(t.top, t.bottom);
      if (score > bestScore) {
        bestScore = score;
        bestPlayer = i;
      }
    }
  }
  return Math.max(0, bestPlayer);
}

export function createRound(playerCount: number, variant: 'block' | 'draw'): MatchState {
  if (playerCount < 2 || playerCount > 4) throw new Error('playerCount must be 2..4');
  const { hands, boneyard } = dealTiles(playerCount);
  const currentPlayer = determineFirstPlayer(hands);
  return {
    playerCount,
    variant,
    hands,
    chain: [],
    boneyard,
    currentPlayer,
    consecutivePasses: 0,
  };
}

/* ------------------------------------------------------------------ */
/* قواعد الحركة                                                       */
/* ------------------------------------------------------------------ */

export function getEnds(chain: ChainTile[]): { left: number; right: number } | null {
  if (chain.length === 0) return null;
  return { left: chain[0].left, right: chain[chain.length - 1].right };
}

export function canPlayTile(tile: Tile, chain: ChainTile[]): boolean {
  const ends = getEnds(chain);
  if (!ends) return true;
  return (
    tile.top === ends.left || tile.bottom === ends.left ||
    tile.top === ends.right || tile.bottom === ends.right
  );
}

export function getValidSides(tile: Tile, chain: ChainTile[]): EndSide[] {
  if (chain.length === 0) return ['right'];
  const ends = getEnds(chain)!;
  const sides: EndSide[] = [];
  if (tile.top === ends.left || tile.bottom === ends.left) sides.push('left');
  if (tile.top === ends.right || tile.bottom === ends.right) sides.push('right');
  return sides;
}

export function getPlayableTiles(hand: Tile[], chain: ChainTile[]): Tile[] {
  return hand.filter((t) => canPlayTile(t, chain));
}

export function legalMoves(hand: Tile[], chain: ChainTile[]): Move[] {
  const moves: Move[] = [];
  for (const tile of hand) {
    for (const side of getValidSides(tile, chain)) {
      moves.push({ tileId: tile.id, side });
    }
  }
  return moves;
}

export function isLegalMove(state: MatchState, playerIndex: number, move: Move): boolean {
  if (playerIndex !== state.currentPlayer) return false;
  const hand = state.hands[playerIndex];
  const tile = hand.find((t) => t.id === move.tileId);
  if (!tile) return false;
  return getValidSides(tile, state.chain).includes(move.side);
}

export function applyMove(state: MatchState, playerIndex: number, move: Move): MatchState {
  if (!isLegalMove(state, playerIndex, move)) {
    throw new Error('Illegal move rejected by engine');
  }
  const hand = state.hands[playerIndex];
  const tile = hand.find((t) => t.id === move.tileId)!;
  const newHand = hand.filter((t) => t.id !== tile.id);

  let chainTile: ChainTile;
  let chain: ChainTile[];

  if (state.chain.length === 0) {
    chainTile = { tile, left: tile.top, right: tile.bottom, side: null };
    chain = [chainTile];
  } else if (move.side === 'left') {
    const end = state.chain[0].left;
    chainTile = tile.top === end
      ? { tile, left: tile.bottom, right: tile.top, side: 'left' }
      : { tile, left: tile.top, right: tile.bottom, side: 'left' };
    chain = [chainTile, ...state.chain];
  } else {
    const end = state.chain[state.chain.length - 1].right;
    chainTile = tile.top === end
      ? { tile, left: tile.top, right: tile.bottom, side: 'right' }
      : { tile, left: tile.bottom, right: tile.top, side: 'right' };
    chain = [...state.chain, chainTile];
  }

  const hands = state.hands.map((h, i) => (i === playerIndex ? newHand : h));
  return {
    ...state,
    hands,
    chain,
    consecutivePasses: 0,
    currentPlayer: (playerIndex + 1) % state.playerCount,
  };
}

export function canDraw(state: MatchState, playerIndex: number): boolean {
  if (state.variant !== 'draw') return false;
  if (state.boneyard.length === 0) return false;
  if (playerIndex !== state.currentPlayer) return false;
  return legalMoves(state.hands[playerIndex], state.chain).length === 0;
}

export function applyDraw(state: MatchState, playerIndex: number): { state: MatchState; drawn: Tile[] } {
  if (!canDraw(state, playerIndex)) {
    throw new Error('Draw not allowed: player has a legal move or boneyard empty');
  }
  const hand = [...state.hands[playerIndex]];
  let boneyard = [...state.boneyard];
  const drawn: Tile[] = [];

  while (boneyard.length > 0) {
    const tile = boneyard[0];
    boneyard = boneyard.slice(1);
    hand.push(tile);
    drawn.push(tile);
    if (canPlayTile(tile, state.chain)) break;
  }

  const hands = state.hands.map((h, i) => (i === playerIndex ? hand : h));
  const mustPass = legalMoves(hand, state.chain).length === 0;
  return {
    state: {
      ...state,
      hands,
      boneyard,
      consecutivePasses: mustPass ? state.consecutivePasses + 1 : 0,
      currentPlayer: mustPass ? (playerIndex + 1) % state.playerCount : playerIndex,
    },
    drawn,
  };
}

export function canPass(state: MatchState, playerIndex: number): boolean {
  if (playerIndex !== state.currentPlayer) return false;
  if (legalMoves(state.hands[playerIndex], state.chain).length > 0) return false;
  return state.variant === 'block' || state.boneyard.length === 0;
}

export function applyPass(state: MatchState, playerIndex: number): MatchState {
  if (!canPass(state, playerIndex)) {
    throw new Error('Pass not allowed');
  }
  return {
    ...state,
    consecutivePasses: state.consecutivePasses + 1,
    currentPlayer: (playerIndex + 1) % state.playerCount,
  };
}

/* ------------------------------------------------------------------ */
/* نهاية الجولة والنقاط                                               */
/* ------------------------------------------------------------------ */

export function handValue(hand: Tile[]): number {
  return hand.reduce((sum, t) => sum + t.total, 0);
}

export function isBlocked(state: MatchState): boolean {
  if (state.chain.length === 0) return false;
  if (state.variant === 'draw' && state.boneyard.length > 0) return false;
  for (const hand of state.hands) {
    if (legalMoves(hand, state.chain).length > 0) return false;
  }
  return true;
}

export function roundStatus(state: MatchState): { type: 'ongoing' } | ({ type: 'ended' } & RoundResult) {
  for (let i = 0; i < state.hands.length; i++) {
    if (state.hands[i].length === 0) {
      let points = 0;
      for (let j = 0; j < state.hands.length; j++) {
        if (j !== i) points += handValue(state.hands[j]);
      }
      return { type: 'ended', reason: 'domino', winnerIndex: i, points };
    }
  }

  if (isBlocked(state)) {
    let winner = 0;
    let lowest = Infinity;
    for (let i = 0; i < state.hands.length; i++) {
      const v = handValue(state.hands[i]);
      if (v < lowest) {
        lowest = v;
        winner = i;
      }
    }
    let points = 0;
    for (let j = 0; j < state.hands.length; j++) {
      if (j !== winner) points += handValue(state.hands[j]);
    }
    points -= handValue(state.hands[winner]);
    return { type: 'ended', reason: 'blocked', winnerIndex: winner, points: Math.max(0, points) };
  }

  return { type: 'ongoing' };
}

/* ------------------------------------------------------------------ */
/* الذكاء الاصطناعي الاستراتيجي (Strategic AI)                         */
/* ------------------------------------------------------------------ */

function countSuits(state: MatchState, playerIndex: number): number[] {
  const counts = new Array(7).fill(8); // كل رقم يظهر 8 مرات في المجموعة
  for (const ct of state.chain) {
    counts[ct.tile.top]--;
    counts[ct.tile.bottom]--;
  }
  for (const t of state.hands[playerIndex]) {
    counts[t.top]--;
    counts[t.bottom]--;
  }
  return counts;
}

function suitExhausted(counts: number[], n: number): boolean {
  return counts[n] <= 0;
}

function evaluateMove(
  state: MatchState,
  playerIndex: number,
  move: Move,
  level: AILevel
): number {
  const tile = state.hands[playerIndex].find((t) => t.id === move.tileId)!;
  let score = 0;

  // 1. التخلص من الأحجار عالية النقاط (Defensive)
  score += tile.total * 3;

  // 2. التخلص من المزدوجات مبكراً لتقليل الخسارة
  if (tile.isDouble) score += 10;

  const ends = getEnds(state.chain);
  const counts = countSuits(state, playerIndex);
  const remaining = state.hands[playerIndex].filter((t) => t.id !== tile.id);

  let exposedLeft: number;
  let exposedRight: number;

  if (state.chain.length === 0) {
    exposedLeft = tile.top;
    exposedRight = tile.bottom;
  } else if (move.side === 'left') {
    exposedLeft = tile.top === ends!.left ? tile.bottom : tile.top;
    exposedRight = ends!.right;
  } else {
    exposedLeft = ends!.left;
    exposedRight = tile.top === ends!.right ? tile.bottom : tile.top;
  }

  // 3. الاستراتيجية الهجومية (Synergy): الاحتفاظ بأرقام نملك منها قطعاً أخرى
  const synergyLeft = remaining.filter((t) => t.top === exposedLeft || t.bottom === exposedLeft).length;
  const synergyRight = remaining.filter((t) => t.top === exposedRight || t.bottom === exposedRight).length;
  score += (synergyLeft + synergyRight) * 5;

  // 4. استراتيجية الإغلاق (Blocking) - قلب الذكاء الاصطناعي
  // إذا نفد رقم معين من اللعبة، وجعلناه طرفاً، فإن الخصم لن يستطيع اللعب عليه أبداً!
  if (suitExhausted(counts, exposedLeft)) score += 30;
  if (suitExhausted(counts, exposedRight)) score += 30;

  // 5. التضييق على الخصم (Opponent Limitation)
  // حساب عدد القطع غير المعروفة (في يد الخصم أو الكومة) التي يمكنها اللعب على الأطراف الجديدة
  let opponentCanPlay = 0;
  if (!suitExhausted(counts, exposedLeft)) opponentCanPlay += counts[exposedLeft];
  if (exposedRight !== exposedLeft && !suitExhausted(counts, exposedRight)) opponentCanPlay += counts[exposedRight];
  
  // كلما قلت خيارات الخصم، زادت نقاط الحركة
  score -= opponentCanPlay * 4;

  // 6. جعل الطرفين متطابقين (تضييق الخناق)
  if (exposedLeft === exposedRight && state.chain.length > 0) score += 20;

  return score + Math.random() * 0.5;
}

export function chooseAIAction(
  state: MatchState,
  playerIndex: number,
  level: AILevel
): { kind: 'move'; move: Move } | { kind: 'draw' } | { kind: 'pass' } {
  const hand = state.hands[playerIndex];
  const moves = legalMoves(hand, state.chain);

  if (moves.length === 0) {
    if (canDraw(state, playerIndex)) return { kind: 'draw' };
    return { kind: 'pass' };
  }

  if (level === 'easy') {
    return { kind: 'move', move: moves[Math.floor(Math.random() * moves.length)] };
  }

  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const s = evaluateMove(state, playerIndex, move, level);
    if (s > bestScore) {
      bestScore = s;
      best = move;
    }
  }
  return { kind: 'move', move: best };
}

/* ------------------------------------------------------------------ */
/* أدوات مساعدة                                                       */
/* ------------------------------------------------------------------ */

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function findTileById(tiles: Tile[], id: string): Tile | undefined {
  return tiles.find((t) => t.id === id);
}