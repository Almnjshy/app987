
3s
2s
5s
27s
5s
Run npm run build

> my-app@0.0.0 build
> tsc -b && vite build

Error: src/components/Board.tsx(42,13): error TS2339: Property 'tile' does not exist on type 'DominoTile'.
Error: src/components/Board.tsx(43,23): error TS2339: Property 'tile' does not exist on type 'DominoTile'.
Error: src/components/Board.tsx(44,22): error TS2339: Property 'left' does not exist on type 'DominoTile'.
Error: src/components/Board.tsx(45,23): error TS2339: Property 'right' does not exist on type 'DominoTile'.
Error: src/components/PlayerAvatar.tsx(84,25): error TS2339: Property 'avatar' does not exist on type 'Player'.
Error: src/lib/ai.ts(81,30): error TS2339: Property 'clone' does not exist on type 'BoardManager'.
Error: src/lib/ai.ts(81,44): error TS2339: Property 'clone' does not exist on type 'BoardManager'.
Error: src/lib/index.ts(7,15): error TS2307: Cannot find module './game-engine' or its corresponding type declarations.
Error: src/lib/net.ts(11,3): error TS2305: Module '"@/lib/gameEngine"' has no exported member 'createRound'.
Error: src/lib/net.ts(12,3): error TS2305: Module '"@/lib/gameEngine"' has no exported member 'applyMove'.
Error: src/lib/net.ts(13,3): error TS2305: Module '"@/lib/gameEngine"' has no exported member 'applyDraw'.
Error: src/lib/net.ts(14,3): error TS2305: Module '"@/lib/gameEngine"' has no exported member 'applyPass'.
Error: src/lib/net.ts(15,3): error TS2305: Module '"@/lib/gameEngine"' has no exported member 'canDraw'.
Error: src/lib/net.ts(16,3): error TS2305: Module '"@/lib/gameEngine"' has no exported member 'canPass'.
Error: src/lib/net.ts(17,3): error TS2305: Module '"@/lib/gameEngine"' has no exported member 'roundStatus'.
Error: src/lib/net.ts(18,3): error TS2305: Module '"@/lib/gameEngine"' has no exported member 'legalMoves'.
Error: src/lib/net.ts(292,7): error TS4104: The type 'readonly DominoTile[]' is 'readonly' and cannot be assigned to the mutable type 'DominoTile[]'.
Error: src/lib/net.ts(301,7): error TS4104: The type 'readonly ChainTile[]' is 'readonly' and cannot be assigned to the mutable type 'ChainTile[]'.
Error: src/lib/snakeLayout.ts(147,39): error TS2339: Property 'side' does not exist on type 'ChainTile'.
Error: src/lib/snakeLayout.ts(148,46): error TS2339: Property 'side' does not exist on type 'ChainTile'.
Error: src/lib/snakeLayout.ts(149,45): error TS2339: Property 'side' does not exist on type 'ChainTile'.
Error: src/lib/tests.ts(6,34): error TS2307: Cannot find module './game-engine' or its corresponding type declarations.
Error: src/lib/tests.ts(13,46): error TS2459: Module '"./layout"' declares 'DEFAULT_LAYOUT' locally, but it is not exported.
Error: src/lib/tests.ts(90,14): error TS2367: This comparison appears to be unintentional because the types '5' and '2' have no overlap.
Error: src/lib/tests.ts(97,14): error TS2367: This comparison appears to be unintentional because the types '3' and '1' have no overlap.
Error: src/lib/tile.ts(6,47): error TS2307: Cannot find module './game' or its corresponding type declarations.
Error: src/screens/GameScreen.tsx(3,15): error TS2305: Module '"@/store/gameStore"' has no exported member 'SavedGame'.
Error: src/screens/GameScreen.tsx(4,34): error TS2307: Cannot find module '@/lib/gameengine' or its corresponding type declarations.
Error: src/screens/GameScreen.tsx(42,5): error TS2339: Property 'setPlayers' does not exist on type 'GameStore'.
Error: src/screens/GameScreen.tsx(44,5): error TS2339: Property 'setMatch' does not exist on type 'GameStore'.
Error: src/screens/GameScreen.tsx(46,5): error TS2339: Property 'setMatchScores' does not exist on type 'GameStore'.
Error: src/screens/GameScreen.tsx(47,5): error TS2339: Property 'setRoundWinner' does not exist on type 'GameStore'.
Error: src/screens/GameScreen.tsx(49,5): error TS2339: Property 'setMatchWinner' does not exist on type 'GameStore'.
Error: src/screens/GameScreen.tsx(59,5): error TS2339: Property 'setHasSavedGame' does not exist on type 'GameStore'.
Error: src/screens/GameScreen.tsx(195,43): error TS2339: Property 'avatar' does not exist on type 'Player'.
Error: src/screens/GameScreen.tsx(238,25): error TS2339: Property 'isHuman' does not exist on type 'Player'.
Error: src/screens/GameScreen.tsx(241,37): error TS2554: Expected 1 arguments, but got 3.
Error: src/screens/GameScreen.tsx(549,28): error TS2339: Property 'tiles' does not exist on type 'Player'.
Error: src/screens/GameScreen.tsx(624,30): error TS2339: Property 'tileCount' does not exist on type 'Player'.
Error: src/screens/GameScreen.tsx(649,37): error TS2339: Property 'tiles' does not exist on type 'Player'.
Error: src/screens/GameScreen.tsx(663,27): error TS2339: Property 'tiles' does not exist on type 'Player'.
Error: src/screens/MatchEndScreen.tsx(21,53): error TS2339: Property 'isHuman' does not exist on type 'Player'.
Error: src/screens/NetworkGame.tsx(215,11): error TS2322: Type 'ChainTile[]' is not assignable to type 'DominoTile[]'.
  Type 'ChainTile' is missing the following properties from type 'DominoTile': id, top, bottom, isDouble, value
Error: src/store/gameStore.ts(7,34): error TS2307: Cannot find module '@/lib/game-engine' or its corresponding type declarations.
Error: src/store/gameStore.ts(69,3): error TS2300: Duplicate identifier 'currentScreen'.
Error: src/store/gameStore.ts(84,3): error TS2300: Duplicate identifier 'currentScreen'.
Error: src/types/game.ts(146,13): error TS2300: Duplicate identifier 'Difficulty'.
Error: src/types/game.ts(263,13): error TS2300: Duplicate identifier 'Difficulty'.
Error: Process completed with exit code 2