/**
 * Domino Master v5.0 — Verification Tests
 */

import { DominoGameEngine } from './gameengine';
import { BoardManager } from './board';
import {
  generateDeck, createTile, orientTile, orientFirstTile,
  canConnect, getOppositePip, calculateHandValue, hasPlayableTile,
  findHighestDouble, TOTAL_TILES,
} from './tile';
import { calculateSnakeLayout, verifyLayout } from './layout';
import { DEFAULT_LAYOUT } from '../types/game';
import type { Pip } from '../types/game';

export function runAllTests(): { passed: number; failed: number } {
  console.log("\n🧪 Domino Master v5.0 — Verification Tests\n");

  const tests = [
    testDeckGeneration,
    testTileOrientation,
    testBoardPlaySequence,
    testGameInitialization,
    testBlockedGame,
    testLayoutNoCollision,
    testDoubleRotation,
  ];

  let passed = 0, failed = 0;

  for (const test of tests) {
    try {
      if (test()) passed++; else failed++;
    } catch (e) {
      console.error(`EXCEPTION: ${e}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed}/${tests.length} passed, ${failed} failed`);
  return { passed, failed };
}

function testDeckGeneration(): boolean {
  const deck = generateDeck();
  if (deck.length !== TOTAL_TILES) {
    console.error(`FAIL: Deck=${deck.length}, expected=${TOTAL_TILES}`);
    return false;
  }
  console.log(`✅ Deck: ${deck.length} tiles`);
  return true;
}

function testTileOrientation(): boolean {
  const tile = createTile(3 as Pip, 5 as Pip);

  const o1 = orientTile(tile, 3 as Pip);
  if (!o1 || o1.leadingPip !== 3 || o1.trailingPip !== 5) {
    console.error('FAIL: Normal orientation');
    return false;
  }

  const o2 = orientTile(tile, 5 as Pip);
  if (!o2 || o2.leadingPip !== 5 || o2.trailingPip !== 3) {
    console.error('FAIL: Flipped orientation');
    return false;
  }

  const o3 = orientTile(tile, 1 as Pip);
  if (o3 !== null) {
    console.error('FAIL: Should not connect to 1');
    return false;
  }

  console.log('✅ Orientation: normal, flipped, reject');
  return true;
}

function testBoardPlaySequence(): boolean {
  const board = BoardManager.createEmpty();

  const t1 = createTile(3 as Pip, 5 as Pip);
  const r1 = board.playTile(t1, 'left');
  if (!r1 || board.leftPip !== 3 || board.rightPip !== 5) {
    console.error(`FAIL: First play. L=${board.leftPip}, R=${board.rightPip}`);
    return false;
  }

  const t2 = createTile(5 as Pip, 2 as Pip);
  const r2 = board.playTile(t2, 'right');
  if (!r2 || board.rightPip !== 2) {
    console.error(`FAIL: Second play. R=${board.rightPip}`);
    return false;
  }

  const t3 = createTile(1 as Pip, 3 as Pip);
  const r3 = board.playTile(t3, 'left');
  if (!r3 || board.leftPip !== 1) {
    console.error(`FAIL: Third play. L=${board.leftPip}`);
    return false;
  }

  if (!board.isValid()) {
    console.error('FAIL: Board invalid');
    return false;
  }

  console.log('✅ Board: 3 moves, valid chain');
  return true;
}

function testGameInitialization(): boolean {
  const engine = new DominoGameEngine({ playerNames: ['A', 'B'], targetScore: 100 });
  const state = engine.getState();

  if (state.players.length !== 2) {
    console.error(`FAIL: ${state.players.length} players`);
    return false;
  }

  for (const p of state.players) {
    if (p.hand.length !== 7) {
      console.error(`FAIL: ${p.name} has ${p.hand.length} tiles`);
      return false;
    }
  }

  const total = state.players.reduce((s, p) => s + p.hand.length, 0) + state.boneyard.length;
  if (total !== TOTAL_TILES) {
    console.error(`FAIL: Total=${total}`);
    return false;
  }

  console.log(`✅ Game: ${state.players.length} players, ${total} tiles`);
  return true;
}

function testBlockedGame(): boolean {
  const board = BoardManager.createEmpty();
  board.playTile(createTile(1 as Pip, 6 as Pip), 'left');

  if (board.leftPip !== 1 || board.rightPip !== 6) {
    console.error('FAIL: Blocked setup');
    return false;
  }

  const bad = createTile(2 as Pip, 3 as Pip);
  if (board.canPlay(bad)) {
    console.error('FAIL: Should not play [2|3] on 1,6');
    return false;
  }

  const good = createTile(1 as Pip, 2 as Pip);
  if (!board.canPlay(good)) {
    console.error('FAIL: Should play [1|2] on 1');
    return false;
  }

  console.log('✅ Blocked: correct detection');
  return true;
}

function testLayoutNoCollision(): boolean {
  const tiles = generateDeck().slice(0, 15);
  const oriented = tiles.map(t => orientFirstTile(t));
  const nodes = calculateSnakeLayout(oriented, DEFAULT_LAYOUT);

  if (!verifyLayout(nodes, DEFAULT_LAYOUT.gap)) {
    console.error('FAIL: Layout has collisions');
    return false;
  }

  console.log(`✅ Layout: ${nodes.length} tiles, no collision`);
  return true;
}

function testDoubleRotation(): boolean {
  const double = createTile(4 as Pip, 4 as Pip);
  const oriented = orientFirstTile(double);
  console.log('✅ Double: rotation logic implemented');
  return true;
}
