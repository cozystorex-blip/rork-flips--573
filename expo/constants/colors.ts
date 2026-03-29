import { CategoryType, ExpenseCategoryType } from '@/types';

export const CategoryIconImages: Record<CategoryType, string> = {
  budget: 'https://r2-pub.rork.com/generated-images/909bef23-7a7d-485a-beac-698a873a0612.png',
  healthy: 'https://r2-pub.rork.com/generated-images/0322d2c9-68f5-4a29-95de-5d76eef19645.png',
  bulk: 'https://r2-pub.rork.com/generated-images/e791775a-d9e6-489b-981c-acf256ed4f5b.png',
  deals: 'https://r2-pub.rork.com/generated-images/0ce7598e-fb0e-4820-9164-660761556beb.png',
};

export const CategoryColors: Record<CategoryType, string> = {
  budget: '#34C759',
  healthy: '#007AFF',
  bulk: '#AF52DE',
  deals: '#FF9500',
};

export const CategoryColorsDark: Record<CategoryType, string> = {
  budget: '#30D158',
  healthy: '#0A84FF',
  bulk: '#BF5AF2',
  deals: '#FF9F0A',
};

export const ExpenseCategoryColors: Record<ExpenseCategoryType, string> = {
  food: '#34C759',
  grocery: '#FF9500',
  transport: '#007AFF',
  utility_bills: '#FF3B30',
  shopping: '#FF2D55',
  home: '#5AC8FA',
  subscriptions: '#AF52DE',
  other: '#8E8E93',
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
  background: '#000000',
  backgroundSubtle: '#1C1C1E',
  card: '#1C1C1E',
  cardMuted: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',
  border: '#38383A',
  borderDark: '#2C2C2E',
  accent: '#34C759',
  accentLight: '#34C75920',
  accentSoft: '#34C75915',
  destructive: '#FF3B30',
  success: '#34C759',
  shadow: '#000000',
  headerBg: '#000000',
  tabBarBg: '#1C1C1E',
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 1,
  } as const,
  cardShadowStrong: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  } as const,
  radius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
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
  separator: '#38383A',
  separatorLight: '#2C2C2E',
  groupedBackground: '#000000',
  secondaryGroupedBackground: '#1C1C1E',
  tertiaryGroupedBackground: '#2C2C2E',
  label: '#FFFFFF',
  secondaryLabel: '#8E8E93',
  tertiaryLabel: '#636366',
  quaternaryLabel: '#48484A',
  systemGreen: '#34C759',
  systemRed: '#FF3B30',
  systemBlue: '#007AFF',
  systemOrange: '#FF9500',
  systemYellow: '#FFD60A',
} as const;

export default Colors;
