import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { Cloud, CloudOff, Check } from 'lucide-react-native';
import { useOnlinePeople } from '@/contexts/OnlinePeopleContext';

interface SyncBadgeProps {
  itemCount?: number;
  showLabel?: boolean;
}

function SyncBadge({ itemCount, showLabel = true }: SyncBadgeProps) {
  const { isUserOnline } = useOnlinePeople();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  if (!showLabel) {
    return (
      <Animated.View style={[styles.iconOnly, { opacity: fadeAnim }]}>
        {isUserOnline ? (
          <Cloud size={14} color="#16A34A" strokeWidth={2} />
        ) : (
          <CloudOff size={14} color="#C7C7CC" strokeWidth={1.5} />
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.badge,
        isUserOnline ? styles.badgeOnline : styles.badgeOffline,
        { opacity: fadeAnim },
      ]}
    >
      {isUserOnline ? (
        <>
          <Check size={11} color="#16A34A" strokeWidth={2.5} />
          <Text style={styles.badgeTextOnline}>
            {itemCount != null ? `${itemCount} synced` : 'Synced'}
          </Text>
        </>
      ) : (
        <>
          <CloudOff size={11} color="#AEAEB2" strokeWidth={1.8} />
          <Text style={styles.badgeTextOffline}>Local</Text>
        </>
      )}
    </Animated.View>
  );
}

export default React.memo(SyncBadge);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  badgeOnline: {
    backgroundColor: 'rgba(22,163,74,0.06)',
  },
  badgeOffline: {
    backgroundColor: 'rgba(142,142,147,0.06)',
  },
  badgeTextOnline: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#16A34A',
  },
  badgeTextOffline: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#AEAEB2',
  },
  iconOnly: {
    padding: 2,
  },
});
