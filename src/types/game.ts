export interface Tile {
  id: string;
  top: number;
  bottom: number;
  isDouble: boolean;
  total: number;
}

/** قطعة موضوعة على السلسلة مع اتجاهها الحقيقي (left = قيمة الطرف الأيسر). */
export interface ChainTile {
  tile: Tile;
  left: number;
  right: number;
  /** الطرف الذي أُضيفت منه (null للقطعة الأولى) */
  side: 'left' | 'right' | null;
}

export type EndSide = 'left' | 'right';

export interface Move {
  tileId: string;
  side: EndSide;
}

export type GameVariant = 'block' | 'draw';

export type AILevel = 'easy' | 'medium' | 'hard';

export interface RoundResult {
  winnerIndex: number;
  points: number;
  reason: 'domino' | 'blocked';
}

/** حالة الجولة — قابلة للتسلسل (JSON) للحفظ والمزامنة الشبكية. */
export interface MatchState {
  playerCount: number;
  variant: GameVariant;
  hands: Tile[][];
  chain: ChainTile[];
  boneyard: Tile[];
  currentPlayer: number;
  consecutivePasses: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHuman: boolean;
  tiles: Tile[];
  score: number;
  isActive: boolean;
  tileCount: number;
}

export type ScreenType =
  | 'title'
  | 'menu'
  | 'levelSelect'
  | 'playing'
  | 'paused'
  | 'matchEnd'
  | 'settings'
  | 'statistics'
  | 'tutorial'
  | 'networkLobby'
  | 'networkGame';

export type Difficulty = 'veryEasy' | 'easy' | 'medium' | 'hard' | 'veryHard' | 'expert' | 'champion';

export interface LevelConfig {
  level: number;
  name: string;
  nameAr: string;
  targetScore: number;
  aiCount: number;
  aiDifficulty: Difficulty;
  description: string;
  descriptionAr: string;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  language: 'ar' | 'en';
}

export interface GameProgress {
  unlockedLevel: number;
  levelStars: Record<number, number>;
  totalScore: number;
  totalWins: number;
  totalLosses: number;
  longestChain: number;
  highestScore: number;
}

export type PowerUpType = 'peek' | 'undo' | 'extraTime' | 'hint';

export interface PowerUp {
  type: PowerUpType;
  name: string;
  nameAr: string;
  icon: string;
  uses: number;
  maxUses: number;
}

export type GameMode = 'ai' | 'network' | 'tournament' | 'online';

export const LEVELS: LevelConfig[] = [
  { level: 1, name: 'First Steps', nameAr: 'الخطوات الأولى', targetScore: 50, aiCount: 1, aiDifficulty: 'veryEasy', description: 'Learn the basics', descriptionAr: 'تعلم الأساسيات' },
  { level: 2, name: 'Apprentice', nameAr: 'المبتدئ', targetScore: 60, aiCount: 1, aiDifficulty: 'easy', description: 'Standard play', descriptionAr: 'لعب قياسي' },
  { level: 3, name: 'Rising Star', nameAr: 'النجم الصاعد', targetScore: 70, aiCount: 2, aiDifficulty: 'easy', description: '3-player game', descriptionAr: 'لعب 3 لاعبين' },
  { level: 4, name: 'Challenger', nameAr: 'المتحدي', targetScore: 80, aiCount: 2, aiDifficulty: 'medium', description: 'Tougher opponents', descriptionAr: 'خصوم أقوى' },
  { level: 5, name: 'Semi-Pro', nameAr: 'نصف محترف', targetScore: 100, aiCount: 3, aiDifficulty: 'medium', description: '4-player game', descriptionAr: 'لعب 4 لاعبين' },
  { level: 6, name: 'Professional', nameAr: 'المحترف', targetScore: 100, aiCount: 3, aiDifficulty: 'hard', description: 'Smarter AI', descriptionAr: 'ذكاء اصطناعي أذكى' },
  { level: 7, name: 'Expert', nameAr: 'الخبير', targetScore: 150, aiCount: 3, aiDifficulty: 'hard', description: 'Longer match', descriptionAr: 'مباراة أطول' },
  { level: 8, name: 'Master', nameAr: 'الماستر', targetScore: 150, aiCount: 3, aiDifficulty: 'veryHard', description: 'Elite opponents', descriptionAr: 'خصوم نخبة' },
  { level: 9, name: 'Grandmaster', nameAr: 'الغراند ماستر', targetScore: 200, aiCount: 3, aiDifficulty: 'expert', description: 'Marathon match', descriptionAr: 'مباراة ماراثونية' },
  { level: 10, name: 'Domino King', nameAr: 'ملك الدومينو', targetScore: 200, aiCount: 3, aiDifficulty: 'champion', description: 'Ultimate challenge', descriptionAr: 'التحدي الأخير' },
];

export const AI_NAMES = ['أحمد', 'سامي', 'خالد', 'عمر', 'فهد', 'ناصر', 'سعد', 'ماجد'];
export const AI_NAMES_EN = ['Ahmed', 'Sami', 'Khaled', 'Omar', 'Fahd', 'Nasser', 'Saad', 'Majid'];

/** ربط مستويات الصعوبة بمستويات الذكاء الثلاثة في المحرك */
export const DIFFICULTY_AI_LEVEL: Record<Difficulty, AILevel> = {
  veryEasy: 'easy',
  easy: 'easy',
  medium: 'medium',
  hard: 'medium',
  veryHard: 'hard',
  expert: 'hard',
  champion: 'hard',
};

export const DIFFICULTY_SETTINGS: Record<Difficulty, { thinkTimeMin: number; thinkTimeMax: number; aiLevel: AILevel }> = {
  veryEasy: { thinkTimeMin: 900, thinkTimeMax: 1600, aiLevel: 'easy' },
  easy: { thinkTimeMin: 900, thinkTimeMax: 1600, aiLevel: 'easy' },
  medium: { thinkTimeMin: 1100, thinkTimeMax: 1900, aiLevel: 'medium' },
  hard: { thinkTimeMin: 1200, thinkTimeMax: 2100, aiLevel: 'medium' },
  veryHard: { thinkTimeMin: 1300, thinkTimeMax: 2300, aiLevel: 'hard' },
  expert: { thinkTimeMin: 1400, thinkTimeMax: 2400, aiLevel: 'hard' },
  champion: { thinkTimeMin: 1500, thinkTimeMax: 2500, aiLevel: 'hard' },
};
