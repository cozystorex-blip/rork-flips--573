export const ScannerColors = {
  bg: '#0A0A0A',
  surface: '#111111',
  card: '#1A1A1A',
  cardBorder: '#2A2A2A',
  cardElevated: '#222222',

  text: '#F5F5F7',
  textSecondary: '#AEAEB2',
  textMuted: '#636366',
  textDim: '#48484A',

  accent: '#3B82F6',
  accentSoft: '#3B82F618',
  accentBorder: '#3B82F630',

  success: '#16A34A',
  successBg: '#16A34A18',
  successBorder: '#16A34A30',

  warning: '#F97316',
  warningBg: '#F9731618',
  warningBorder: '#F9731630',

  amber: '#D97706',
  amberBg: '#D9770618',
  amberBorder: '#D9770630',

  error: '#EF4444',
  errorBg: '#EF444418',
  errorBorder: '#EF444430',

  divider: '#2A2A2A',
  overlay: 'rgba(0,0,0,0.7)',
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
