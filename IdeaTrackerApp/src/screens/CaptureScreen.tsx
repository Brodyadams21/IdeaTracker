import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useApp } from '../context/AppContext';
import { IdeaCategory, Priority, IdeaStatus } from '../types';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import aiService from '../services/aiService';
import dataService from '../services/dataService';
import locationService from '../services/locationService';

const CaptureScreen: React.FC = () => {
  const { state, addIdea, setError, setLoading } = useApp();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('task');
  const [priority, setPriority] = useState<Priority>('medium');
  const [tags, setTags] = useState<string[]>([]);
  const [estimatedTime, setEstimatedTime] = useState<number>(30);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAIOptions, setShowAIOptions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);

  // Auto-process with AI when description changes
  useEffect(() => {
    if (description.length > 10 && state.user?.preferences.autoCategorize) {
      const timeoutId = setTimeout(() => {
        processWithAI();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [description, state.user?.preferences.autoCategorize]);

  const processWithAI = async () => {
    if (!description.trim() || !aiService.isAvailable()) return;
    
    try {
      setIsProcessing(true);
      const result = await aiService.categorizeIdea(description);
      
      setAiSuggestions(result);
      setCategory(result.category);
      setPriority(result.priority);
      setTags(result.tags);
      if (result.estimatedTime) {
        setEstimatedTime(result.estimatedTime);
      }
      
      setShowAIOptions(true);
    } catch (error) {
      console.warn('AI processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveIdea = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your idea');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description for your idea');
      return;
    }

    try {
      setLoading(true, 'Saving idea...');
      
      const newIdea = {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status: 'pending' as IdeaStatus,
        tags,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
        } : undefined,
        estimatedTime,
        aiProcessed: aiSuggestions !== null,
        userId: state.user?.id || 'anonymous',
      };

      const savedIdea = await dataService.saveIdea(newIdea);
      addIdea(savedIdea);
      
      // Reset form
      setTitle('');
      setDescription('');
      setCategory('task');
      setPriority('medium');
      setTags([]);
      setEstimatedTime(30);
      setLocation(null);
      setAiSuggestions(null);
      setShowAIOptions(false);
      
      Alert.alert('Success', 'Idea saved successfully!');
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to save idea'));
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = async () => {
    try {
      setLoading(true, 'Getting location...');
      const currentLocation = await locationService.getCurrentLocation();
      setLocation(currentLocation);
    } catch (error) {
      Alert.alert(
        'Location Error',
        'Could not get your current location. Please check your location permissions.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearLocation = () => {
    setLocation(null);
  };

  const getCategoryIcon = (cat: IdeaCategory): string => {
    switch (cat) {
      case 'location':
        return 'place';
      case 'habit':
        return 'repeat';
      case 'task':
        return 'check-circle';
      default:
        return 'lightbulb';
    }
  };

  const getPriorityColor = (_pri: Priority): string => {
    switch (_pri) {
      case 'urgent':
        return '#FF3B30';
      case 'high':
        return '#FF9500';
      case 'medium':
        return '#007AFF';
      case 'low':
        return '#8E8E93';
      default:
        return '#8E8E93';
    }
  };

  const renderCategorySelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorLabel}>Category</Text>
      <View style={styles.selectorButtons}>
        {(['location', 'habit', 'task'] as IdeaCategory[]).map((cat) => (
          <Button
            key={cat}
            title={cat.charAt(0).toUpperCase() + cat.slice(1)}
            onPress={() => setCategory(cat)}
            variant={category === cat ? 'primary' : 'outline'}
            size="small"
            icon={getCategoryIcon(cat)}
          />
        ))}
      </View>
    </View>
  );

  const renderPrioritySelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorLabel}>Priority</Text>
      <View style={styles.selectorButtons}>
        {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((pri) => (
          <Button
            key={pri}
            title={pri.charAt(0).toUpperCase() + pri.slice(1)}
            onPress={() => setPriority(pri)}
            variant={priority === pri ? 'primary' : 'outline'}
            size="small"
          />
        ))}
      </View>
    </View>
  );

  const renderAISuggestions = () => {
    if (!showAIOptions || !aiSuggestions) return null;

    return (
      <Card style={styles.aiSuggestionsCard}>
        <View style={styles.aiHeader}>
          <Icon name="psychology" size={20} color="#007AFF" />
          <Text style={styles.aiTitle}>AI Suggestions</Text>
          <TouchableOpacity onPress={() => setShowAIOptions(false)}>
            <Icon name="close" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.aiContent}>
          <View style={styles.aiItem}>
            <Text style={styles.aiLabel}>Category:</Text>
            <Text style={styles.aiValue}>{aiSuggestions.category}</Text>
          </View>
          
          <View style={styles.aiItem}>
            <Text style={styles.aiLabel}>Priority:</Text>
            <Text style={styles.aiValue}>{aiSuggestions.priority}</Text>
          </View>
          
          <View style={styles.aiItem}>
            <Text style={styles.aiLabel}>Tags:</Text>
            <Text style={styles.aiValue}>{aiSuggestions.tags.join(', ')}</Text>
          </View>
          
          {aiSuggestions.reasoning && (
            <View style={styles.aiItem}>
              <Text style={styles.aiLabel}>Reasoning:</Text>
              <Text style={styles.aiValue}>{aiSuggestions.reasoning}</Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  const renderLocationSection = () => (
    <View style={styles.locationContainer}>
      <Text style={styles.selectorLabel}>Location (Optional)</Text>
      
      {location ? (
        <Card style={styles.locationCard}>
          <View style={styles.locationInfo}>
            <Icon name="place" size={20} color="#007AFF" />
            <Text style={styles.locationText}>
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </Text>
            <TouchableOpacity onPress={handleClearLocation}>
              <Icon name="close" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </Card>
      ) : (
        <Button
          title="Add Current Location"
          onPress={handleGetLocation}
          variant="outline"
          icon="place"
        />
      )}
    </View>
  );

  if (state.loading.isLoading) {
    return <LoadingSpinner message={state.loading.loadingMessage} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Capture Idea</Text>
          <Text style={styles.subtitle}>What's on your mind?</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Give your idea a title"
          />

          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your idea in detail"
            multiline
            numberOfLines={4}
          />

          {isProcessing && (
            <View style={styles.processingContainer}>
              <LoadingSpinner size="small" message="AI is analyzing your idea..." />
            </View>
          )}

          {renderAISuggestions()}

          {renderCategorySelector()}
          {renderPrioritySelector()}
          {renderLocationSection()}

          <View style={styles.tagsContainer}>
            <Text style={styles.selectorLabel}>Tags</Text>
            <Input
              value={tags.join(', ')}
              onChangeText={(text) => setTags(text.split(',').map(tag => tag.trim()).filter(tag => tag))}
              placeholder="Enter tags separated by commas"
            />
          </View>

          <View style={styles.timeContainer}>
            <Text style={styles.selectorLabel}>Estimated Time (minutes)</Text>
            <Input
              value={estimatedTime.toString()}
              onChangeText={(text) => setEstimatedTime(parseInt(text) || 30)}
              placeholder="30"
              keyboardType="numeric"
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Save Idea"
          onPress={handleSaveIdea}
          disabled={!title.trim() || !description.trim()}
          loading={state.loading.isLoading}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  
  scrollView: {
    flex: 1,
  },
  
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  
  form: {
    padding: 20,
  },
  
  selectorContainer: {
    marginBottom: 20,
  },
  
  selectorLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 12,
  },
  
  selectorButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  
  aiSuggestionsCard: {
    backgroundColor: '#F0F8FF',
    borderColor: '#007AFF',
    borderWidth: 1,
    marginBottom: 20,
  },
  
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  aiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
    flex: 1,
  },
  
  aiContent: {
    gap: 8,
  },
  
  aiItem: {
    flexDirection: 'row',
  },
  
  aiLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    width: 80,
  },
  
  aiValue: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  
  locationContainer: {
    marginBottom: 20,
  },
  
  locationCard: {
    backgroundColor: '#F0F8FF',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  locationText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
    flex: 1,
  },
  
  tagsContainer: {
    marginBottom: 20,
  },
  
  timeContainer: {
    marginBottom: 20,
  },
  
  processingContainer: {
    marginBottom: 20,
  },
  
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
});

export default CaptureScreen;