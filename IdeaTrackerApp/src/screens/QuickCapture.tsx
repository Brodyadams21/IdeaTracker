import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { processIdea } from '../services/ai/ideaProcessor';
import { saveIdea, getRecentIdeas, FirebaseIdea } from '../config/firebase';
import { handleAndShowError } from '../utils/errorHandler';
import { createLogger } from '../utils/logger';
import { CATEGORY_CONFIG, PLACEHOLDERS } from '../constants';
import { setUserLocation } from '../services/locationService';
import Geolocation from '@react-native-community/geolocation';

export default function QuickCapture() {
  const [inputText, setInputText] = useState('');
  const [recentIdeas, setRecentIdeas] = useState<FirebaseIdea[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Animation values
  const successAnimation = new Animated.Value(0);
  
  // Logger
  const log = createLogger('QuickCapture');

  useEffect(() => {
    loadRecentIdeas();
    getCurrentLocation();
  }, []);

  // Refresh recent ideas and location when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      log.debug('Screen focused - refreshing recent ideas and location');
      loadRecentIdeas();
      getCurrentLocation();
    }, [])
  );

  useEffect(() => {
    if (showSuccess) {
      Animated.sequence([
        Animated.timing(successAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(successAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setShowSuccess(false));
    }
  }, [showSuccess]);

  const getCurrentLocation = () => {
    log.debug('Getting current location for location search...');
    
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        log.debug('Location obtained:', { latitude, longitude });
        
        // Update location service with user's current location
        setUserLocation({ latitude, longitude });
      },
      (error) => {
        log.warn('Location error:', error);
        // Don't show error to user - location search will work without it
      },
      { 
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes - use cached location if available
      }
    );
  };

  const loadRecentIdeas = async () => {
    try {
      log.debug('Loading recent ideas');
      const ideas = await getRecentIdeas(5);
      setRecentIdeas(ideas);
      log.debug('Loaded recent ideas', { count: ideas.length });
    } catch (error) {
      handleAndShowError(error, 'Error Loading Ideas', 'QuickCapture.loadRecentIdeas');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (!inputText.trim()) {
      Alert.alert('Error', 'Please enter an idea');
      return;
    }

    setIsSaving(true);
    setIsProcessing(true);

    try {
      log.info('Processing idea', { inputText });
      
      // Step 1: Process the idea with AI/local categorization
      const processedIdea = await processIdea(inputText.trim());
      log.info('Idea processed', {
        category: processedIdea.category,
        title: processedIdea.title,
        aiProcessed: processedIdea.metadata?.aiProcessed
      });

      setIsProcessing(false);

      // Step 2: Save the processed idea to Firebase
      const savedId = await saveIdea(processedIdea);
      log.info('Saved to Firebase', { savedId });

      // Step 3: Show success feedback
      setShowSuccess(true);
      setInputText('');
      
      // Reload ideas to show the new one
      loadRecentIdeas();

      // Optional: Show category-specific success message
      const categoryConfig = CATEGORY_CONFIG[processedIdea.category];
      Alert.alert(
        `${categoryConfig.icon} ${categoryConfig.label} Saved!`,
        processedIdea.title || processedIdea.processedText,
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      handleAndShowError(error, 'Error Saving Idea', 'QuickCapture.handleSave');
    } finally {
      setIsSaving(false);
      setIsProcessing(false);
    }
  };

  const renderRecentIdea = (idea: FirebaseIdea) => {
    const config = CATEGORY_CONFIG[idea.category] || CATEGORY_CONFIG.uncategorized;
    
    return (
      <TouchableOpacity 
        key={idea.id} 
        style={[styles.ideaItem, { borderLeftColor: config.color }]}
        activeOpacity={0.7}
      >
        <View style={styles.ideaHeader}>
          <Text style={styles.ideaIcon}>{config.icon}</Text>
          <View style={styles.ideaTitleContainer}>
            <Text style={styles.ideaTitle} numberOfLines={1}>
              {idea.title || idea.processedText}
            </Text>
            <Text style={styles.ideaCategory}>{config.label}</Text>
          </View>
          {idea.metadata?.aiProcessed && (
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          )}
        </View>
        <Text style={styles.ideaText} numberOfLines={2}>
          {idea.originalText}
        </Text>
        {idea.tags && idea.tags.length > 0 && (
          <View style={styles.tagContainer}>
            {idea.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>💡 Quick Capture</Text>
          <Text style={styles.subtitle}>
            {isProcessing ? 'AI is categorizing your idea...' : "What's your idea?"}
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={PLACEHOLDERS.IDEA_INPUT}
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            value={inputText}
            onChangeText={setInputText}
            autoFocus
            editable={!isSaving}
          />
          
          <TouchableOpacity 
            style={[
              styles.saveButton, 
              (!inputText.trim() || isSaving) && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!inputText.trim() || isSaving}
          >
            {isSaving ? (
              <View style={styles.savingContainer}>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.saveButtonText}>
                  {isProcessing ? 'Processing...' : 'Saving...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>Save Idea</Text>
            )}
          </TouchableOpacity>

          <View style={styles.helpText}>
            <Text style={styles.helpTextContent}>
              💡 AI will automatically categorize your idea as a location to visit, 
              habit to track, or one-time task
            </Text>
          </View>
        </View>

        {/* Success Animation */}
        <Animated.View 
          style={[
            styles.successMessage,
            {
              opacity: successAnimation,
              transform: [{
                translateY: successAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              }],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.successText}>✨ Idea Saved!</Text>
        </Animated.View>

        {refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : recentIdeas.length > 0 ? (
          <View style={styles.recentIdeas}>
            <Text style={styles.recentTitle}>Recent Ideas</Text>
            {recentIdeas.map(renderRecentIdea)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No ideas yet. Start capturing your thoughts!
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 5,
  },
  inputContainer: {
    padding: 20,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#bdc3c7',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  helpText: {
    marginTop: 12,
    paddingHorizontal: 8,
  },
  helpTextContent: {
    fontSize: 13,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 18,
  },
  successMessage: {
    position: 'absolute',
    top: 160,
    alignSelf: 'center',
    backgroundColor: '#2ecc71',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  successText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  recentIdeas: {
    padding: 20,
    paddingTop: 10,
  },
  recentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 16,
  },
  ideaItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
  },
  ideaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ideaIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  ideaTitleContainer: {
    flex: 1,
  },
  ideaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  ideaCategory: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  ideaText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  aiBadge: {
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeText: {
    fontSize: 10,
    color: '#007AFF',
    fontWeight: '600',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  tag: {
    backgroundColor: '#f0f3f7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#95a5a6',
    textAlign: 'center',
  },
});