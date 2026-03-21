import { Tabs, useRouter } from 'expo-router';
import { House, Tag, Heart, X, UserPen, DollarSign, Users } from 'lucide-react-native';
import ScanFrameIcon from '@/components/ScanFrameIcon';
import React, { useCallback, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Platform, Animated, Modal, Text } from 'react-native';
import * as Haptics from 'expo-haptics';

const MENU_ACTIONS = [
  { key: 'deal', label: 'Post a Deal', icon: DollarSign, route: '/post-deal' as const },
  { key: 'post', label: 'Profile Post', icon: UserPen, route: '/create-block' as const },
] as const;

function CenterTabButton() {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [menuOpen, setMenuOpen] = useState(false);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const menuSlide = useRef(new Animated.Value(0)).current;

  const handleAction = useCallback((route: string, key: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === 'deal') {
      router.push('/post-deal');
    } else {
      router.push(route as '/create-block');
    }
  }, [router]);

  const handleScanPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
    router.push('/smart-scan');
  }, [scaleAnim, router]);

  const openNativeSheet = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMenuOpen(true);
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(menuSlide, { toValue: 1, useNativeDriver: true, tension: 160, friction: 12 }),
    ]).start();
  }, [backdropAnim, menuSlide]);

  const closeMenu = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(menuSlide, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setMenuOpen(false));
  }, [backdropAnim, menuSlide]);

  const handleMenuAction = useCallback((route: string, key: string) => {
    closeMenu();
    setTimeout(() => handleAction(route, key), 120);
  }, [closeMenu, handleAction]);

  return (
    <View style={centerStyles.wrapper}>
      <Animated.View style={[centerStyles.outer, { transform: [{ scale: scaleAnim }] }]}>
        <Pressable
          onPress={handleScanPress}
          onLongPress={openNativeSheet}
          style={({ pressed }) => [
            centerStyles.button,
            pressed && centerStyles.buttonPressed,
          ]}
          testID="tab-center-scan-btn"
        >
          <ScanFrameIcon size={26} color="#FFFFFF" strokeWidth={2.4} />
        </Pressable>
      </Animated.View>

      {
        <Modal visible={menuOpen} transparent animationType="none" statusBarTranslucent>
          <Pressable style={centerStyles.modalFill} onPress={closeMenu}>
            <Animated.View style={[centerStyles.backdrop, { opacity: backdropAnim }]} />
          </Pressable>

          <Animated.View
            style={[
              centerStyles.menuContainer,
              {
                opacity: menuSlide,
                transform: [{
                  translateY: menuSlide.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }),
                }],
              },
            ]}
            pointerEvents={menuOpen ? 'auto' : 'none'}
          >
            <View style={centerStyles.menuCard}>
              {MENU_ACTIONS.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <Pressable
                    key={action.key}
                    onPress={() => handleMenuAction(action.route, action.key)}
                    style={({ pressed }) => [
                      centerStyles.menuItem,
                      pressed && centerStyles.menuItemPressed,
                      idx < MENU_ACTIONS.length - 1 && centerStyles.menuItemBorder,
                    ]}
                    testID={`menu-action-${action.key}`}
                  >
                    <View style={centerStyles.menuIconCircle}>
                      <Icon size={18} color="#1C1C1E" strokeWidth={1.8} />
                    </View>
                    <Text style={centerStyles.menuLabel}>{action.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={closeMenu}
              style={({ pressed }) => [
                centerStyles.cancelBtn,
                pressed && centerStyles.cancelBtnPressed,
              ]}
              testID="menu-cancel-btn"
            >
              <X size={15} color="#8E8E93" strokeWidth={2} />
              <Text style={centerStyles.cancelText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </Modal>
      }
    </View>
  );
}

const centerStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
  },
  outer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    shadowColor: '#1B7A45',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#1B7A45',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: '#166B3D',
  },
  modalFill: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  menuContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 70 : 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  menuCard: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemPressed: {
    backgroundColor: '#F2F2F7',
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  menuIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
  },
  cancelBtnPressed: {
    backgroundColor: '#F2F2F7',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#8E8E93',
  },
});

const tabBarStyle = StyleSheet.create({
  bar: {
    backgroundColor: '#FAFAFA',
    borderTopColor: '#E5E5EA',
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },
  barWeb: {
    backgroundColor: '#FAFAFA',
    borderTopColor: '#E5E5EA',
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
    height: 52,
  },
});

const TAB_SCREEN_OPTIONS = {
  headerShown: false,
  tabBarActiveTintColor: '#1B7A45',
  tabBarInactiveTintColor: '#8E8E93',
  tabBarStyle: Platform.OS === 'web' ? tabBarStyle.barWeb : tabBarStyle.bar,
  tabBarItemStyle: { flex: 1 } as const,
  tabBarShowLabel: false,
  tabBarIconStyle: {
    marginBottom: -1,
  },
  lazy: true,
} as const;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={TAB_SCREEN_OPTIONS}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: '',
          tabBarIcon: ({ color, focused, size }) => (
            <House size={size - 2} color={color} strokeWidth={focused ? 2.2 : 1.4} fill={focused ? color : 'none'} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: '',
          tabBarIcon: ({ color, focused, size }) => (
            <Heart size={size - 2} color={color} strokeWidth={focused ? 2.2 : 1.4} fill={focused ? color : 'none'} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarButton: () => <CenterTabButton />,
          tabBarItemStyle: {
            flex: 1,
          },
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: '',
          tabBarIcon: ({ color, focused, size }) => (
            <Tag size={size - 2} color={color} strokeWidth={focused ? 2.2 : 1.4} fill={focused ? color : 'none'} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: '',
          tabBarIcon: ({ color, focused, size }) => (
            <Users size={size - 2} color={color} strokeWidth={focused ? 2.0 : 1.4} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
