export interface Tile {
  id: string;
  top: number;
  bottom: number;
  isDouble: boolean;
  total: number;
}

export interface PlacedTile {
  tile: Tile;
  x: number;
  y: number;
  rotation: number;
  connectLeft: number;
  connectRight: number;
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
  | 'tutorial';

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

export const DIFFICULTY_SETTINGS: Record<Difficulty, { thinkTimeMin: number; thinkTimeMax: number; mistakeRate: number; strategy: string }> = {
  veryEasy: { thinkTimeMin: 2000, thinkTimeMax: 3000, mistakeRate: 0.3, strategy: 'random' },
  easy: { thinkTimeMin: 2000, thinkTimeMax: 3000, mistakeRate: 0.2, strategy: 'basic' },
  medium: { thinkTimeMin: 3000, thinkTimeMax: 4000, mistakeRate: 0.1, strategy: 'counting' },
  hard: { thinkTimeMin: 4000, thinkTimeMax: 5000, mistakeRate: 0.05, strategy: 'tracking' },
  veryHard: { thinkTimeMin: 5000, thinkTimeMax: 6000, mistakeRate: 0.02, strategy: 'advanced' },
  expert: { thinkTimeMin: 6000, thinkTimeMax: 7000, mistakeRate: 0, strategy: 'perfect' },
  champion: { thinkTimeMin: 7000, thinkTimeMax: 8000, mistakeRate: 0, strategy: 'champion' },
};
