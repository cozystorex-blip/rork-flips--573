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
  background: '#E8F1F8',
  backgroundSubtle: '#E8F1F8',
  card: '#FFFFFF',
  cardMuted: '#F0F5FA',
  text: '#0D1B2A',
  textSecondary: '#3A4F65',
  textTertiary: '#7A8FA3',
  border: '#D0DDE8',
  borderDark: '#B8C9D9',
  accent: '#0066CC',
  accentLight: '#0066CC12',
  accentSoft: '#0066CC1A',
  destructive: '#E53935',
  success: '#0066CC',
  shadow: '#000000',
  headerBg: '#E8F1F8',
  tabBarBg: '#FFFFFF',
  cardShadow: {
    shadowColor: '#4A6FA5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  } as const,
  cardShadowStrong: {
    shadowColor: '#4A6FA5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
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
  separator: '#C6C6C8',
  separatorLight: '#E5E5EA',
  groupedBackground: '#F2F2F7',
  secondaryGroupedBackground: '#FFFFFF',
  tertiaryGroupedBackground: '#F2F2F7',
  label: '#000000',
  secondaryLabel: '#3C3C43',
  tertiaryLabel: '#3C3C4399',
  quaternaryLabel: '#3C3C432E',
  systemGreen: '#34C759',
  systemRed: '#FF3B30',
  systemBlue: '#007AFF',
  systemOrange: '#FF9500',
  systemYellow: '#FFCC00',
} as const;

export default Colors;
