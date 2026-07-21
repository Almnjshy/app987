/**
 * Domino Master v5.0 — AI Engine
 * محرك AI مدمج: 4 مستويات + ذاكرة الأرقام المفقودة
 */

import { GameState, DominoTile, BoardEnd, Pip, Player } from '../types/game';
import { BoardManager } from './board';
import { hasPlayableTile, getValidEnds, calculateHandValue } from './tile';

export type AIDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface AIMove {
  readonly tile: DominoTile;
  readonly end: BoardEnd;
  readonly score: number;
}

export class DominoAI {
  private difficulty: AIDifficulty;
  /** ذاكرة الأرقام المفقودة — تُستخدم لتحسين التقييم */
  private missingSuits: Map<number, number>;

  constructor(difficulty: AIDifficulty = 'advanced') {
    this.difficulty = difficulty;
    this.missingSuits = new Map();
  }

  /** تحديث ذاكرة الأرقام المفقودة بناءً على حركات الخصم */
  updateMissingSuits(playerIndex: number, state: GameState): void {
    const player = state.players[playerIndex];
    for (const tile of player.hand) {
      this.missingSuits.set(tile.top, (this.missingSuits.get(tile.top) || 0) + 1);
      this.missingSuits.set(tile.bottom, (this.missingSuits.get(tile.bottom) || 0) + 1);
    }
  }

  /** تسجيل رقم لم يُلعب (يُستدعى عندما يمرر الخصم) */
  recordMissing(pip: Pip): void {
    this.missingSuits.set(pip, (this.missingSuits.get(pip) || 0) + 1);
  }

  chooseMove(state: GameState, playerIndex: number): AIMove | null {
    const player = state.players[playerIndex];
    const board = BoardManager.fromState(state.board);

    const playableTiles = player.hand.filter(tile => board.canPlay(tile));
    if (playableTiles.length === 0) return null;

    const allMoves: AIMove[] = [];

    for (const tile of playableTiles) {
      const validEnds = getValidEnds(tile, board.leftPip, board.rightPip);
      for (const end of validEnds) {
        const score = this.evaluateMove(tile, end, state, playerIndex, board);
        allMoves.push({ tile, end, score });
      }
    }

    allMoves.sort((a, b) => b.score - a.score);
    return this.selectByDifficulty(allMoves);
  }

  private evaluateMove(
    tile: DominoTile,
    end: BoardEnd,
    state: GameState,
    playerIndex: number,
    board: BoardManager,
  ): number {
    let score = 0;
    const player = state.players[playerIndex];
    const remainingHand = player.hand.filter(t => t.id !== tile.id);

    // 1. Play high-value tiles early
    score += tile.value * 2;

    // 2. Double bonus
    if (tile.isDouble) score += 15 + tile.value;

    // 3. Simulate move
    const boardClone = board.clone ? board.clone() : BoardManager.fromState(board.state);
    boardClone.playTile(tile, end);

    // 4. Future playability
    const futureOptions = remainingHand.filter(t => boardClone.canPlay(t)).length;
    score += futureOptions * 5;

    // 5. Blocking analysis
    const newOpenEnd = end === 'left' ? boardClone.leftPip : boardClone.rightPip;
    if (newOpenEnd !== null) {
      score += this.evaluateBlocking(newOpenEnd, state, playerIndex, remainingHand);
    }

    // 6. Missing suits memory (from repo)
    score += this.evaluateMissingSuits(tile, remainingHand);

    // 7. Control both ends
    if (boardClone.areEndsSame()) score += 20;

    // 8. Endgame: empty hand
    if (remainingHand.length === 0) score += 1000;
    else if (remainingHand.length <= 2) score += 50;

    return score;
  }

  private evaluateBlocking(
    openPip: number,
    state: GameState,
    playerIndex: number,
    myRemainingHand: DominoTile[],
  ): number {
    let blockingScore = 0;

    for (let i = 0; i < state.players.length; i++) {
      if (i === playerIndex) continue;
      const opponent = state.players[i];
      const canPlay = hasPlayableTile(opponent.hand, openPip as Pip, openPip as Pip);
      if (!canPlay) blockingScore += 10;
      for (const tile of opponent.hand) {
        if (tile.top === openPip || tile.bottom === openPip) {
          blockingScore += tile.value * 0.5;
        }
      }
    }

    const myCanPlay = hasPlayableTile(myRemainingHand, openPip as Pip, openPip as Pip);
    if (!myCanPlay) blockingScore -= 15;

    return blockingScore;
  }

  /** تقييم بناءً على ذاكرة الأرقام المفقودة (من المستودع) */
  private evaluateMissingSuits(tile: DominoTile, remainingHand: DominoTile[]): number {
    let suitScore = 0;

    // تفضيل الأرقام التي لا نملكها في اليد المتبقية
    const remainingPips = new Set<Pip>();
    for (const t of remainingHand) {
      remainingPips.add(t.top);
      remainingPips.add(t.bottom);
    }

    // إذا كان أحد أطراف القطعة من أرقام نادرة في اليد — مكافأة
    if (!remainingPips.has(tile.top)) suitScore += 5;
    if (!remainingPips.has(tile.bottom)) suitScore += 5;

    // إذا كان الرقم مسجلاً كمفقود (الخصم لا يملكه غالباً) — مكافأة كبيرة
    const topMissing = this.missingSuits.get(tile.top) || 0;
    const bottomMissing = this.missingSuits.get(tile.bottom) || 0;
    suitScore += topMissing * 3;
    suitScore += bottomMissing * 3;

    return suitScore;
  }

  private selectByDifficulty(moves: AIMove[]): AIMove {
    switch (this.difficulty) {
      case 'beginner': {
        const bottomHalf = moves.slice(Math.floor(moves.length / 2));
        return bottomHalf[Math.floor(Math.random() * bottomHalf.length)];
      }
      case 'intermediate': {
        const top3 = moves.slice(0, Math.min(3, moves.length));
        return top3[Math.floor(Math.random() * top3.length)];
      }
      case 'advanced':
        return Math.random() < 0.1 && moves.length > 1 ? moves[1] : moves[0];
      case 'expert':
        return moves[0];
      default:
        return moves[0];
    }
  }

  setDifficulty(d: AIDifficulty): void { this.difficulty = d; }
  getDifficulty(): AIDifficulty { return this.difficulty; }
  clearMemory(): void { this.missingSuits.clear(); }
}
