import { CategoryType, ExpenseCategoryType } from '@/types';

export const CategoryIconImages: Record<CategoryType, string> = {
  budget: 'https://r2-pub.rork.com/generated-images/909bef23-7a7d-485a-beac-698a873a0612.png',
  healthy: 'https://r2-pub.rork.com/generated-images/0322d2c9-68f5-4a29-95de-5d76eef19645.png',
  bulk: 'https://r2-pub.rork.com/generated-images/e791775a-d9e6-489b-981c-acf256ed4f5b.png',
  deals: 'https://r2-pub.rork.com/generated-images/0ce7598e-fb0e-4820-9164-660761556beb.png',
};

export const CategoryColors: Record<CategoryType, string> = {
  budget: '#34D399',
  healthy: '#60A5FA',
  bulk: '#A78BFA',
  deals: '#FBBF24',
};

export const CategoryColorsDark: Record<CategoryType, string> = {
  budget: '#059669',
  healthy: '#2563EB',
  bulk: '#7C3AED',
  deals: '#D97706',
};

export const ExpenseCategoryColors: Record<ExpenseCategoryType, string> = {
  food: '#22C55E',
  grocery: '#F59E0B',
  transport: '#3B82F6',
  utility_bills: '#F97316',
  shopping: '#EC4899',
  home: '#14B8A6',
  subscriptions: '#A855F7',
  other: '#9CA3AF',
};

export const ExpenseCategoryIcons: Record<ExpenseCategoryType, string> = {
  food: 'UtensilsCrossed',
  grocery: 'ShoppingCart',
  transport: 'Car',
  utility_bills: 'Zap',
  shopping: 'ShoppingBag',
  home: 'Home',
  subscriptions: 'Tv',
  other: 'MoreHorizontal',
};

const Colors = {
  background: '#0A0A0A',
  backgroundSubtle: '#111111',
  card: '#1A1A1A',
  cardMuted: '#141414',
  text: '#F5F5F5',
  textSecondary: '#A0A0A0',
  textTertiary: '#666666',
  border: '#2A2A2A',
  borderDark: '#333333',
  accent: '#22C55E',
  accentLight: '#22C55E18',
  accentSoft: '#22C55E22',
  destructive: '#EF4444',
  success: '#22C55E',
  shadow: '#000000',
  headerBg: '#0A0A0A',
  tabBarBg: '#0F0F0F',
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 2,
  } as const,
  cardShadowStrong: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 4,
  } as const,
  radius: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 24,
  } as const,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  } as const,
  chip: {
    height: 32,
    paddingH: 14,
    radius: 16,
    fontSize: 13,
  } as const,
  iconBadge: {
    size: 28,
    radius: 8,
    iconSize: 14,
  } as const,
};

export const iosSystemColors = {
  separator: '#2A2A2A',
  separatorLight: '#222222',
  groupedBackground: '#0A0A0A',
  secondaryGroupedBackground: '#1A1A1A',
  tertiaryGroupedBackground: '#141414',
  label: '#F5F5F5',
  secondaryLabel: '#A0A0A0',
  tertiaryLabel: '#666666',
  quaternaryLabel: '#444444',
  systemGreen: '#22C55E',
  systemRed: '#EF4444',
  systemBlue: '#3B82F6',
  systemOrange: '#F59E0B',
  systemYellow: '#EAB308',
} as const;

export default Colors;
