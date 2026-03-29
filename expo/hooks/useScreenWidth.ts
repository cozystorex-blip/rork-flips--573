import { useWindowDimensions, Platform } from 'react-native';

const MAX_MOBILE_WIDTH = 500;

export function useScreenWidth(): number {
  const { width } = useWindowDimensions();
  if (Platform.OS === 'web') {
    return Math.min(width, MAX_MOBILE_WIDTH);
  }
  return width;
}

export function useContentStyle() {
  const { width } = useWindowDimensions();
  if (Platform.OS === 'web' && width > MAX_MOBILE_WIDTH) {
    return {
      maxWidth: MAX_MOBILE_WIDTH,
      alignSelf: 'center' as const,
      width: '100%' as const,
    };
  }
  return {};
}
