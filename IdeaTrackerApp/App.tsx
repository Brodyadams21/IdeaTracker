import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { signInAnonymously, onAuthStateChanged } from './src/config/firebase';

function App(): React.JSX.Element {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Subscribe to auth state changes
    const subscriber = onAuthStateChanged((user) => {
      console.log('[App] Auth state changed. User:', user?.uid || 'No user');
      setUser(user);
      
      if (!user) {
        // No user, sign in anonymously
        console.log('[App] No user found, signing in anonymously...');
        signInAnonymously()
          .then((result) => {
            console.log('[App] Anonymous sign in successful:', result?.uid);
          })
          .catch((error) => {
            console.error('[App] Anonymous sign in failed:', error);
            // Still let the app load, some features might work offline
          })
          .finally(() => {
            setInitializing(false);
          });
      } else {
        // User exists
        console.log('[App] User already signed in:', user.uid);
        setInitializing(false);
      }
    });

    // Clean up subscription
    return subscriber;
  }, []);

  // Show loading screen while checking auth
  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading IdeaTracker...</Text>
      </View>
    );
  }

  // AppNavigator already has NavigationContainer, so don't wrap it
  return <AppNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default App;