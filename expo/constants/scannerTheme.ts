export const ScannerColors = {
  bg: '#FAFAF8',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#E8E5DF',
  cardElevated: '#FFFFFF',

  text: '#1A1A1A',
  textSecondary: '#5C5C5C',
  textMuted: '#8E8E8E',
  textDim: '#B0B0B0',

  accent: '#2D6A4F',
  accentSoft: '#2D6A4F10',
  accentBorder: '#2D6A4F22',

  warmOrange: '#E07C3E',
  warmOrangeSoft: '#E07C3E14',
  warmOrangeBorder: '#E07C3E30',

  success: '#2D8C3C',
  successBg: '#EFF8F0',
  successBorder: '#C3E6C7',

  warning: '#C27800',
  warningBg: '#FFF5EB',
  warningBorder: '#FDCB94',

  amber: '#C27800',
  amberBg: '#FFF9EB',
  amberBorder: '#FFE5A0',

  error: '#D4351C',
  errorBg: '#FDF0EE',
  errorBorder: '#F5C0B8',

  divider: '#ECEAE6',
  overlay: 'rgba(0,0,0,0.4)',
} as const;

export const ScannerSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const ScannerRadius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 16,
  pill: 20,
  circle: 999,
} as const;

export const ScannerTypography = {
  heroTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: ScannerColors.text,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: ScannerColors.text,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: ScannerColors.text,
  },
  body: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: ScannerColors.textSecondary,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: ScannerColors.textMuted,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: ScannerColors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: ScannerColors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  badge: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  price: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: ScannerColors.text,
    letterSpacing: -0.5,
  },
  buttonPrimary: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  buttonSecondary: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: ScannerColors.text,
  },
} as const;

export const ScannerShadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;
