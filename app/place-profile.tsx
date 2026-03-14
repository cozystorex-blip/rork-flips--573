import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Animated,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Navigation, Phone, Globe, MapPin, Tag, BadgeCheck, Store, X } from 'lucide-react-native';
import { getCategoryStyle } from '@/utils/categoryStyle';
import { mockPlaces } from '@/mocks/places';
import { useBusiness } from '@/contexts/BusinessContext';
import { useBlocks } from '@/contexts/BlocksContext';
import { useAuth } from '@/contexts/AuthContext';
import ProfileBlockCard from '@/components/ProfileBlockCard';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import { showInterstitialIfReady } from '@/services/adService';

export default function PlaceProfileScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { getClaimForPlace, claimPlace, verifyPlace, unclaimPlace } = useBusiness();
  const { blocks } = useBlocks();
  const { userId } = useAuth();
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [businessName, setBusinessName] = useState('');

  const place = mockPlaces.find((p) => p.id === params.id) ?? null;
  const claim = place ? getClaimForPlace(place.id) : null;

  const placeBlocks = blocks.filter(
    (b) => b.actionType === 'openPlaceProfile' && b.placeId === params.id
  );

  const dealBlocks = blocks.filter(
    (b) =>
      b.placeId === params.id ||
      (place && b.actionType === 'openMap' && b.latitude != null && b.longitude != null &&
        Math.abs(b.latitude - place.latitude) < 0.002 &&
        Math.abs(b.longitude - place.longitude) < 0.002)
  );

  const linkedBlocks = [...new Map([...placeBlocks, ...dealBlocks].map((b) => [b.id, b])).values()];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      void showInterstitialIfReady();
    }, 800);
    return () => clearTimeout(timer);
  }, [fadeAnim]);

  const handleDirections = useCallback(() => {
    if (!place) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${place.name}&ll=${place.latitude},${place.longitude}`,
      android: `geo:${place.latitude},${place.longitude}?q=${place.name}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`,
    });
    if (url) void Linking.openURL(url);
  }, [place]);

  const handleCall = useCallback(() => {
    if (!place?.phone) return;
    void Linking.openURL(`tel:${place.phone}`);
  }, [place]);

  const handleWebsite = useCallback(() => {
    if (!place?.website) return;
    void Linking.openURL(place.website);
  }, [place]);

  const handleClaim = useCallback(() => {
    if (!place) return;
    if (!businessName.trim()) {
      Alert.alert('Business Name Required', 'Please enter your business name.');
      return;
    }
    claimPlace(place.id, userId ?? '', businessName.trim());
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowClaimModal(false);
    setBusinessName('');
    console.log('[PlaceProfile] Place claimed:', place.id);
  }, [place, businessName, claimPlace, userId]);

  const handleVerify = useCallback(() => {
    if (!place) return;
    verifyPlace(place.id);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log('[PlaceProfile] Place verified:', place.id);
  }, [place, verifyPlace]);

  const handleUnclaim = useCallback(() => {
    if (!place) return;
    Alert.alert('Unclaim Place', 'Are you sure you want to unclaim this place?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unclaim',
        style: 'destructive',
        onPress: () => {
          unclaimPlace(place.id);
          console.log('[PlaceProfile] Place unclaimed:', place.id);
        },
      },
    ]);
  }, [place, unclaimPlace]);

  if (!place) {
    return (
      <View style={styles.emptyContainer}>
        <Stack.Screen options={{ title: 'Place' }} />
        <Text style={styles.emptyText}>Place not found</Text>
      </View>
    );
  }

  const catStyle = getCategoryStyle(place.category);
  const isMyClaim = claim?.userId === userId;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: place.name,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {place.imageUrl && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Image
              source={{ uri: place.imageUrl }}
              style={styles.heroImage}
              contentFit="cover"
            />
            {catStyle && (
              <View style={[styles.heroBadge, { backgroundColor: catStyle.color }]}>
                <View style={styles.heroBadgeDot} />
                <Text style={styles.heroBadgeText}>{catStyle.label}</Text>
              </View>
            )}
            {claim?.isVerified && (
              <View style={styles.verifiedBadge}>
                <BadgeCheck size={14} color="#FFFFFF" />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            )}
          </Animated.View>
        )}

        <Animated.View style={[styles.infoSection, { opacity: fadeAnim }]}>
          <View style={styles.nameRow}>
            <Text style={styles.placeName}>{place.name}</Text>
            {claim?.isVerified && (
              <BadgeCheck size={20} color="#2563EB" />
            )}
          </View>

          {claim && (
            <View style={styles.claimBanner}>
              <Store size={14} color={claim.isVerified ? '#2563EB' : '#F59E0B'} />
              <Text style={[styles.claimBannerText, { color: claim.isVerified ? '#2563EB' : '#92400E' }]}>
                {claim.isVerified ? 'Verified Business: ' + claim.businessName : 'Claimed by: ' + claim.businessName}
              </Text>
            </View>
          )}

          {place.address && (
            <View style={styles.infoRow}>
              <MapPin size={15} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{place.address}</Text>
            </View>
          )}

          {catStyle && !place.imageUrl && (
            <View style={styles.categoryRow}>
              <View style={[styles.categoryDot, { backgroundColor: catStyle.color }]} />
              <Text style={[styles.categoryLabel, { color: catStyle.color }]}>
                {catStyle.label}
              </Text>
            </View>
          )}

          {place.recommendationTag && (
            <View style={styles.tagRow}>
              <Tag size={13} color={catStyle?.color ?? Colors.textSecondary} />
              <Text style={[styles.tagText, { color: catStyle?.color ?? Colors.textSecondary }]}>
                {place.recommendationTag}
              </Text>
            </View>
          )}
        </Animated.View>

        {place.description && (
          <Animated.View style={[styles.descriptionCard, { opacity: fadeAnim }]}>
            <Text style={styles.descriptionTitle}>About</Text>
            <Text style={styles.descriptionText}>{place.description}</Text>
          </Animated.View>
        )}

        <Animated.View style={[styles.actionsSection, { opacity: fadeAnim }]}>
          <Pressable
            style={[styles.actionBtn, styles.directionsBtn]}
            onPress={handleDirections}
            testID="place-directions-btn"
          >
            <Navigation size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnTextWhite}>Directions</Text>
          </Pressable>

          <View style={styles.secondaryActions}>
            {place.phone && (
              <Pressable
                style={styles.secondaryBtn}
                onPress={handleCall}
                testID="place-call-btn"
              >
                <Phone size={16} color={Colors.text} />
                <Text style={styles.secondaryBtnText}>Call</Text>
              </Pressable>
            )}
            {place.website && (
              <Pressable
                style={styles.secondaryBtn}
                onPress={handleWebsite}
                testID="place-website-btn"
              >
                <Globe size={16} color={Colors.text} />
                <Text style={styles.secondaryBtnText}>Website</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {linkedBlocks.length > 0 && (
          <Animated.View style={[styles.dealsSection, { opacity: fadeAnim }]}>
            <Text style={styles.dealsSectionTitle}>Deals & Tips</Text>
            {linkedBlocks.map((block) => (
              <ProfileBlockCard key={block.id} block={block} />
            ))}
          </Animated.View>
        )}

        <Animated.View style={[styles.businessSection, { opacity: fadeAnim }]}>
          {!claim && (
            <Pressable
              style={styles.claimBtn}
              onPress={() => setShowClaimModal(true)}
              testID="claim-place-btn"
            >
              <Store size={18} color="#FFFFFF" />
              <Text style={styles.claimBtnText}>Claim This Place</Text>
            </Pressable>
          )}

          {isMyClaim && !claim?.isVerified && (
            <View style={styles.claimActions}>
              <Pressable style={styles.verifyBtn} onPress={handleVerify} testID="verify-place-btn">
                <BadgeCheck size={16} color="#FFFFFF" />
                <Text style={styles.verifyBtnText}>Verify Business</Text>
              </Pressable>
              <Pressable style={styles.unclaimBtn} onPress={handleUnclaim}>
                <Text style={styles.unclaimBtnText}>Unclaim</Text>
              </Pressable>
            </View>
          )}

          {isMyClaim && claim?.isVerified && (
            <View style={styles.verifiedOwnerCard}>
              <BadgeCheck size={20} color="#2563EB" />
              <View style={styles.verifiedOwnerInfo}>
                <Text style={styles.verifiedOwnerTitle}>You own this place</Text>
                <Text style={styles.verifiedOwnerSub}>Your business is verified</Text>
              </View>
              <Pressable onPress={handleUnclaim}>
                <Text style={styles.unclaimLinkText}>Unclaim</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {showClaimModal && (
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowClaimModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Claim {place.name}</Text>
              <Pressable onPress={() => setShowClaimModal(false)}>
                <X size={20} color={Colors.text} />
              </Pressable>
            </View>
            <Text style={styles.modalDesc}>
              Enter your business name to claim this place. Once verified, you will get a verified badge.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Business name"
              placeholderTextColor={Colors.textTertiary}
              value={businessName}
              onChangeText={setBusinessName}
              testID="claim-business-name"
            />
            <Pressable style={styles.modalClaimBtn} onPress={handleClaim}>
              <Text style={styles.modalClaimBtnText}>Claim Place</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#E5E5EA',
  },
  heroBadge: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  heroBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 12,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeName: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.3,
    flex: 1,
  },
  claimBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  claimBannerText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  descriptionCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  directionsBtn: {
    backgroundColor: '#1C1C1E',
  },
  actionBtnTextWhite: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.card,
    gap: 6,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  dealsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  dealsSectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  businessSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 14,
  },
  claimBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  claimActions: {
    gap: 10,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 14,
  },
  verifyBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  unclaimBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  unclaimBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.destructive,
  },
  verifiedOwnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  verifiedOwnerInfo: {
    flex: 1,
  },
  verifiedOwnerTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1E40AF',
  },
  verifiedOwnerSub: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
  },
  unclaimLinkText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.destructive,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  modalDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  modalClaimBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalClaimBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
