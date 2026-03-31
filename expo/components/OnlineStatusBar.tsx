import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Wifi, Cloud, CloudOff } from 'lucide-react-native';
import { useOnlinePeople } from '@/contexts/OnlinePeopleContext';

interface OnlineStatusBarProps {
  compact?: boolean;
  onPress?: () => void;
}

function OnlineStatusBar({ compact = false, onPress }: OnlineStatusBarProps) {
  const { isUserOnline, onlineUsers, activeCount, lastSyncedAt } = useOnlinePeople();
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (!isUserOnline) {
      pulseAnim.setValue(0.4);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isUserOnline, pulseAnim]);

  const syncLabel = useMemo(() => {
    if (!lastSyncedAt) return '';
    const diff = Date.now() - lastSyncedAt;
    if (diff < 5000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    return `${Math.floor(diff / 60000)}m ago`;
  }, [lastSyncedAt]);

  if (compact) {
    return (
      <Animated.View style={[styles.compactWrap, { opacity: fadeAnim }]}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.compactBar,
            isUserOnline ? styles.compactOnline : styles.compactOffline,
            pressed && { opacity: 0.8 },
          ]}
          testID="online-status-compact"
        >
          {isUserOnline ? (
            <>
              <Animated.View style={[styles.compactDot, { opacity: pulseAnim }]} />
              <Text style={styles.compactText}>{activeCount} active</Text>
              <Cloud size={12} color="#16A34A" strokeWidth={2} />
            </>
          ) : (
            <>
              <CloudOff size={12} color="#8E8E93" strokeWidth={1.8} />
              <Text style={styles.compactTextOff}>Offline</Text>
            </>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.barWrap, { opacity: fadeAnim }]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.bar,
          isUserOnline ? styles.barOnline : styles.barOffline,
          pressed && { opacity: 0.85 },
        ]}
        testID="online-status-bar"
      >
        <View style={styles.barLeft}>
          {isUserOnline ? (
            <>
              <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
              <View>
                <Text style={styles.barTitle}>
                  {onlineUsers.length} {onlineUsers.length === 1 ? 'person' : 'people'} online
                </Text>
                {syncLabel ? (
                  <Text style={styles.barSync}>Synced {syncLabel}</Text>
                ) : null}
              </View>
            </>
          ) : (
            <>
              <CloudOff size={16} color="#AEAEB2" strokeWidth={1.8} />
              <Text style={styles.barTitleOff}>Offline mode</Text>
            </>
          )}
        </View>
        {isUserOnline && (
          <View style={styles.barRight}>
            <Wifi size={14} color="#16A34A" strokeWidth={2.2} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(OnlineStatusBar);

const styles = StyleSheet.create({
  barWrap: {
    marginBottom: 12,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  barOnline: {
    backgroundColor: 'rgba(22,163,74,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.12)',
  },
  barOffline: {
    backgroundColor: 'rgba(142,142,147,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(142,142,147,0.08)',
  },
  barLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  barTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#16A34A',
    letterSpacing: -0.1,
  },
  barSync: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 1,
  },
  barTitleOff: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#AEAEB2',
  },
  compactWrap: {
    alignSelf: 'flex-start',
  },
  compactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  compactOnline: {
    backgroundColor: 'rgba(22,163,74,0.08)',
  },
  compactOffline: {
    backgroundColor: 'rgba(142,142,147,0.06)',
  },
  compactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  compactText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#16A34A',
  },
  compactTextOff: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#AEAEB2',
  },
});
