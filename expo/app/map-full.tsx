import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { X, Locate, ChevronLeft } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useRouter, Stack } from 'expo-router';
import StoreCard from '@/components/StoreCard';
import { mockStores } from '@/mocks/data';
import { mockPlaces } from '@/mocks/places';
import { StoreData, CategoryLabels, CategoryType, Place } from '@/types';
import Colors, { CategoryColors } from '@/constants/colors';
import CategoryIcon from '@/components/CategoryIcon';
import { getCategoryStyle } from '@/utils/categoryStyle';

export default function MapFullScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryType | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    void (async () => {
      if (Platform.OS === 'web') {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setUserLocation({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              });
            },
            () => {
              setUserLocation({ latitude: 40.7549, longitude: -73.984 });
            }
          );
        }
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        } else {
          setUserLocation({ latitude: 40.7549, longitude: -73.984 });
        }
      }
    })();
  }, []);

  const filteredPlaces = useMemo(() => {
    if (!activeCategory) return mockPlaces;
    return mockPlaces.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  const handleMarkerPress = useCallback((place: Place) => {
    const store = mockStores.find(
      (s) => s.name === place.name || (Math.abs(s.latitude - place.latitude) < 0.001 && Math.abs(s.longitude - place.longitude) < 0.001)
    );
    if (store) {
      setSelectedStore(store);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      router.push({ pathname: '/place-profile', params: { id: place.id } });
    }
  }, [slideAnim, router]);

  const dismissCard = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setSelectedStore(null));
  }, [slideAnim]);

  const handleDirections = useCallback(() => {
    if (!selectedStore) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${selectedStore.name}&ll=${selectedStore.latitude},${selectedStore.longitude}`,
      android: `geo:${selectedStore.latitude},${selectedStore.longitude}?q=${selectedStore.name}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${selectedStore.latitude},${selectedStore.longitude}`,
    });
    if (url) void Linking.openURL(url);
  }, [selectedStore]);

  const centerOnUser = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      }, 600);
    }
  }, [userLocation]);

  const toggleCategory = useCallback((cat: CategoryType) => {
    setActiveCategory((prev) => (prev === cat ? null : cat));
  }, []);

  const initialRegion = {
    latitude: userLocation?.latitude ?? 40.7549,
    longitude: userLocation?.longitude ?? -73.984,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
        showsScale
        provider={PROVIDER_DEFAULT}
      >
        {filteredPlaces.map((place) => {
          const catStyle = getCategoryStyle(place.category);
          const markerColor = catStyle?.color ?? '#9CA3AF';
          return (
            <Marker
              key={place.id}
              coordinate={{
                latitude: place.latitude,
                longitude: place.longitude,
              }}
              onPress={() => handleMarkerPress(place)}
            >
              <View style={styles.markerContainer}>
                <View style={styles.markerBubble}>
                  <View style={[styles.markerDot, { backgroundColor: markerColor }]} />
                  <Text style={styles.markerLabel} numberOfLines={1}>{place.name}</Text>
                </View>
                <View style={[styles.markerArrow, { borderTopColor: '#FFFFFF' }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={20} color={Colors.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.filterRow}>
          {(Object.keys(CategoryColors) as CategoryType[]).map((key) => {
            const isActive = activeCategory === key;
            return (
              <Pressable
                key={key}
                onPress={() => toggleCategory(key)}
                style={[
                  styles.filterBtn,
                  isActive && { backgroundColor: CategoryColors[key] },
                ]}
              >
                <CategoryIcon category={key} size={14} color={isActive ? '#FFFFFF' : CategoryColors[key]} />
                <Text style={[styles.filterText, isActive && { color: '#FFFFFF' }]}>
                  {CategoryLabels[key]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        onPress={centerOnUser}
        style={[styles.locateBtn, { bottom: insets.bottom + (selectedStore ? 230 : 32) }]}
      >
        <Locate size={20} color={Colors.text} />
      </Pressable>

      {selectedStore && (
        <Animated.View
          style={[
            styles.cardContainer,
            {
              bottom: insets.bottom + 16,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Pressable style={styles.dismissBtn} onPress={dismissCard}>
            <X size={16} color={Colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => {
            const matchedPlace = mockPlaces.find(
              (p) => p.name === selectedStore.name || (Math.abs(p.latitude - selectedStore.latitude) < 0.001 && Math.abs(p.longitude - selectedStore.longitude) < 0.001)
            );
            if (matchedPlace) {
              dismissCard();
              setTimeout(() => {
                router.push({ pathname: '/place-profile', params: { id: matchedPlace.id } });
              }, 300);
            }
          }}>
            <StoreCard
              store={selectedStore}
              onDirections={handleDirections}
              onViewLists={dismissCard}
            />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    gap: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  locateBtn: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.97)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  markerContainer: {
    alignItems: 'center',
  },
  markerBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    maxWidth: 140,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  markerLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    flexShrink: 1,
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  cardContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
  },

  dismissBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 30,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
