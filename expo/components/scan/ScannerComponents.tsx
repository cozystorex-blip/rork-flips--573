import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Camera,
  Image as ImageIcon,
  ScanLine,
  RefreshCw,
  Info,
  Trash2,
} from 'lucide-react-native';
import { ScannerColors, ScannerRadius, ScannerSpacing } from '@/constants/scannerTheme';

interface ScannerTopBarProps {
  title: string;
  onClose: () => void;
  paddingTop: number;
  rightElement?: React.ReactNode;
  testID?: string;
}

export function ScannerTopBar({ title, onClose, paddingTop, rightElement, testID }: ScannerTopBarProps) {
  return (
    <View style={[styles.topBar, { paddingTop: paddingTop + 8 }]}>
      <Pressable onPress={onClose} style={styles.closeBtn} testID={testID ?? 'scanner-close'}>
        <X size={20} color={ScannerColors.text} />
      </Pressable>
      <Text style={styles.topTitle}>{title}</Text>
      {rightElement ?? <View style={{ width: 34 }} />}
    </View>
  );
}

interface ScannerActionButtonsProps {
  onCamera: () => void;
  onGallery: () => void;
  scanning: boolean;
  scanningLabel?: string;
  cameraTestID?: string;
  galleryTestID?: string;
}

export function ScannerActionButtons({
  onCamera,
  onGallery,
  scanning,
  scanningLabel = 'Scanning...',
  cameraTestID,
  galleryTestID,
}: ScannerActionButtonsProps) {
  return (
    <View style={styles.actionRow}>
      <Pressable
        style={({ pressed }) => [styles.actionBtnPrimary, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        onPress={onCamera}
        disabled={scanning}
        testID={cameraTestID}
      >
        {scanning ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Camera size={20} color="#FFFFFF" />
        )}
        <Text style={styles.actionBtnPrimaryText}>
          {scanning ? scanningLabel : 'Camera'}
        </Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.actionBtnSecondary, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        onPress={onGallery}
        disabled={scanning}
        testID={galleryTestID}
      >
        <ImageIcon size={20} color={ScannerColors.text} />
        <Text style={styles.actionBtnSecondaryText}>Gallery</Text>
      </Pressable>
    </View>
  );
}

interface ScannerProgressCardProps {
  phaseMessage: string;
  phaseHint: string;
  progressWidth: Animated.Value;
  pulseAnim?: Animated.Value;
}

export function ScannerProgressCard({
  phaseMessage,
  phaseHint,
  progressWidth,
  pulseAnim,
}: ScannerProgressCardProps) {
  const fallbackPulse = useRef(new Animated.Value(1)).current;
  const pulse = pulseAnim ?? fallbackPulse;

  useEffect(() => {
    if (!pulseAnim) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(fallbackPulse, { toValue: 1.06, duration: 600, useNativeDriver: true }),
          Animated.timing(fallbackPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [pulseAnim, fallbackPulse]);

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <ScanLine size={18} color={ScannerColors.accent} />
        </Animated.View>
        <Text style={styles.progressText}>{phaseMessage}</Text>
      </View>
      <View style={styles.progressBarBg}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      {phaseHint ? <Text style={styles.progressHint}>{phaseHint}</Text> : null}
    </View>
  );
}

interface ScannerErrorCardProps {
  message: string;
  onRetakeCamera: () => void;
  onUploadGallery: () => void;
  onManualEntry?: () => void;
}

export function ScannerErrorCard({
  message,
  onRetakeCamera,
  onUploadGallery,
  onManualEntry,
}: ScannerErrorCardProps) {
  return (
    <View style={styles.errorCard}>
      <View style={styles.errorHeader}>
        <Info size={18} color={ScannerColors.accent} />
        <Text style={styles.errorTitle}>Try Again</Text>
      </View>
      <Text style={styles.errorMessage}>{message}</Text>
      <View style={styles.errorActions}>
        <Pressable style={({ pressed }) => [styles.errorActionBtn, pressed && { opacity: 0.85 }]} onPress={onRetakeCamera}>
          <RefreshCw size={14} color={ScannerColors.text} />
          <Text style={styles.errorActionText}>Retake</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.errorActionBtn, pressed && { opacity: 0.85 }]} onPress={onUploadGallery}>
          <ImageIcon size={14} color={ScannerColors.text} />
          <Text style={styles.errorActionText}>Upload</Text>
        </Pressable>
        {onManualEntry && (
          <Pressable style={({ pressed }) => [styles.errorActionBtnFilled, pressed && { opacity: 0.85 }]} onPress={onManualEntry}>
            <Text style={styles.errorActionFilledText}>Manual</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

interface ScannerResultActionsProps {
  onScanAgain: () => void;
  onTryDifferent?: () => void;
  onDelete?: () => void;
  showTryDifferent?: boolean;
  scanAgainLabel?: string;
  scanAgainTestID?: string;
  tryDifferentTestID?: string;
  deleteTestID?: string;
}

export function ScannerResultActions({
  onScanAgain,
  onTryDifferent,
  onDelete,
  showTryDifferent = false,
  scanAgainLabel = 'Scan Again',
  scanAgainTestID,
  tryDifferentTestID,
  deleteTestID,
}: ScannerResultActionsProps) {
  return (
    <View style={styles.resultActionsContainer}>
      <Pressable
        style={({ pressed }) => [styles.primaryActionBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        onPress={onScanAgain}
        testID={scanAgainTestID}
      >
        <RefreshCw size={16} color="#FFFFFF" />
        <Text style={styles.primaryActionText}>{scanAgainLabel}</Text>
      </Pressable>
      {showTryDifferent && onTryDifferent && (
        <Pressable
          style={({ pressed }) => [styles.secondaryActionBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={onTryDifferent}
          testID={tryDifferentTestID}
        >
          <ImageIcon size={16} color={ScannerColors.text} />
          <Text style={styles.secondaryActionText}>Try Different Photo</Text>
        </Pressable>
      )}
      {onDelete && (
        <Pressable
          style={({ pressed }) => [styles.deleteActionBtn, pressed && { opacity: 0.7 }]}
          onPress={onDelete}
          testID={deleteTestID}
        >
          <Trash2 size={14} color="#EF4444" />
          <Text style={styles.deleteActionText}>Delete This Scan</Text>
        </Pressable>
      )}
    </View>
  );
}

interface ConfidenceDisplayProps {
  confidence: number;
}

export function getConfidenceInfo(confidence: number) {
  let label: string;
  let color: string;

  if (confidence >= 0.70) {
    label = 'High Confidence Match';
    color = '#059669';
  } else if (confidence >= 0.40) {
    label = 'Likely Match';
    color = '#D97706';
  } else if (confidence >= 0.20) {
    label = 'Best Match (Low Confidence)';
    color = '#F97316';
  } else {
    label = 'Showing Closest Matches';
    color = '#EF4444';
  }

  return { label, color, isLow: confidence < 0.40, isVeryLow: confidence < 0.20 };
}

export function ConfidenceBadge({ confidence }: ConfidenceDisplayProps) {
  const { label, color } = getConfidenceInfo(confidence);
  return (
    <View style={[styles.confidenceBadge, { backgroundColor: color + '12' }]}>
      <View style={[styles.confidenceDot, { backgroundColor: color }]} />
      <Text style={[styles.confidenceText, { color }]}>
        {Math.round(confidence * 100)}% — {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ScannerSpacing.xl,
    paddingBottom: ScannerSpacing.md,
    backgroundColor: ScannerColors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ScannerColors.divider,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: ScannerColors.text,
    letterSpacing: -0.2,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: ScannerSpacing.xl,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: ScannerRadius.xl,
    backgroundColor: ScannerColors.accent,
    shadowColor: '#003E75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: ScannerRadius.xl,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ScannerColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  actionBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: ScannerColors.text,
  },

  progressCard: {
    backgroundColor: ScannerColors.accentSoft,
    borderRadius: ScannerRadius.xl,
    padding: ScannerSpacing.lg,
    marginBottom: ScannerSpacing.lg,
    borderWidth: 1,
    borderColor: ScannerColors.accentBorder,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: ScannerColors.accent,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: ScannerColors.accent,
    borderRadius: 3,
  },
  progressHint: {
    fontSize: 12,
    color: ScannerColors.textMuted,
    lineHeight: 16,
  },

  errorCard: {
    backgroundColor: ScannerColors.warningBg,
    borderRadius: ScannerRadius.xl,
    padding: ScannerSpacing.lg,
    marginBottom: ScannerSpacing.lg,
    borderWidth: 1,
    borderColor: ScannerColors.warningBorder,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: ScannerColors.warning,
  },
  errorMessage: {
    fontSize: 13,
    color: ScannerColors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  errorActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: ScannerRadius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ScannerColors.cardBorder,
  },
  errorActionText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: ScannerColors.text,
  },
  errorActionBtnFilled: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: ScannerRadius.md,
    backgroundColor: ScannerColors.accent,
  },
  errorActionFilledText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },

  resultActionsContainer: {
    gap: 8,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: ScannerRadius.xl,
    backgroundColor: ScannerColors.accent,
    shadowColor: '#003E75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: ScannerRadius.xl,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ScannerColors.cardBorder,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: ScannerColors.text,
  },
  deleteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  deleteActionText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#EF4444',
  },

  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: ScannerRadius.sm,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
});
