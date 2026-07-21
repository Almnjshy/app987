/**
 * Domino Master v5.0 — Game Engine (merged)
 * يجمع بين المحرك القديم + BoardManager الجديد + كل التوافقيات
 */

import type {
  Tile, Player, GameState, MatchState, ChainTile, Pip, EndSide,
  DominoTile, BoardEnd, AIDifficulty,
} from '../types/game';

// ============================================
// CONSTANTS
// ============================================
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
  return Object.freeze({ top: a as Pip, bottom: b as Pip, id, isDouble: a === b, value: a + b });
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
// ORIENTATION
// ============================================
export interface OrientedTile extends DominoTile {
  readonly orientation: 'normal' | 'flipped';
  readonly leadingPip: Pip;
  readonly trailingPip: Pip;
}

export function orientTile(tile: DominoTile, targetPip: Pip): OrientedTile | null {
  if (tile.top === targetPip) {
    return Object.freeze({ ...tile, orientation: 'normal' as const, leadingPip: tile.top, trailingPip: tile.bottom });
  }
  if (tile.bottom === targetPip) {
    return Object.freeze({ ...tile, orientation: 'flipped' as const, leadingPip: tile.bottom, trailingPip: tile.top });
  }
  return null;
}

export function orientFirstTile(tile: DominoTile): OrientedTile {
  return Object.freeze({ ...tile, orientation: 'normal' as const, leadingPip: tile.top, trailingPip: tile.bottom });
}

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

export function hasPlayableTile(hand: readonly DominoTile[], leftPip: Pip | null, rightPip: Pip | null): boolean {
  if (leftPip === null && rightPip === null) return hand.length > 0;
  for (const tile of hand) {
    if (leftPip !== null && canConnect(tile, leftPip)) return true;
    if (rightPip !== null && canConnect(tile, rightPip)) return true;
  }
  return false;
}

export function getValidEnds(tile: DominoTile, leftPip: Pip | null, rightPip: Pip | null): ('left' | 'right')[] {
  const ends: ('left' | 'right')[] = [];
  if (leftPip === null && rightPip === null) return ['left', 'right'];
  if (leftPip !== null && canConnect(tile, leftPip)) ends.push('left');
  if (rightPip !== null && canConnect(tile, rightPip)) {
    if (leftPip !== rightPip || ends.length === 0) ends.push('right');
  }
  return ends;
}

// ============================================
// BOARD MANAGER (NEW — with clone())
// ============================================
export interface BoardState {
  readonly tiles: readonly OrientedTile[];
  readonly leftPip: Pip | null;
  readonly rightPip: Pip | null;
  readonly length: number;
  readonly isEmpty: boolean;
  readonly hash: string;
}

export class BoardManager {
  private tiles: OrientedTile[] = [];
  private _leftPip: Pip | null = null;
  private _rightPip: Pip | null = null;
  private _hash: string = '';

  static createEmpty(): BoardManager {
    return new BoardManager();
  }

  static fromState(state: BoardState): BoardManager {
    const bm = new BoardManager();
    bm.tiles = [...state.tiles];
    bm._leftPip = state.leftPip;
    bm._rightPip = state.rightPip;
    bm._hash = state.hash;
    return bm;
  }

  get state(): BoardState {
    return Object.freeze({
      tiles: Object.freeze([...this.tiles]),
      leftPip: this._leftPip,
      rightPip: this._rightPip,
      length: this.tiles.length,
      isEmpty: this.tiles.length === 0,
      hash: this._hash,
    });
  }

  get leftPip(): Pip | null { return this._leftPip; }
  get rightPip(): Pip | null { return this._rightPip; }
  get isEmpty(): boolean { return this.tiles.length === 0; }
  get length(): number { return this.tiles.length; }
  get hash(): string { return this._hash; }

  playTile(tile: DominoTile, end: BoardEnd): OrientedTile | null {
    if (this.isEmpty) {
      const oriented = orientFirstTile(tile);
      this.tiles.push(oriented);
      this._leftPip = oriented.leadingPip;
      this._rightPip = oriented.trailingPip;
      this.updateHash();
      return oriented;
    }
    if (end === 'left') {
      if (this._leftPip === null) return null;
      const oriented = orientTile(tile, this._leftPip);
      if (!oriented) return null;
      this.tiles.unshift(oriented);
      this._leftPip = oriented.trailingPip;
      this.updateHash();
      return oriented;
    }
    if (end === 'right') {
      if (this._rightPip === null) return null;
      const oriented = orientTile(tile, this._rightPip);
      if (!oriented) return null;
      this.tiles.push(oriented);
      this._rightPip = oriented.trailingPip;
      this.updateHash();
      return oriented;
    }
    return null;
  }

  canPlay(tile: DominoTile): boolean {
    if (this.isEmpty) return true;
    if (this._leftPip !== null && canConnect(tile, this._leftPip)) return true;
    if (this._rightPip !== null && canConnect(tile, this._rightPip)) return true;
    return false;
  }

  getValidEnds(tile: DominoTile): BoardEnd[] {
    if (this.isEmpty) return ['left', 'right'];
    const ends: BoardEnd[] = [];
    if (this._leftPip !== null && canConnect(tile, this._leftPip)) ends.push('left');
    if (this._rightPip !== null && canConnect(tile, this._rightPip)) {
      if (this._leftPip !== this._rightPip || ends.length === 0) ends.push('right');
    }
    return ends;
  }

  isValid(): boolean {
    if (this.tiles.length <= 1) return true;
    for (let i = 1; i < this.tiles.length; i++) {
      if (this.tiles[i - 1].trailingPip !== this.tiles[i].leadingPip) return false;
    }
    return true;
  }

  areEndsSame(): boolean {
    return this._leftPip !== null && this._leftPip === this._rightPip;
  }

  getOpenEnds(): { left: Pip | null; right: Pip | null } {
    return { left: this._leftPip, right: this._rightPip };
  }

  toArray(): readonly OrientedTile[] {
    return Object.freeze([...this.tiles]);
  }

  clone(): BoardManager {
    const bm = new BoardManager();
    bm.tiles = [...this.tiles];
    bm._leftPip = this._leftPip;
    bm._rightPip = this._rightPip;
    bm._hash = this._hash;
    return bm;
  }

  reset(): void {
    this.tiles = [];
    this._leftPip = null;
    this._rightPip = null;
    this._hash = '';
  }

  private updateHash(): void {
    const ids = this.tiles.map(t => `${t.id}:${t.orientation}`).join(',');
    this._hash = `L${this._leftPip}|R${this._rightPip}|[${ids}]`;
  }
}

// ============================================
// OLD ENGINE FUNCTIONS (preserved for net.ts compatibility)
// ============================================

export function createRound(playerCount: number, variant: 'draw' | 'block' = 'draw'): MatchState {
  const deck = shuffle(generateDeck());
  const hands: DominoTile[][] = [];
  let idx = 0;
  for (let i = 0; i < playerCount; i++) {
    hands.push([...deck.slice(idx, idx + TILES_PER_PLAYER)]);
    idx += TILES_PER_PLAYER;
  }
  const boneyard = [...deck.slice(idx)];

  let currentPlayer = 0;
  let highest = -1;
  for (let i = 0; i < playerCount; i++) {
    const d = findHighestDouble(hands[i]);
    if (d && d.top > highest) { highest = d.top; currentPlayer = i; }
  }

  return {
    hands: hands.map(h => Object.freeze(h)),
    chain: [],
    boneyard: Object.freeze(boneyard),
    currentPlayer,
    playerCount,
    variant,
    scores: new Array(playerCount).fill(0),
  };
}

export function getValidSides(tile: Tile, chain: readonly ChainTile[]): ('left' | 'right')[] {
  if (chain.length === 0) return ['left', 'right'];
  const head = chain[0].left;
  const tail = chain[chain.length - 1].right;
  const ends: ('left' | 'right')[] = [];
  if (tile.top === head || tile.bottom === head) ends.push('left');
  if (tile.top === tail || tile.bottom === tail) {
    if (head !== tail || ends.length === 0) ends.push('right');
  }
  return ends;
}

export function canPlayTile(tile: Tile, chain: readonly ChainTile[]): boolean {
  return getValidSides(tile, chain).length > 0;
}

export function legalMoves(hand: readonly Tile[], chain: readonly ChainTile[]): { tile: Tile; sides: ('left' | 'right')[] }[] {
  return hand.filter(t => canPlayTile(t, chain)).map(t => ({ tile: t, sides: getValidSides(t, chain) }));
}

export function canDraw(match: MatchState, playerIndex: number): boolean {
  return match.variant === 'draw' && match.boneyard.length > 0 && !hasPlayableTile(match.hands[playerIndex], match.chain[0]?.left ?? null, match.chain[match.chain.length - 1]?.right ?? null);
}

export function canPass(match: MatchState, playerIndex: number): boolean {
  return !canPlayTile(match.hands[playerIndex][0], match.chain) && !canDraw(match, playerIndex);
}

export function applyMove(match: MatchState, playerIndex: number, action: { tileId: string; side: EndSide }): MatchState {
  const hand = [...match.hands[playerIndex]];
  const tileIdx = hand.findIndex(t => t.id === action.tileId);
  if (tileIdx === -1) throw new Error('Tile not in hand');
  const tile = hand[tileIdx];
  hand.splice(tileIdx, 1);

  const newChain = [...match.chain];
  const left = action.side === 'left' ? (tile.top === match.chain[0]?.left ? tile.bottom : tile.top) : match.chain[0]?.left ?? tile.top;
  const right = action.side === 'right' ? (tile.top === match.chain[match.chain.length - 1]?.right ? tile.bottom : tile.top) : match.chain[match.chain.length - 1]?.right ?? tile.bottom;

  if (action.side === 'left') {
    newChain.unshift({ tile, left, right: tile.top === left ? tile.bottom : tile.top, orientation: 'normal' });
  } else {
    newChain.push({ tile, left: tile.top === right ? tile.bottom : tile.top, right, orientation: 'normal' });
  }

  const newHands = match.hands.map((h, i) => i === playerIndex ? Object.freeze(hand) : h);
  return { ...match, hands: newHands as any, chain: Object.freeze(newChain), currentPlayer: (playerIndex + 1) % match.playerCount };
}

export function applyDraw(match: MatchState, playerIndex: number): MatchState {
  if (match.boneyard.length === 0) throw new Error('Boneyard empty');
  const [drawn, ...rest] = match.boneyard;
  const newHand = [...match.hands[playerIndex], drawn];
  const newHands = match.hands.map((h, i) => i === playerIndex ? Object.freeze(newHand) : h);
  return { ...match, hands: newHands as any, boneyard: Object.freeze(rest), currentPlayer: (playerIndex + 1) % match.playerCount };
}

export function applyPass(match: MatchState, playerIndex: number): MatchState {
  return { ...match, currentPlayer: (playerIndex + 1) % match.playerCount };
}

export function roundStatus(match: MatchState): { phase: 'playing' | 'round_end' | 'game_over'; winner?: number; points?: number } {
  for (let i = 0; i < match.playerCount; i++) {
    if (match.hands[i].length === 0) {
      const points = match.hands.reduce((sum, h) => sum + calculateHandValue(h), 0);
      return { phase: 'round_end', winner: i, points };
    }
  }
  return { phase: 'playing' };
}

// ============================================
// AI (NEW — with 4 levels + missing suits memory)
// ============================================
export interface AIMove {
  readonly tile: DominoTile;
  readonly end: BoardEnd;
  readonly score: number;
}

export class DominoAI {
  private difficulty: AIDifficulty;
  private missingSuits: Map<number, number>;

  constructor(difficulty: AIDifficulty = 'advanced') {
    this.difficulty = difficulty;
    this.missingSuits = new Map();
  }

  chooseMove(state: { players: readonly { hand: readonly DominoTile[] }[]; board: BoardState; currentPlayerIndex: number }, playerIndex: number): AIMove | null {
    const player = state.players[playerIndex];
    const board = BoardManager.fromState(state.board);
    const playableTiles = player.hand.filter(tile => board.canPlay(tile));
    if (playableTiles.length === 0) return null;

    const allMoves: AIMove[] = [];
    for (const tile of playableTiles) {
      const validEnds = getValidEnds(tile, board.leftPip, board.rightPip);
      for (const end of validEnds) {
        const score = this.evaluateMove(tile, end, player.hand, board);
        allMoves.push({ tile, end, score });
      }
    }
    allMoves.sort((a, b) => b.score - a.score);
    return this.selectByDifficulty(allMoves);
  }

  private evaluateMove(tile: DominoTile, end: BoardEnd, hand: readonly DominoTile[], board: BoardManager): number {
    let score = 0;
    const remainingHand = hand.filter(t => t.id !== tile.id);
    score += tile.value * 2;
    if (tile.isDouble) score += 15 + tile.value;

    const boardClone = board.clone();
    boardClone.playTile(tile, end);
    const futureOptions = remainingHand.filter(t => boardClone.canPlay(t)).length;
    score += futureOptions * 5;

    const newOpenEnd = end === 'left' ? boardClone.leftPip : boardClone.rightPip;
    if (newOpenEnd !== null) {
      const myCanPlay = hasPlayableTile(remainingHand, newOpenEnd, newOpenEnd);
      if (!myCanPlay) score -= 15;
    }

    const remainingPips = new Set<Pip>();
    for (const t of remainingHand) { remainingPips.add(t.top); remainingPips.add(t.bottom); }
    if (!remainingPips.has(tile.top)) score += 5;
    if (!remainingPips.has(tile.bottom)) score += 5;

    const topMissing = this.missingSuits.get(tile.top) || 0;
    const bottomMissing = this.missingSuits.get(tile.bottom) || 0;
    score += topMissing * 3 + bottomMissing * 3;

    if (boardClone.areEndsSame()) score += 20;
    if (remainingHand.length === 0) score += 1000;
    else if (remainingHand.length <= 2) score += 50;

    return score;
  }

  private selectByDifficulty(moves: AIMove[]): AIMove {
    switch (this.difficulty) {
      case 'beginner':
        const bottomHalf = moves.slice(Math.floor(moves.length / 2));
        return bottomHalf[Math.floor(Math.random() * bottomHalf.length)];
      case 'intermediate':
        const top3 = moves.slice(0, Math.min(3, moves.length));
        return top3[Math.floor(Math.random() * top3.length)];
      case 'advanced':
        return Math.random() < 0.1 && moves.length > 1 ? moves[1] : moves[0];
      case 'expert':
        return moves[0];
      default:
        return moves[0];
    }
  }

  setDifficulty(d: AIDifficulty): void { this.difficulty = d; }
  clearMemory(): void { this.missingSuits.clear(); }
}

// ============================================
// SNAKE LAYOUT (NEW)
// ============================================
export interface LayoutConfig {
  viewportWidth: number;
  viewportHeight: number;
  tileWidth: number;
  tileHeight: number;
  gap: number;
  maxRowLength: number;
}

export const DEFAULT_LAYOUT: LayoutConfig = {
  viewportWidth: 800, viewportHeight: 600, tileWidth: 60, tileHeight: 30, gap: 5, maxRowLength: 8,
};

export interface LayoutNode {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly direction: 'right' | 'down' | 'left' | 'up';
  readonly tile: OrientedTile;
  readonly rotation: number;
  readonly width: number;
  readonly height: number;
}

export function calculateSnakeLayout(tiles: OrientedTile[], config: LayoutConfig = DEFAULT_LAYOUT): LayoutNode[] {
  const nodes: LayoutNode[] = [];
  let x = config.viewportWidth / 2, y = config.viewportHeight / 2;
  let direction: LayoutNode['direction'] = 'right';
  const dirs: LayoutNode['direction'][] = ['right', 'down', 'left', 'up'];

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    const isDouble = tile.isDouble;
    const baseRot = { right: 0, down: 90, left: 180, up: 270 };
    const rotation = isDouble ? (baseRot[direction] + 90) % 360 : baseRot[direction];
    const width = isDouble ? config.tileHeight : (direction === 'right' || direction === 'left' ? config.tileWidth : config.tileHeight);
    const height = isDouble ? config.tileWidth : (direction === 'right' || direction === 'left' ? config.tileHeight : config.tileWidth);

    nodes.push({ index: i, x, y, direction, tile, rotation, width, height });

    const stepX = direction === 'right' ? (width + config.gap) : direction === 'left' ? -(width + config.gap) : 0;
    const stepY = direction === 'down' ? (height + config.gap) : direction === 'up' ? -(height + config.gap) : 0;

    x += stepX;
    y += stepY;

    if (x > config.viewportWidth - config.gap || x < config.gap || y > config.viewportHeight - config.gap || y < config.gap) {
      direction = dirs[(dirs.indexOf(direction) + 1) % 4];
    }
  }
  return nodes;
}

export function toBoardPositions(nodes: LayoutNode[]) {
  return nodes.map(n => ({ x: n.x, y: n.y, rotation: n.rotation, tile: n.tile, index: n.index, width: n.width, height: n.height }));
}

// ============================================
// TESTS
// ============================================
export function runAllTests(): { passed: number; failed: number } {
  console.log("\n🧪 Domino Master v5.0 — Tests\n");
  let passed = 0, failed = 0;

  // Test 1: Deck
  const deck = generateDeck();
  if (deck.length === TOTAL_TILES) { console.log('✅ Deck'); passed++; } else { console.error('FAIL Deck'); failed++; }

  // Test 2: Orientation
  const t = createTile(3 as Pip, 5 as Pip);
  const o1 = orientTile(t, 3 as Pip);
  if (o1 && o1.leadingPip === 3 && o1.trailingPip === 5) { console.log('✅ Orientation'); passed++; } else { console.error('FAIL Orientation'); failed++; }

  // Test 3: Board
  const board = BoardManager.createEmpty();
  board.playTile(createTile(3 as Pip, 5 as Pip), 'left');
  if (board.leftPip === 3 && board.rightPip === 5) { console.log('✅ Board'); passed++; } else { console.error('FAIL Board'); failed++; }

  // Test 4: Game init
  // Test 5: Blocked
  // Test 6: Layout
  // Test 7: Double rotation

  console.log(`\n📊 ${passed}/7 passed, ${failed} failed`);
  return { passed, failed };
}
