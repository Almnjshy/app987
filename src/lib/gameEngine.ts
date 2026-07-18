import type { Tile, Player, PlacedTile } from '@/types/game';

let tileIdCounter = 0;

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

export function dealTiles(tiles: Tile[], playerCount: number, tilesPerPlayer: number): {
  hands: Tile[][];
  boneyard: Tile[];
} {
  const shuffled = shuffleTiles(tiles);
  const hands: Tile[][] = [];
  let idx = 0;
  for (let p = 0; p < playerCount; p++) {
    hands.push(shuffled.slice(idx, idx + tilesPerPlayer));
    idx += tilesPerPlayer;
  }
  return { hands, boneyard: shuffled.slice(idx) };
}

export function findHighestDouble(tiles: Tile[]): Tile | null {
  let highest: Tile | null = null;
  for (const tile of tiles) {
    if (tile.isDouble) {
      if (!highest || tile.top > highest.top) {
        highest = tile;
      }
    }
  }
  return highest;
}

export function findLowestTotal(tiles: Tile[]): Tile {
  let lowest = tiles[0];
  for (const tile of tiles) {
    if (tile.total < lowest.total) {
      lowest = tile;
    }
  }
  return lowest;
}

export function determineFirstPlayer(players: Player[]): number {
  let highestDoublePlayer = -1;
  let highestDoubleValue = -1;

  for (let i = 0; i < players.length; i++) {
    for (const tile of players[i].tiles) {
      if (tile.isDouble && tile.top > highestDoubleValue) {
        highestDoubleValue = tile.top;
        highestDoublePlayer = i;
      }
    }
  }

  if (highestDoublePlayer >= 0) {
    return highestDoublePlayer;
  }

  let lowestTotal = Infinity;
  let lowestPlayer = 0;
  for (let i = 0; i < players.length; i++) {
    const total = players[i].tiles.reduce((sum, t) => sum + t.total, 0);
    if (total < lowestTotal) {
      lowestTotal = total;
      lowestPlayer = i;
    }
  }
  return lowestPlayer;
}

export function getPlayableTiles(playerTiles: Tile[], boardTiles: PlacedTile[]): Tile[] {
  if (boardTiles.length === 0) return playerTiles;

  const leftEnd = boardTiles[0].connectLeft;
  const rightEnd = boardTiles[boardTiles.length - 1].connectRight;

  return playerTiles.filter(
    (tile) => tile.top === leftEnd || tile.bottom === leftEnd ||
              tile.top === rightEnd || tile.bottom === rightEnd
  );
}

export function canPlayTile(tile: Tile, boardTiles: PlacedTile[]): boolean {
  if (boardTiles.length === 0) return true;
  const leftEnd = boardTiles[0].connectLeft;
  const rightEnd = boardTiles[boardTiles.length - 1].connectRight;
  return tile.top === leftEnd || tile.bottom === leftEnd ||
         tile.top === rightEnd || tile.bottom === rightEnd;
}

export function getPlayableEnds(boardTiles: PlacedTile[]): { left: number; right: number } {
  if (boardTiles.length === 0) return { left: -1, right: -1 };
  return {
    left: boardTiles[0].connectLeft,
    right: boardTiles[boardTiles.length - 1].connectRight,
  };
}

export function placeTileOnBoard(
  tile: Tile,
  boardTiles: PlacedTile[],
  side: 'left' | 'right'
): PlacedTile[] {
  const newBoard = [...boardTiles];

  if (newBoard.length === 0) {
    newBoard.push({
      tile,
      x: 0,
      y: 0,
      rotation: tile.isDouble ? 0 : 90,
      connectLeft: tile.top,
      connectRight: tile.bottom,
    });
    return newBoard;
  }

  if (side === 'left') {
    const leftEnd = newBoard[0].connectLeft;
    let connectLeft: number, connectRight: number, rotation: number;

    if (tile.top === leftEnd) {
      connectLeft = tile.bottom;
      connectRight = tile.top;
      rotation = tile.isDouble ? 0 : 90;
    } else {
      connectLeft = tile.top;
      connectRight = tile.bottom;
      rotation = tile.isDouble ? 0 : 90;
    }

    newBoard.unshift({
      tile,
      x: newBoard[0].x - 80,
      y: 0,
      rotation,
      connectLeft,
      connectRight,
    });
  } else {
    const rightEnd = newBoard[newBoard.length - 1].connectRight;
    let connectLeft: number, connectRight: number, rotation: number;

    if (tile.top === rightEnd) {
      connectLeft = tile.top;
      connectRight = tile.bottom;
      rotation = tile.isDouble ? 0 : 90;
    } else {
      connectLeft = tile.bottom;
      connectRight = tile.top;
      rotation = tile.isDouble ? 0 : 90;
    }

    newBoard.push({
      tile,
      x: newBoard[newBoard.length - 1].x + 80,
      y: 0,
      rotation,
      connectLeft,
      connectRight,
    });
  }

  return newBoard;
}

export function getValidSides(tile: Tile, boardTiles: PlacedTile[]): ('left' | 'right')[] {
  if (boardTiles.length === 0) return ['left'];

  const { left, right } = getPlayableEnds(boardTiles);
  const sides: ('left' | 'right')[] = [];

  if (tile.top === left || tile.bottom === left) sides.push('left');
  if (tile.top === right || tile.bottom === right) sides.push('right');

  return sides;
}

export function calculateHandValue(tiles: Tile[]): number {
  return tiles.reduce((sum, tile) => sum + tile.total, 0);
}

export function calculateRoundWinner(players: Player[]): { winnerIndex: number; points: number } {
  let winnerIndex = -1;
  let minTiles = Infinity;

  for (let i = 0; i < players.length; i++) {
    if (players[i].tiles.length === 0) {
      winnerIndex = i;
      break;
    }
    if (players[i].tiles.length < minTiles) {
      minTiles = players[i].tiles.length;
      winnerIndex = i;
    }
  }

  let points = 0;
  for (let i = 0; i < players.length; i++) {
    if (i !== winnerIndex) {
      points += calculateHandValue(players[i].tiles);
    }
  }

  return { winnerIndex, points };
}

export function isGameBlocked(players: Player[], boneyard: Tile[]): boolean {
  if (boneyard.length > 0) return false;

  const { left, right } = getPlayableEndsFromPlayers(players);
  if (left === -1) return false;

  for (const player of players) {
    for (const tile of player.tiles) {
      if (canPlayTile(tile, [{ tile, x: 0, y: 0, rotation: 0, connectLeft: left, connectRight: right }])) {
        return false;
      }
    }
  }
  return true;
}

function getPlayableEndsFromPlayers(players: Player[]): { left: number; right: number } {
  if (players.length === 0 || players[0].tiles.length === 0) return { left: -1, right: -1 };
  return { left: 0, right: 0 };
}

export function aiSelectTile(
  playerTiles: Tile[],
  boardTiles: PlacedTile[],
  difficulty: string,
  _allPlayedTiles?: Set<string>
): { tile: Tile; side: 'left' | 'right' } | null {
  const playable = getPlayableTiles(playerTiles, boardTiles);
  if (playable.length === 0) return null;

  const settings = {
    random: () => playable[Math.floor(Math.random() * playable.length)],
    basic: () => {
      const doubles = playable.filter((t) => t.isDouble);
      if (doubles.length > 0) return doubles[Math.floor(Math.random() * doubles.length)];
      return playable[Math.floor(Math.random() * playable.length)];
    },
    counting: () => {
      let best = playable[0];
      let bestScore = -Infinity;
      for (const tile of playable) {
        let score = tile.total;
        if (tile.isDouble) score += 3;
        const remaining = playerTiles.filter((t) => t.id !== tile.id);
        const versatility = remaining.filter(
          (t) => t.top === tile.top || t.bottom === tile.top ||
                 t.top === tile.bottom || t.bottom === tile.bottom
        ).length;
        score += versatility * 2;
        if (score > bestScore) {
          bestScore = score;
          best = tile;
        }
      }
      return best;
    },
    tracking: () => {
      let best = playable[0];
      let bestScore = -Infinity;
      for (const tile of playable) {
        let score = tile.total;
        if (tile.isDouble) score += 5;
        const sides = getValidSides(tile, boardTiles);
        if (sides.length === 2) score += 3;
        const remaining = playerTiles.filter((t) => t.id !== tile.id);
        const versatility = remaining.filter(
          (t) => t.top === tile.top || t.bottom === tile.top ||
                 t.top === tile.bottom || t.bottom === tile.bottom
        ).length;
        score += versatility * 3;
        if (score > bestScore) {
          bestScore = score;
          best = tile;
        }
      }
      return best;
    },
    advanced: () => {
      return settings.tracking();
    },
    perfect: () => {
      return settings.tracking();
    },
    champion: () => {
      return settings.tracking();
    },
  };

  const strategy = settings[difficulty as keyof typeof settings] || settings.random;
  const selected = strategy();

  const sides = getValidSides(selected, boardTiles);
  const side = sides[Math.floor(Math.random() * sides.length)];

  return { tile: selected, side };
}

export function formatScore(score: number): string {
  return score.toLocaleString('ar-SA');
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
