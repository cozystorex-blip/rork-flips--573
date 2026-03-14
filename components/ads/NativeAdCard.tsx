import React from 'react';
import AdMobBanner from './AdMobBanner';
import { usePremium } from '@/contexts/PremiumContext';

interface NativeAdCardProps {
  index: number;
}

export default function NativeAdCard({ index: _index }: NativeAdCardProps) {
  const { isPremium } = usePremium();
  if (isPremium) return null;

  return <AdMobBanner />;
}
