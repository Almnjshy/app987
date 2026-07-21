/**
 * Domino Master v5.0 — Snake Layout Engine
 * تخطيط الثعبان مع كشف التصادم ومسافة ثابتة
 *
 * Rules:
 * - No overlapping
 * - Fixed GAP between all tiles
 * - Doubles perpendicular to row direction
 * - Only 2 open ends (head & tail), no side branches
 */

import { OrientedTile, BoardPosition, LayoutConfig, DEFAULT_LAYOUT } from '../types/game';

export type Direction = 'right' | 'down' | 'left' | 'up';

export interface LayoutNode {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly direction: Direction;
  readonly tile: OrientedTile;
  readonly rotation: number;
  readonly width: number;
  readonly height: number;
}

interface BoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

// ============================================
// COLLISION DETECTION
// ============================================

function getRotatedBounds(node: LayoutNode): BoundingBox {
  const halfW = node.width / 2;
  const halfH = node.height / 2;

  const corners = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ];

  const rad = (node.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const rotated = corners.map(c => ({
    x: node.x + (c.x * cos - c.y * sin),
    y: node.y + (c.x * sin + c.y * cos),
  }));

  const xs = rotated.map(c => c.x);
  const ys = rotated.map(c => c.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function checkCollision(a: BoundingBox, b: BoundingBox, gap: number): boolean {
  const expandedA = {
    minX: a.minX - gap,
    minY: a.minY - gap,
    maxX: a.maxX + gap,
    maxY: a.maxY + gap,
  };

  return !(
    expandedA.maxX < b.minX ||
    expandedA.minX > b.maxX ||
    expandedA.maxY < b.minY ||
    expandedA.minY > b.maxY
  );
}

function checkCollisionWithAll(node: LayoutNode, existing: LayoutNode[], gap: number): boolean {
  const boundsA = getRotatedBounds(node);
  for (const other of existing) {
    const boundsB = getRotatedBounds(other);
    if (checkCollision(boundsA, boundsB, gap)) return true;
  }
  return false;
}

// ============================================
// ROTATION & DIMENSIONS
// ============================================

function getNextDirection(current: Direction): Direction {
  const dirs: Direction[] = ['right', 'down', 'left', 'up'];
  return dirs[(dirs.indexOf(current) + 1) % 4];
}

function calculateRotation(direction: Direction, isDouble: boolean): number {
  const baseRotation: Record<Direction, number> = { right: 0, down: 90, left: 180, up: 270 };
  const base = baseRotation[direction];
  if (isDouble) return (base + 90) % 360;
  return base;
}

function calculateVisualDimensions(
  isDouble: boolean,
  direction: Direction,
  tileWidth: number,
  tileHeight: number,
): { width: number; height: number } {
  if (isDouble) {
    return { width: tileHeight, height: tileWidth };
  }
  if (direction === 'right' || direction === 'left') {
    return { width: tileWidth, height: tileHeight };
  }
  return { width: tileHeight, height: tileWidth };
}

// ============================================
// STEP CALCULATION
// ============================================

function calculateStep(
  direction: Direction,
  config: LayoutConfig,
  isDouble: boolean,
): { dx: number; dy: number } {
  const { tileWidth, tileHeight, gap } = config;
  const dims = calculateVisualDimensions(isDouble, direction, tileWidth, tileHeight);

  const stepX = direction === 'right' ? (dims.width + gap) :
                direction === 'left' ? -(dims.width + gap) : 0;
  const stepY = direction === 'down' ? (dims.height + gap) :
                direction === 'up' ? -(dims.height + gap) : 0;

  return { dx: stepX, dy: stepY };
}

// ============================================
// MAIN LAYOUT ENGINE
// ============================================

export function calculateSnakeLayout(
  tiles: OrientedTile[],
  config: LayoutConfig = DEFAULT_LAYOUT,
): LayoutNode[] {
  const nodes: LayoutNode[] = [];

  let x = config.viewportWidth / 2;
  let y = config.viewportHeight / 2;
  let direction: Direction = 'right';
  let row = 0;
  let col = 0;

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    const isDouble = tile.isDouble;

    const rotation = calculateRotation(direction, isDouble);
    const { width, height } = calculateVisualDimensions(isDouble, direction, config.tileWidth, config.tileHeight);

    const node: LayoutNode = {
      index: i,
      x, y,
      direction,
      tile,
      rotation,
      width,
      height,
    };

    if (checkCollisionWithAll(node, nodes, config.gap)) {
      const turnResult = tryTurn(nodes, tile, config, direction, x, y);
      if (turnResult) {
        nodes.push(turnResult.node);
        x = turnResult.nextX;
        y = turnResult.nextY;
        direction = turnResult.nextDirection;
        row++;
        col = 0;
        continue;
      }

      const scaled = tryScaleDown(node, nodes, config);
      if (scaled) {
        nodes.push(scaled);
      } else {
        console.warn(`Cannot place tile ${i} without collision`);
        break;
      }
    } else {
      nodes.push(node);
    }

    const step = calculateStep(direction, config, isDouble);
    const nextX = x + step.dx;
    const nextY = y + step.dy;

    const isAtEdge =
      (direction === 'right' && nextX + width / 2 > config.viewportWidth - config.gap) ||
      (direction === 'down' && nextY + height / 2 > config.viewportHeight - config.gap) ||
      (direction === 'left' && nextX - width / 2 < config.gap) ||
      (direction === 'up' && nextY - height / 2 < config.gap);

    const isMaxLength = col >= config.maxRowLength - 1;

    if (isAtEdge || isMaxLength) {
      direction = getNextDirection(direction);
      row++;
      col = 0;

      const turnStep = calculateStep(direction, config, isDouble);
      x += step.dx + turnStep.dx;
      y += step.dy + turnStep.dy;
    } else {
      x = nextX;
      y = nextY;
      col++;
    }
  }

  return nodes;
}

// ============================================
// HELPERS
// ============================================

function tryTurn(
  existingNodes: LayoutNode[],
  tile: OrientedTile,
  config: LayoutConfig,
  currentDirection: Direction,
  currentX: number,
  currentY: number,
): { node: LayoutNode; nextX: number; nextY: number; nextDirection: Direction } | null {

  const nextDirection = getNextDirection(currentDirection);
  const isDouble = tile.isDouble;

  const rotation = calculateRotation(nextDirection, isDouble);
  const { width, height } = calculateVisualDimensions(isDouble, nextDirection, config.tileWidth, config.tileHeight);

  const currentStep = calculateStep(currentDirection, config, isDouble);
  const nextStep = calculateStep(nextDirection, config, isDouble);

  const newX = currentX + currentStep.dx + nextStep.dx;
  const newY = currentY + currentStep.dy + nextStep.dy;

  const node: LayoutNode = {
    index: existingNodes.length,
    x: newX, y: newY,
    direction: nextDirection,
    tile,
    rotation,
    width, height,
  };

  if (!checkCollisionWithAll(node, existingNodes, config.gap)) {
    return {
      node,
      nextX: newX + nextStep.dx,
      nextY: newY + nextStep.dy,
      nextDirection,
    };
  }

  return null;
}

function tryScaleDown(
  originalNode: LayoutNode,
  existingNodes: LayoutNode[],
  config: LayoutConfig,
): LayoutNode | null {
  const scales = [0.9, 0.8, 0.7, 0.6];

  for (const scale of scales) {
    const scaledNode: LayoutNode = {
      ...originalNode,
      width: originalNode.width * scale,
      height: originalNode.height * scale,
    };

    if (!checkCollisionWithAll(scaledNode, existingNodes, config.gap)) {
      return scaledNode;
    }
  }

  return null;
}

// ============================================
// VERIFICATION
// ============================================

export function verifyLayout(nodes: LayoutNode[], gap: number): boolean {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const boundsA = getRotatedBounds(nodes[i]);
      const boundsB = getRotatedBounds(nodes[j]);
      if (checkCollision(boundsA, boundsB, gap)) {
        console.error(`Collision: tile ${i} and tile ${j}`);
        return false;
      }
    }
  }
  console.log(`✅ Verified: ${nodes.length} tiles, gap=${gap}px, no collisions`);
  return true;
}

export function toBoardPositions(nodes: LayoutNode[]): BoardPosition[] {
  return nodes.map(n => ({
    x: n.x,
    y: n.y,
    rotation: n.rotation,
    tile: n.tile,
    index: n.index,
    width: n.width,
    height: n.height,
  }));
}
