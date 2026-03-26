import React from 'react';
import { Wallet, Heart, Package, Tag } from 'lucide-react-native';
import { CategoryType } from '@/types';

interface CategoryIconProps {
  category: CategoryType;
  size?: number;
  color?: string;
}

const iconMap = {
  budget: Wallet,
  healthy: Heart,
  bulk: Package,
  deals: Tag,
} as const;

export default function CategoryIcon({ category, size = 14, color = '#8E8E93' }: CategoryIconProps) {
  const Icon = iconMap[category];
  return <Icon size={size} color={color} strokeWidth={1.8} />;
}
