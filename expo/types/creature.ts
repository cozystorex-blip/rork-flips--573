export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface Creature {
  id: string;
  name: string;
  scientificName: string;
  category: CreatureCategory;
  rarity: Rarity;
  description: string;
  habitat: string;
  funFact: string;
  imageUrl: string;
  xpReward: number;
  scannedAt: string;
  location?: string;
}

export type CreatureCategory = 'mammal' | 'bird' | 'reptile' | 'amphibian' | 'insect' | 'marine' | 'arachnid';

export interface UserStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalScans: number;
  uniqueCreatures: number;
  currentStreak: number;
  longestStreak: number;
  favoriteCategory: CreatureCategory | null;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  xpReward: number;
  completed: boolean;
}
