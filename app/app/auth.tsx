import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, resetPassword, authError, clearError } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleSubmit = useCallback(async () => {
    clearError();
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (mode !== 'forgot' && password.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (mode === 'forgot') {
        console.log('[Auth] Sending reset email to:', email.trim());
        await resetPassword(email.trim());
        setResetSent(true);
      } else if (mode === 'signup') {
        const result = await signUp(email.trim(), password);
        if (!result.success) {
          Alert.alert('Sign Up Failed', result.error ?? 'Unknown error');
        } else {
          Alert.alert('Check Your Email', 'We sent you a confirmation link. You can also try signing in directly.');
        }
      } else {
        const result = await signIn(email.trim(), password);
        if (!result.success) {
          Alert.alert('Sign In Failed', result.error ?? 'Unknown error');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, mode, signIn, signUp, resetPassword, clearError]);

  const toggleMode = useCallback(() => {
    clearError();
    setResetSent(false);
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    void Haptics.selectionAsync();
  }, [clearError]);

  const goToForgot = useCallback(() => {
    clearError();
    setResetSent(false);
    setMode('forgot');
    void Haptics.selectionAsync();
  }, [clearError]);

  const backToSignIn = useCallback(() => {
    clearError();
    setResetSent(false);
    setMode('signin');
    void Haptics.selectionAsync();
  }, [clearError]);

  if (mode === 'forgot') {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={[styles.content, { paddingTop: insets.top + 40 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              onPress={backToSignIn}
              style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.6 }]}
              hitSlop={12}
              testID="forgot-back-btn"
            >
              <ArrowLeft size={20} color="#FFFFFF" />
              <Text style={styles.backText}>Back to Sign In</Text>
            </Pressable>

            <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.logoContainer}>
                <Lock size={28} color="#2D6A4F" />
              </View>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email and we'll send you a reset link
              </Text>
            </Animated.View>

            {resetSent ? (
              <Animated.View style={[styles.successCard, { opacity: fadeAnim }]}>
                <CheckCircle size={32} color="#2D6A4F" />
                <Text style={styles.successTitle}>Check Your Inbox</Text>
                <Text style={styles.successText}>
                  If an account exists for this email, a reset link has been sent.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
                  onPress={backToSignIn}
                  testID="back-to-signin-btn"
                >
                  <Text style={styles.submitBtnText}>Back to Sign In</Text>
                </Pressable>
              </Animated.View>
            ) : (
              <Animated.View style={[styles.form, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.inputContainer}>
                  <Mail size={18} color="#6B6B6B" />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor="#6B6B6B"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    testID="forgot-email"
                  />
                </View>

                {authError && (
                  <Text style={styles.errorText}>{authError}</Text>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.submitBtn,
                    loading && styles.submitBtnDisabled,
                    pressed && !loading && { opacity: 0.85 },
                  ]}
                  onPress={handleSubmit}
                  disabled={loading}
                  testID="forgot-submit"
                >
                  {loading ? (
                    <ActivityIndicator color="#000000" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Send Reset Link</Text>
                  )}
                </Pressable>
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 60 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.brandName}>Flips</Text>
            <Text style={styles.title}>
              {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'signin'
                ? 'Track spending, find deals, save more'
                : 'Start saving smarter today'}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.form, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.inputContainer}>
              <Mail size={18} color="#6B6B6B" />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#6B6B6B"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                testID="auth-email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={18} color="#6B6B6B" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#6B6B6B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                testID="auth-password"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                {showPassword ? (
                  <EyeOff size={18} color="#6B6B6B" />
                ) : (
                  <Eye size={18} color="#6B6B6B" />
                )}
              </Pressable>
            </View>

            {mode === 'signin' && (
              <Pressable onPress={goToForgot} style={styles.forgotBtn} testID="forgot-password-link">
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>
            )}

            {authError && (
              <Text style={styles.errorText}>{authError}</Text>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                loading && styles.submitBtnDisabled,
                pressed && !loading && { opacity: 0.85 },
              ]}
              onPress={handleSubmit}
              disabled={loading}
              testID="auth-submit"
            >
              {loading ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === 'signin' ? 'Sign In' : 'Sign Up'}
                </Text>
              )}
            </Pressable>

            {mode === 'signup' && (
              <View style={styles.securityNote}>
                <ShieldCheck size={14} color="#3A3A3A" />
                <Text style={styles.securityText}>Your data is encrypted and secure</Text>
              </View>
            )}

            <Pressable onPress={toggleMode} style={styles.toggleBtn}>
              <Text style={styles.toggleText}>
                {mode === 'signin'
                  ? "Don't have an account? "
                  : 'Already have an account? '}
                <Text style={styles.toggleTextBold}>
                  {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  brandName: {
    fontSize: 38,
    fontWeight: '800' as const,
    color: '#00C853',
    letterSpacing: -1.5,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#808080',
    fontWeight: '400' as const,
  },
  form: {
    gap: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '400' as const,
    padding: 0,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: '#2D6A4F',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  securityText: {
    fontSize: 12,
    color: '#3A3A3A',
    fontWeight: '500' as const,
  },
  toggleBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleText: {
    fontSize: 14,
    color: '#808080',
  },
  toggleTextBold: {
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -4,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#00C853',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 28,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  successCard: {
    backgroundColor: '#161616',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  successText: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
});
