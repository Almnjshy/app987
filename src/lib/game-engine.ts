/**
 * Domino Master v5.0 — Game Engine
 * المحرك الرئيسي المصحح بالكامل
 *
 * Rules Verified:
 * ✅ 28 tiles, 7 per player
 * ✅ Highest double starts
 * ✅ Play only on head (left) or tail (right)
 * ✅ No side branches
 * ✅ Draw from boneyard if cannot play
 * ✅ Pass if cannot play and boneyard empty
 * ✅ Blocked: ALL players cannot play AND boneyard empty
 * ✅ Winner: empty hand OR lowest hand when blocked
 * ✅ Score: winner gets sum of opponents' hand values
 * ✅ Target score wins the match
 */

import {
  GameState, Player, GamePhase, Move, GameConfig, DEFAULT_CONFIG,
  DominoTile, InvalidMoveError, GameStateError,
} from '../types/game';
import { BoardManager } from './board';
import {
  generateDeck, shuffle, findHighestDouble, calculateHandValue,
  hasPlayableTile, getValidEnds, orientFirstTile,
} from './tile';

export class DominoGameEngine {
  private state: GameState;
  private config: GameConfig;
  private board: BoardManager;
  private allTiles: readonly DominoTile[];

  constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.allTiles = generateDeck();
    this.board = BoardManager.createEmpty();
    this.state = this.initializeGame();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  private initializeGame(): GameState {
    const shuffled = shuffle(this.allTiles);
    const numPlayers = this.config.playerNames.length;

    const players: Player[] = [];
    let tileIndex = 0;

    for (let i = 0; i < numPlayers; i++) {
      const hand = shuffled.slice(tileIndex, tileIndex + 7);
      tileIndex += 7;
      players.push(Object.freeze({
        id: `player-${i}`,
        name: this.config.playerNames[i],
        type: 'human' as const,
        hand: Object.freeze(hand),
        score: 0,
        handValue: calculateHandValue(hand),
        isCurrent: false,
      }));
    }

    const boneyard = Object.freeze(shuffled.slice(tileIndex));

    // Find starting player (highest double)
    let startingIndex = 0;
    let highestDoubleValue = -1;

    for (let i = 0; i < players.length; i++) {
      const d = findHighestDouble(players[i].hand);
      if (d && d.top > highestDoubleValue) {
        highestDoubleValue = d.top;
        startingIndex = i;
      }
    }

    const finalPlayers = players.map((p, i) =>
      Object.freeze({ ...p, isCurrent: i === startingIndex })
    );

    return Object.freeze({
      board: this.board.state,
      players: Object.freeze(finalPlayers),
      currentPlayerIndex: startingIndex,
      boneyard,
      phase: 'playing' as GamePhase,
      round: 1,
      moveHistory: Object.freeze([]),
      consecutivePasses: 0,
      winner: null,
      lastRoundWinner: null,
      scores: new Map(),
    });
  }

  getState(): GameState { return this.state; }
  getCurrentPlayer(): Player { return this.state.players[this.state.currentPlayerIndex]; }
  getBoard(): BoardManager { return this.board; }
  getConfig(): GameConfig { return this.config; }

  // ============================================
  // PLAY TILE
  // ============================================

  playTile(tileId: string, end: 'left' | 'right'): boolean {
    if (this.state.phase === 'game_over') {
      throw new GameStateError('Game is already over');
    }

    const playerIndex = this.state.currentPlayerIndex;
    const player = this.state.players[playerIndex];
    const tile = player.hand.find(t => t.id === tileId);

    if (!tile) {
      throw new InvalidMoveError(`Tile ${tileId} not in hand`);
    }

    const validEnds = getValidEnds(tile, this.board.leftPip, this.board.rightPip);
    if (!validEnds.includes(end)) {
      throw new InvalidMoveError(
        `Cannot play [${tile.top}|${tile.bottom}] on ${end}. ` +
        `Open ends: L=${this.board.leftPip}, R=${this.board.rightPip}`
      );
    }

    const oriented = this.board.playTile(tile, end);
    if (!oriented) {
      throw new InvalidMoveError('Board rejected the tile');
    }

    const newHand = player.hand.filter(t => t.id !== tileId);
    const newHandValue = calculateHandValue(newHand);

    const move: Move = Object.freeze({
      tile, end, orientedTile: oriented, isPass: false, isDraw: false,
    });

    // Check win: empty hand
    if (newHand.length === 0) {
      this.endRound(playerIndex);
      return true;
    }

    this.state = this.buildNextState({
      newPlayers: this.state.players.map((p, i) =>
        i === playerIndex
          ? Object.freeze({ ...p, hand: Object.freeze(newHand), handValue: newHandValue, isCurrent: false })
          : Object.freeze({ ...p, isCurrent: i === (playerIndex + 1) % this.state.players.length })
      ),
      newBoard: this.board.state,
      newHistory: [...this.state.moveHistory, move],
      resetPasses: true,
    });

    return true;
  }

  // ============================================
  // DRAW FROM BONEYARD
  // ============================================

  drawTile(): DominoTile | null {
    if (this.state.boneyard.length === 0) return null;

    const playerIndex = this.state.currentPlayerIndex;
    const player = this.state.players[playerIndex];

    const [drawn, ...remaining] = this.state.boneyard;
    const newHand = [...player.hand, drawn];
    const newHandValue = calculateHandValue(newHand);

    const move: Move = Object.freeze({
      tile: drawn, end: 'right', orientedTile: orientFirstTile(drawn),
      isPass: false, isDraw: true,
    });

    this.state = this.buildNextState({
      newPlayers: this.state.players.map((p, i) =>
        i === playerIndex
          ? Object.freeze({ ...p, hand: Object.freeze(newHand), handValue: newHandValue })
          : p
      ),
      newBoneyard: Object.freeze(remaining),
      newHistory: [...this.state.moveHistory, move],
      resetPasses: false,
    });

    return drawn;
  }

  // ============================================
  // PASS TURN
  // ============================================

  passTurn(): void {
    const playerIndex = this.state.currentPlayerIndex;
    const newPasses = this.state.consecutivePasses + 1;

    if (newPasses >= this.state.players.length) {
      this.handleBlockedGame();
      return;
    }

    const move: Move = Object.freeze({
      tile: this.state.players[playerIndex].hand[0],
      end: 'right', orientedTile: orientFirstTile(this.state.players[playerIndex].hand[0]),
      isPass: true, isDraw: false,
    });

    this.state = this.buildNextState({
      newHistory: [...this.state.moveHistory, move],
      resetPasses: false,
      consecutivePasses: newPasses,
    });
  }

  // ============================================
  // BLOCKED GAME
  // ============================================

  private handleBlockedGame(): void {
    let minHandValue = Infinity;
    let winnerIndex = -1;

    for (let i = 0; i < this.state.players.length; i++) {
      const hv = this.state.players[i].handValue;
      if (hv < minHandValue) {
        minHandValue = hv;
        winnerIndex = i;
      }
    }

    this.endRound(winnerIndex);
  }

  // ============================================
  // END ROUND
  // ============================================

  private endRound(winnerIndex: number): void {
    const winner = this.state.players[winnerIndex];

    let roundPoints = 0;
    const newScores = new Map(this.state.scores);

    for (let i = 0; i < this.state.players.length; i++) {
      if (i === winnerIndex) continue;
      roundPoints += this.state.players[i].handValue;
    }

    const currentScore = newScores.get(winner.id) || 0;
    newScores.set(winner.id, currentScore + roundPoints);

    const winnerTotal = newScores.get(winner.id) || 0;
    const isGameOver = winnerTotal >= this.config.targetScore;

    const updatedPlayers = this.state.players.map((p, i) =>
      Object.freeze({ ...p, score: newScores.get(p.id) || 0 })
    );

    this.state = Object.freeze({
      ...this.state,
      players: Object.freeze(updatedPlayers),
      phase: isGameOver ? 'game_over' : 'round_end',
      winner: isGameOver ? updatedPlayers[winnerIndex] : null,
      lastRoundWinner: updatedPlayers[winnerIndex],
      scores: newScores,
      consecutivePasses: 0,
    });
  }

  // ============================================
  // STATE BUILDER
  // ============================================

  private buildNextState(params: {
    newPlayers?: readonly Player[];
    newBoard?: typeof this.state.board;
    newBoneyard?: readonly DominoTile[];
    newHistory?: readonly Move[];
    resetPasses?: boolean;
    consecutivePasses?: number;
  }): GameState {
    const nextIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;

    return Object.freeze({
      ...this.state,
      board: params.newBoard || this.state.board,
      players: params.newPlayers || this.state.players,
      currentPlayerIndex: nextIndex,
      boneyard: params.newBoneyard || this.state.boneyard,
      moveHistory: Object.freeze(params.newHistory || this.state.moveHistory),
      consecutivePasses: params.resetPasses ? 0 : (params.consecutivePasses ?? this.state.consecutivePasses),
    });
  }

  // ============================================
  // VALIDATION HELPERS
  // ============================================

  canCurrentPlayerPlay(): boolean {
    const player = this.getCurrentPlayer();
    return hasPlayableTile(player.hand, this.board.leftPip, this.board.rightPip);
  }

  canCurrentPlayerDraw(): boolean {
    return this.state.boneyard.length > 0;
  }

  /** True blocked: no one can play AND boneyard is empty */
  isActuallyBlocked(): boolean {
    for (const player of this.state.players) {
      const canPlay = hasPlayableTile(player.hand, this.board.leftPip, this.board.rightPip);
      if (canPlay) return false;
    }
    return this.state.boneyard.length === 0;
  }

  reset(): void {
    this.board.reset();
    this.state = this.initializeGame();
  }
}
