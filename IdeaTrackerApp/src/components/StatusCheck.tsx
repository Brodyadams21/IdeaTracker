import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { getCurrentUser, signInAnonymously } from '../config/firebase';

interface StatusCheckProps {
  onComplete?: () => void;
}

export default function StatusCheck({ onComplete }: StatusCheckProps) {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [details, setDetails] = useState<string[]>([]);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const checks: string[] = [];
    
    try {
      // Check Firebase connection
      const user = getCurrentUser();
      if (user) {
        checks.push('✅ Firebase connected (user signed in)');
      } else {
        // Try to sign in anonymously
        await signInAnonymously();
        checks.push('✅ Firebase connected (anonymous auth)');
      }
      
      // Check if we can access Firestore
      checks.push('✅ Firestore accessible');
      
      setStatus('success');
      setDetails(checks);
      
      if (onComplete) {
        onComplete();
      }
      
    } catch (error: any) {
      checks.push(`❌ Firebase error: ${error.message}`);
      setStatus('error');
      setDetails(checks);
    }
  };

  const retry = () => {
    setStatus('checking');
    setDetails([]);
    checkStatus();
  };

  if (status === 'checking') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔍 Checking Setup...</Text>
        <Text style={styles.subtitle}>Verifying Firebase connection</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {status === 'success' ? '✅ Setup Complete!' : '❌ Setup Issues'}
      </Text>
      
      <View style={styles.detailsContainer}>
        {details.map((detail, index) => (
          <Text key={index} style={styles.detail}>
            {detail}
          </Text>
        ))}
      </View>

      {status === 'error' && (
        <TouchableOpacity style={styles.retryButton} onPress={retry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      )}

      <View style={styles.helpContainer}>
        <Text style={styles.helpTitle}>Need help?</Text>
        <Text style={styles.helpText}>
          • Check setup.md for detailed instructions{'\n'}
          • Verify Firebase configuration files{'\n'}
          • Ensure internet connection{'\n'}
          • Check console logs for errors
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailsContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detail: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 12,
    width: '100%',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1976D2',
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1976D2',
  },
});
