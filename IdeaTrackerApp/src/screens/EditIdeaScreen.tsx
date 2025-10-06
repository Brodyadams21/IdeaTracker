import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useApp } from '../context/AppContext';
import { Idea, IdeaCategory, Priority, IdeaStatus } from '../types';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import dataService from '../services/dataService';

const EditIdeaScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { state, updateIdea, setError, setLoading } = useApp();
  
  const { ideaId } = route.params as { ideaId: string };
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('task');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<IdeaStatus>('pending');
  const [tags, setTags] = useState<string[]>([]);
  const [estimatedTime, setEstimatedTime] = useState<number>(30);
  const [loading, setLoadingState] = useState(true);

  useEffect(() => {
    loadIdea();
  }, [ideaId]);

  const loadIdea = async () => {
    try {
      setLoadingState(true);
      const foundIdea = state.ideas.find(i => i.id === ideaId);
      
      if (foundIdea) {
        setTitle(foundIdea.title);
        setDescription(foundIdea.description);
        setCategory(foundIdea.category);
        setPriority(foundIdea.priority);
        setStatus(foundIdea.status);
        setTags(foundIdea.tags);
        setEstimatedTime(foundIdea.estimatedTime || 30);
      } else {
        // Try to load from service
        const loadedIdea = await dataService.getIdea(ideaId);
        if (loadedIdea) {
          setTitle(loadedIdea.title);
          setDescription(loadedIdea.description);
          setCategory(loadedIdea.category);
          setPriority(loadedIdea.priority);
          setStatus(loadedIdea.status);
          setTags(loadedIdea.tags);
          setEstimatedTime(loadedIdea.estimatedTime || 30);
        } else {
          Alert.alert('Error', 'Idea not found');
          navigation.goBack();
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to load idea'));
    } finally {
      setLoadingState(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your idea');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description for your idea');
      return;
    }

    try {
      setLoading(true, 'Saving changes...');
      
      const updates = {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status,
        tags,
        estimatedTime,
      };

      await dataService.updateIdea(ideaId, updates);
      updateIdea(ideaId, updates);
      
      Alert.alert('Success', 'Idea updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to update idea'));
    } finally {
      setLoading(false);
    }
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

  const getPriorityColor = (pri: Priority): string => {
    switch (pri) {
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

  const getStatusColor = (stat: IdeaStatus): string => {
    switch (stat) {
      case 'completed':
        return '#34C759';
      case 'in_progress':
        return '#007AFF';
      case 'cancelled':
        return '#FF3B30';
      case 'pending':
        return '#8E8E93';
      default:
        return '#8E8E93';
    }
  };

  const renderSelector = (
    label: string,
    options: string[],
    selectedValue: string,
    onSelect: (value: string) => void,
    getIcon?: (value: string) => string,
    getColor?: (value: string) => string
  ) => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorLabel}>{label}</Text>
      <View style={styles.selectorButtons}>
        {options.map((option) => (
          <Button
            key={option}
            title={option.charAt(0).toUpperCase() + option.slice(1)}
            onPress={() => onSelect(option)}
            variant={selectedValue === option ? 'primary' : 'outline'}
            size="small"
            icon={getIcon ? getIcon(option) : undefined}
          />
        ))}
      </View>
    </View>
  );

  if (loading) {
    return <LoadingSpinner message="Loading idea..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Idea</Text>
          <Text style={styles.subtitle}>Update your idea details</Text>
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

          {renderSelector(
            'Category',
            ['location', 'habit', 'task'],
            category,
            setCategory,
            getCategoryIcon
          )}

          {renderSelector(
            'Priority',
            ['low', 'medium', 'high', 'urgent'],
            priority,
            setPriority,
            undefined,
            getPriorityColor
          )}

          {renderSelector(
            'Status',
            ['pending', 'in_progress', 'completed', 'cancelled'],
            status,
            setStatus,
            undefined,
            getStatusColor
          )}

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
          title="Cancel"
          onPress={() => navigation.goBack()}
          variant="outline"
        />
        <Button
          title="Save Changes"
          onPress={handleSave}
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
  
  tagsContainer: {
    marginBottom: 20,
  },
  
  timeContainer: {
    marginBottom: 20,
  },
  
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
});

export default EditIdeaScreen;