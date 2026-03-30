import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Settings,
  LogOut,
  Camera,
  Pause,
  Music,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';

const SONG_URL = 'https://cdn.pixabay.com/audio/2024/11/29/audio_437228a595.mp3';
const SONG_TITLE = 'Smooth Vibes';
const SONG_ARTIST = 'Pixabay Music';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, isAuthenticated } = useAuth();
  const { profile } = useProfile();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [_duration, setDuration] = useState<number>(0);
  const [_position, setPosition] = useState<number>(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    return () => {
      if (sound) {
        console.log('[Profile] Unloading sound on unmount');
        void sound.unloadAsync();
      }
    };
  }, [sound]);

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setDuration(status.durationMillis ?? 0);
      setPosition(status.positionMillis ?? 0);
      const prog = status.durationMillis ? status.positionMillis / status.durationMillis : 0;
      setProgress(prog);
    }
  }, []);

  const handlePlayPause = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
        }
      } else {
        console.log('[Profile] Loading song...');
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: SONG_URL },
          { shouldPlay: true, isLooping: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
      }
    } catch (err) {
      console.log('[Profile] Audio error:', err);
    }
  }, [sound, isPlaying, onPlaybackStatusUpdate]);



  const memberSince = useMemo(() => {
    if (profile?.created_at) {
      return new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return 'March 2024';
  }, [profile]);

  const displayName = profile?.display_name && profile.display_name !== 'User'
    ? profile.display_name
    : user?.email?.split('@')[0] || 'Flip User';

  const handleSignOut = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => { void signOut(); },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.greenFull, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Profile</Text>
          <Pressable
            style={styles.settingsBtn}
            hitSlop={8}
            onPress={() => { void Haptics.selectionAsync(); }}
          >
            <Settings size={20} color="#FFFFFF" strokeWidth={1.5} />
          </Pressable>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatar}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.avatarInitial}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <Pressable
              style={styles.cameraBtn}
              hitSlop={6}
              onPress={() => { void Haptics.selectionAsync(); }}
            >
              <Camera size={14} color="#16A34A" strokeWidth={2} />
            </Pressable>
          </View>

          <Text style={styles.nameText}>{displayName}</Text>
          <Text style={styles.memberText}>Member since {memberSince}</Text>
          {user?.email && (
            <Text style={styles.emailText}>{user.email}</Text>
          )}
        </View>

        <View style={styles.mediaRow}>
          <View style={styles.videoCard}>
            <Video
              source={{ uri: 'https://assets.mixkit.co/videos/607/607-720.mp4' }}
              style={styles.video}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              isMuted
            />
            <View style={styles.videoOverlay}>
              <Text style={styles.videoLabel}>Featured</Text>
            </View>
          </View>

          <Pressable
            onPress={() => { void handlePlayPause(); }}
            style={({ pressed }) => [styles.musicTile, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <View style={styles.musicIconWrap}>
              {isPlaying ? (
                <Pause size={22} color="#16A34A" strokeWidth={2.5} />
              ) : (
                <Music size={22} color="#16A34A" strokeWidth={2} />
              )}
            </View>
            <Text style={styles.musicTileTitle} numberOfLines={1}>{SONG_TITLE}</Text>
            <Text style={styles.musicTileArtist} numberOfLines={1}>{SONG_ARTIST}</Text>
            {isPlaying && (
              <View style={styles.miniProgress}>
                <View style={[styles.miniProgressFill, { width: `${Math.min(progress * 100, 100)}%` as any }]} />
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.spacer} />

        <Animated.View style={[styles.bottomArea, { opacity: fadeAnim }]}>
          {isAuthenticated && (
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
            >
              <LogOut size={16} color="rgba(255,255,255,0.7)" strokeWidth={1.8} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#16A34A',
  },
  greenFull: {
    flex: 1,
    backgroundColor: '#16A34A',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarOuter: {
    position: 'relative',
    marginBottom: 18,
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3.5,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  avatarInitial: {
    fontSize: 52,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  nameText: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  memberText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
  },
  mediaRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 28,
    gap: 12,
  },
  videoCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  video: {
    width: '100%' as const,
    height: 160,
  },
  videoOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  videoLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  musicTile: {
    width: 110,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  musicTileTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    textAlign: 'center' as const,
  },
  musicTileArtist: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
    textAlign: 'center' as const,
  },
  miniProgress: {
    width: '100%' as const,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    marginTop: 10,
  },
  miniProgressFill: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  spacer: {
    flex: 1,
  },
  bottomArea: {
    paddingBottom: 10,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.7)',
  },
});
