import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Colors from '@/constants/colors';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

class ProfileErrorBoundaryClass extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    console.log('[ErrorBoundary] Caught error:', error.message);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.log('[ErrorBoundary] Error details:', error.message);
    console.log('[ErrorBoundary] Component stack:', info.componentStack?.slice(0, 500));
  }

  handleRetry = () => {
    this.setState((prev) => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 }));
  };

  render() {
    if (this.state.hasError) {
      const tooManyRetries = this.state.retryCount >= 3;
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {tooManyRetries
              ? 'This issue keeps happening. Please restart the app.'
              : 'An unexpected error occurred. This is usually temporary.'}
          </Text>
          {!tooManyRetries && (
            <Pressable
              style={styles.retryBtn}
              onPress={this.handleRetry}
              testID="error-boundary-retry"
            >
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

export default ProfileErrorBoundaryClass;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 32,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#111113',
  },
  message: {
    fontSize: 14,
    color: '#86868B',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: '#1B5E3B',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 22,
    marginTop: 8,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
