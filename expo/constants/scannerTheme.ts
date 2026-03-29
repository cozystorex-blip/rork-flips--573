export const ScannerColors = {
  bg: '#F2F2F7',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#E5E5EA',
  cardElevated: '#FFFFFF',

  text: '#1C1C1E',
  textSecondary: '#636366',
  textMuted: '#8E8E93',
  textDim: '#AEAEB2',

  accent: '#16A34A',
  accentSoft: '#16A34A14',
  accentBorder: '#16A34A28',

  success: '#16A34A',
  successBg: '#F0FDF4',
  successBorder: '#BBF7D0',

  warning: '#F97316',
  warningBg: '#FFF7ED',
  warningBorder: '#FDBA74',

  amber: '#D97706',
  amberBg: '#FFFBEB',
  amberBorder: '#FDE68A',

  error: '#EF4444',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',

  divider: '#E5E5EA',
  overlay: 'rgba(0,0,0,0.45)',
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
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;
