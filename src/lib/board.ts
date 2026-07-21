/**
 * Domino Master v5.0 — Board Engine
 * محرك اللوحة المصحح — فقط رأس وذيل، لا جوانب
 */

import { BoardState, BoardEnd, OrientedTile, DominoTile, Pip } from '../types/game';
import { orientTile, orientFirstTile, canConnect } from './tile';

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
    bm.updateHash();
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

  clone(): BoardManager {
    const bm = new BoardManager();
    bm.tiles = [...this.tiles];
    bm._leftPip = this._leftPip;
    bm._rightPip = this._rightPip;
    bm._hash = this._hash;
    return bm;
  }

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
    const left = this._leftPip;
    const right = this._rightPip;
    if (left !== null && canConnect(tile, left)) return true;
    if (right !== null && canConnect(tile, right)) return true;
    return false;
  }

  getValidEnds(tile: DominoTile): BoardEnd[] {
    if (this.isEmpty) return ['left', 'right'];
    const ends: BoardEnd[] = [];
    if (this._leftPip !== null && canConnect(tile, this._leftPip)) {
      ends.push('left');
    }
    if (this._rightPip !== null && canConnect(tile, this._rightPip)) {
      if (this._leftPip !== this._rightPip || ends.length === 0) {
        ends.push('right');
      }
    }
    return ends;
  }

  isValid(): boolean {
    if (this.tiles.length <= 1) return true;
    for (let i = 1; i < this.tiles.length; i++) {
      const prev = this.tiles[i - 1];
      const curr = this.tiles[i];
      if (prev.trailingPip !== curr.leadingPip) {
        return false;
      }
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
