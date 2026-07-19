import type { Tile, ChainTile, MatchState, Move, EndSide, RoundResult, AILevel } from '@/types/game';

let tileIdCounter = 0;

/* ------------------------------------------------------------------ /
/ إنشاء القطع والتوزيع                                               /
/ ------------------------------------------------------------------ */

/** إنشاء مجموعة الدومينو الكاملة (28 قطعة) بشكل صحيح. */
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

/* ------------------------------------------------------------------ /
/ إنشاء الجولة والتحقق من البداية                                      /
/ ------------------------------------------------------------------ */

/** تحديد اللاعب البادئ والقطعة التي يجب أن يلعبها مجبراً في أول حركة. */
export function determineFirstPlayer(hands: Tile[][]): { playerIndex: number; requiredTileId: string } {
  let bestDouble = -1;
  let bestDoublePlayer = -1;
  let bestDoubleTileId = '';

  for (let i = 0; i < hands.length; i++) {
    for (const t of hands[i]) {
      if (t.isDouble && t.top > bestDouble) {
        bestDouble = t.top;
        bestDoublePlayer = i;
        bestDoubleTileId = t.id;
      }
    }
  }
  if (bestDoublePlayer >= 0) {
    return { playerIndex: bestDoublePlayer, requiredTileId: bestDoubleTileId };
  }

  let bestScore = -1;
  let bestPlayer = -1;
  let bestTileId = '';
  for (let i = 0; i < hands.length; i++) {
    for (const t of hands[i]) {
      const score = t.total * 10 + Math.max(t.top, t.bottom);
      if (score > bestScore) {
        bestScore = score;
        bestPlayer = i;
        bestTileId = t.id;
      }
    }
  }
  return { playerIndex: Math.max(0, bestPlayer), requiredTileId: bestTileId };
}

export function createRound(playerCount: number, variant: 'block' | 'draw'): MatchState {
  if (playerCount < 2 || playerCount > 4) throw new Error('playerCount must be 2..4');
  const { hands, boneyard } = dealTiles(playerCount);
  const { playerIndex, requiredTileId } = determineFirstPlayer(hands);

  const missingSuits: number[][] = Array.from({ length: playerCount }, () => []);

  return {
    playerCount,
    variant,
    hands,
    chain: [],
    boneyard,
    currentPlayer: playerIndex,
    consecutivePasses: 0,
    requiredFirstTileId: requiredTileId,
    missingSuits,
    history: []
  };
}

/* ------------------------------------------------------------------ /
/ قواعد الحركة والتحقق                                               /
/ ------------------------------------------------------------------ */

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
  
  if (state.chain.length === 0 && state.requiredFirstTileId && move.tileId !== state.requiredFirstTileId) {
    return false;
  }

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
  
  // ✅ استخدام as const لحل مشكلة النوع الحرفي للحركة
  const updatedHistory = [...state.history, { type: 'move' as const, playerIndex, move }];

  return {
    ...state,
    hands,
    chain,
    consecutivePasses: 0,
    requiredFirstTileId: null,
    currentPlayer: (playerIndex + 1) % state.playerCount,
    history: updatedHistory
  };
}

/* ------------------------------------------------------------------ /
/ منطق السحب والتمرير                                                /
/ ------------------------------------------------------------------ */

export function canDraw(state: MatchState, playerIndex: number): boolean {
  if (state.variant !== 'draw') return false;
  if (state.boneyard.length === 0) return false;
  if (playerIndex !== state.currentPlayer) return false;
  return legalMoves(state.hands[playerIndex], state.chain).length === 0;
}

export function applyDraw(state: MatchState, playerIndex: number): { state: MatchState; drawn: Tile[] } {
  if (!canDraw(state, playerIndex)) {
    throw new Error('Draw not allowed');
  }
  const hand = [...state.hands[playerIndex]];
  let boneyard = [...state.boneyard];
  const drawn: Tile[] = [];

  const ends = getEnds(state.chain);
  let updatedMissingSuits = [...state.missingSuits];
  if (ends) {
    const currentMissing = updatedMissingSuits[playerIndex];
    const newMissing = Array.from(new Set([...currentMissing, ends.left, ends.right]));
    updatedMissingSuits[playerIndex] = newMissing;
  }

  while (boneyard.length > 0) {
    const tile = boneyard[0];
    boneyard = boneyard.slice(1);
    hand.push(tile);
    drawn.push(tile);
    if (canPlayTile(tile, state.chain)) break;
  }

  const hands = state.hands.map((h, i) => (i === playerIndex ? hand : h));
  const mustPass = legalMoves(hand, state.chain).length === 0;
  
  // ✅ استخدام as const لمنع مشكلة الـ Type Mismatch للسحب
  const updatedHistory = [...state.history, { type: 'draw' as const, playerIndex, count: drawn.length }];

  return {
    state: {
      ...state,
      hands,
      boneyard,
      missingSuits: updatedMissingSuits,
      consecutivePasses: mustPass ? state.consecutivePasses + 1 : 0,
      currentPlayer: mustPass ? (playerIndex + 1) % state.playerCount : playerIndex,
      history: updatedHistory
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

  const ends = getEnds(state.chain);
  let updatedMissingSuits = [...state.missingSuits];
  if (ends) {
    const currentMissing = updatedMissingSuits[playerIndex];
    const newMissing = Array.from(new Set([...currentMissing, ends.left, ends.right]));
    updatedMissingSuits[playerIndex] = newMissing;
  }

  // ✅ استخدام as const لمنع مشكلة الـ Type Mismatch للتمرير
  const updatedHistory = [...state.history, { type: 'pass' as const, playerIndex }];

  return {
    ...state,
    missingSuits: updatedMissingSuits,
    consecutivePasses: state.consecutivePasses + 1,
    currentPlayer: (playerIndex + 1) % state.playerCount,
    history: updatedHistory
  };
}

/* ------------------------------------------------------------------ /
/ حساب النقاط ونهاية الجولة                                           /
/ ------------------------------------------------------------------ */

export function handValue(hand: Tile[]): number {
  return hand.reduce((sum, t) => sum + t.total, 0);
}

export function isBlocked(state: MatchState): boolean {
  if (state.chain.length === 0) return false;
  if (state.consecutivePasses >= state.playerCount) return true;
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
    let lowest = Infinity;
    let winners: number[] = [];

    for (let i = 0; i < state.hands.length; i++) {
      const v = handValue(state.hands[i]);
      if (v < lowest) {
        lowest = v;
        winners = [i];
      } else if (v === lowest) {
        winners.push(i);
      }
    }

    if (winners.length > 1) {
      return { type: 'ended', reason: 'blocked_tie', winnerIndex: -1, points: 0 };
    }

    const winner = winners[0];
    let points = 0;
    for (let j = 0; j < state.hands.length; j++) {
      if (j !== winner) points += handValue(state.hands[j]);
    }
    points -= handValue(state.hands[winner]);
    return { type: 'ended', reason: 'blocked', winnerIndex: winner, points: Math.max(0, points) };
  }

  return { type: 'ongoing' };
}

/* ------------------------------------------------------------------ /
/ الذكاء الاصطناعي الاحترافي ذو الذاكرة                               /
/ ------------------------------------------------------------------ */

function countSuits(state: MatchState, playerIndex: number): number[] {
  const counts = new Array(7).fill(8);
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

function evaluateMove(state: MatchState, playerIndex: number, move: Move, level: AILevel): number {
  const tile = state.hands[playerIndex].find((t) => t.id === move.tileId)!;
  let score = 0;

  score += tile.total * 1.5;

  if (level !== 'easy') {
    const ends = getEnds(state.chain);
    const counts = countSuits(state, playerIndex);
    const remaining = state.hands[playerIndex].filter((t) => t.id !== tile.id);

    let exposed: number;
    if (!ends) {
      exposed = tile.bottom;
    } else if (move.side === 'left') {
      exposed = tile.top === ends.left ? tile.bottom : tile.top;
    } else {
      exposed = tile.top === ends.right ? tile.bottom : tile.top;
    }

    const synergy = remaining.filter((t) => t.top === exposed || t.bottom === exposed).length;
    score += synergy * 5;

    if (tile.isDouble) score += 4;

    const nextPlayer = (playerIndex + 1) % state.playerCount;
    const nextPlayerMissing = state.missingSuits[nextPlayer] || [];
    
    if (nextPlayerMissing.includes(exposed)) {
      score += 12; 
    }

    if (level === 'hard' && ends) {
      const otherEnd = move.side === 'left' ? ends.right : ends.left;
      if (exposed === otherEnd) {
        score += 6;
      }
    }
  }

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
