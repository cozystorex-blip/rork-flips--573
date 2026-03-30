import type { CategoryType } from '@/types/grocery';

const Colors = {
  text: '#1C1C1E',
  textSecondary: '#555558',
  textTertiary: '#8E8E93',
  background: '#F2F2F7',
  card: '#FFFFFF',
  border: '#D1D1D6',
  shadow: '#1A1A2E',
  headerBg: '#FFFFFF',
  headerShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  } as const,
  cardShadow: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  } as const,
  destructive: '#FF3B30',
  accent: '#16A34A',
  light: {
    text: '#000',
    background: '#fff',
    tint: '#2f95dc',
    tabIconDefault: '#ccc',
    tabIconSelected: '#2f95dc',
  },
};

export const CategoryColors: Record<CategoryType, string> = {
  budget: '#16A34A',
  healthy: '#F97316',
  bulk: '#8B5CF6',
  deals: '#EF4444',
};

export const ExpenseCategoryColors: Record<string, string> = {
  groceries: '#16A34A',
  dining: '#F97316',
  transport: '#3B82F6',
  utilities: '#8B5CF6',
  entertainment: '#EC4899',
  shopping: '#EF4444',
  health: '#14B8A6',
  other: '#6B7280',
};

export default Colors;
