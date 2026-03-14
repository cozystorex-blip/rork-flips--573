import React from 'react';
import AdMobBanner from './AdMobBanner';
import { usePremium } from '@/contexts/PremiumContext';

interface DealAdCardProps {
  index: number;
}

export default function DealAdCard({ index: _index }: DealAdCardProps) {
  const { isPremium } = usePremium();
  if (isPremium) return null;

  return <AdMobBanner />;
}
