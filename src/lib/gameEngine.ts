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

/** إنشاء مجموعة الدومينو الكاملة (28 قطعة) بدون تكرار. */
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

/** عدد القطع لكل لاعب حسب القواعد: 7 قطع دائماً (2-4 لاعبين). */
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

/**
 * تحديد اللاعب الذي يبدأ: صاحب 6-6، وإن لم توجد فصاحب أعلى دوبل،
 * وإن لم يوجد أي دوبل فصاحب أعلى قطعة (بالنقاط ثم بأعلى رقم مفرد).
 */
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

/** إنشاء جولة جديدة: توزيع صحيح + تحديد البادئ. */
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

/** طرفا السلسلة الحاليان (Head / Tail). null إذا كانت الطاولة فارغة. */
export function getEnds(chain: ChainTile[]): { left: number; right: number } | null {
  if (chain.length === 0) return null;
  return { left: chain[0].left, right: chain[chain.length - 1].right };
}

/** هل يمكن لهذه القطعة أن تُلعب على الطاولة الحالية؟ */
export function canPlayTile(tile: Tile, chain: ChainTile[]): boolean {
  const ends = getEnds(chain);
  if (!ends) return true;
  return (
    tile.top === ends.left || tile.bottom === ends.left ||
    tile.top === ends.right || tile.bottom === ends.right
  );
}

/** الأطراف القانونية التي يمكن وضع القطعة عليها. */
export function getValidSides(tile: Tile, chain: ChainTile[]): EndSide[] {
  if (chain.length === 0) return ['right'];
  const ends = getEnds(chain)!;
  const sides: EndSide[] = [];
  if (tile.top === ends.left || tile.bottom === ends.left) sides.push('left');
  if (tile.top === ends.right || tile.bottom === ends.right) sides.push('right');
  return sides;
}

/** القطع القانونية في يد اللاعب. */
export function getPlayableTiles(hand: Tile[], chain: ChainTile[]): Tile[] {
  return hand.filter((t) => canPlayTile(t, chain));
}

/** جميع الحركات القانونية للاعب (قطعة + طرف). */
export function legalMoves(hand: Tile[], chain: ChainTile[]): Move[] {
  const moves: Move[] = [];
  for (const tile of hand) {
    for (const side of getValidSides(tile, chain)) {
      moves.push({ tileId: tile.id, side });
    }
  }
  return moves;
}

/** التحقق من قانونية حركة معينة قبل تنفيذها. */
export function isLegalMove(state: MatchState, playerIndex: number, move: Move): boolean {
  if (playerIndex !== state.currentPlayer) return false;
  const hand = state.hands[playerIndex];
  const tile = hand.find((t) => t.id === move.tileId);
  if (!tile) return false;
  return getValidSides(tile, state.chain).includes(move.side);
}

/**
 * تنفيذ حركة. يرمي خطأً عند أي حركة غير قانونية (منع الغش).
 * يوجّه القطعة تلقائياً (تدوير) لتتوافق مع الرقم على الطرف،
 * ويحدّث طرفي السلسلة بصورة صحيحة.
 */
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
    // أول قطعة: اليسار هو الأصغر تقليدياً لا يهم، نثبت top يساراً.
    chainTile = { tile, left: tile.top, right: tile.bottom, side: null };
    chain = [chainTile];
  } else if (move.side === 'left') {
    const end = state.chain[0].left;
    // القيمة المتصلة يجب أن تواجه الطرف الأيسر الحالي.
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

/** هل يحق للاعب السحب الآن؟ (في نمط Draw فقط، وعند عدم وجود حركة قانونية) */
export function canDraw(state: MatchState, playerIndex: number): boolean {
  if (state.variant !== 'draw') return false;
  if (state.boneyard.length === 0) return false;
  if (playerIndex !== state.currentPlayer) return false;
  return legalMoves(state.hands[playerIndex], state.chain).length === 0;
}

/**
 * السحب من المخزن (Boneyard): يستمر السحب حتى يجد قطعة قابلة للعب
 * أو ينفد المخزن. إن وجد قطعة قابلة يبقى الدور عنده ليلعبها،
 * وإلا ينتقل الدور (تمرير تلقائي).
 */
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

/** هل يحق للاعب التمرير؟ فقط عندما لا توجد حركة ولا سحب ممكن. */
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

/** هل اللعب منسد (Blocked)؟ لا أحد يستطيع اللعب ولا سحب ممكن. */
export function isBlocked(state: MatchState): boolean {
  if (state.chain.length === 0) return false;
  if (state.variant === 'draw' && state.boneyard.length > 0) return false;
  for (const hand of state.hands) {
    if (legalMoves(hand, state.chain).length > 0) return false;
  }
  return true;
}

/**
 * حالة الجولة:
 * - 'ongoing' اللعب مستمر.
 * - 'domino' لاعب أنهى قطعه → يكسب مجموع نقاط أيدي الخصوم.
 * - 'blocked' انسداد → أقل يد نقاطاً يكسب مجموع أيدي الخصوم ناقصاً يده.
 */
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
/* الذكاء الاصطناعي                                                    */
/* ------------------------------------------------------------------ */

/** عدّ الأرقام المتبقية (غير المكشوفة في يد الذكاء والسلسلة). */
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

/** هل يبدو أن اللاعب التالي محجوب عن رقم معين؟ (لم يعد هناك شيء منه) */
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

  // التخلص من النقاط العالية أولاً
  score += tile.total * 2;

  if (level !== 'medium') {
    const ends = getEnds(state.chain);
    const counts = countSuits(state, playerIndex);
    const remaining = state.hands[playerIndex].filter((t) => t.id !== tile.id);

    // الطرف الذي ستتركه هذه القطعة مكشوفاً بعد لعبها
    let exposed: number;
    if (state.chain.length === 0) {
      exposed = tile.bottom;
    } else if (move.side === 'left') {
      exposed = tile.top === ends!.left ? tile.bottom : tile.top;
    } else {
      exposed = tile.top === ends!.right ? tile.bottom : tile.top;
    }

    // مرونة اليد: الاحتفاظ بأرقام نملك منها قطعاً أخرى
    const synergy = remaining.filter((t) => t.top === exposed || t.bottom === exposed).length;
    score += synergy * 6;

    // فتح رقم نفد من اللعبة قد يحجب الخصم (تكتيك إغلاق)
    if (suitExhausted(counts, exposed)) score += 8;

    // لا تفتح رقماً لا نملك منه شيئاً وما زال كثيراً في اللعبة
    if (synergy === 0 && counts[exposed] > 2) score -= 5;

    // الدوبل: خطره بقاؤه حتى النهاية، لعبه مبكراً جيد إن كان آمناً
    if (tile.isDouble) score += 3;

    // في المستوى الأعلى: محاولة جعل الطرفين متطابقين لتضييق الخيارات
    if (level === 'hard' && ends && state.chain.length > 0) {
      const otherEnd = move.side === 'left' ? ends.right : ends.left;
      if (exposed === otherEnd) score += 4;
    }
  }

  return score + Math.random() * 0.5;
}

/**
 * اختيار حركة الذكاء الاصطناعي.
 * يرجع حركة، أو 'draw'، أو 'pass' — وكلها مضمونة قانونية من المحرك.
 */
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
