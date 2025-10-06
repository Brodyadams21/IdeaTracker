import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useApp } from '../context/AppContext';
import { Idea, IdeaCategory, Priority, IdeaStatus } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import dataService from '../services/dataService';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { state, addIdea, updateIdea, deleteIdea, setError, clearError, setLoading } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // Load ideas on component mount
  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    try {
      setLoading(true, 'Loading ideas...');
      const ideas = await dataService.getIdeas();
      // Update context with loaded ideas
      ideas.forEach(idea => addIdea(idea));
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to load ideas'));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadIdeas();
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to refresh ideas'));
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleIdeaPress = (idea: Idea) => {
    navigation.navigate('IdeaDetail', { ideaId: idea.id });
  };

  const handleIdeaComplete = async (idea: Idea) => {
    try {
      const updatedIdea = {
        ...idea,
        status: idea.status === 'completed' ? 'pending' : 'completed',
        completedAt: idea.status === 'completed' ? undefined : new Date(),
      };
      
      await dataService.updateIdea(idea.id, updatedIdea);
      updateIdea(idea.id, updatedIdea);
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to update idea'));
    }
  };

  const handleDeleteIdea = (idea: Idea) => {
    Alert.alert(
      'Delete Idea',
      'Are you sure you want to delete this idea?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dataService.deleteIdea(idea.id);
              deleteIdea(idea.id);
            } catch (error) {
              setError(error instanceof Error ? error : new Error('Failed to delete idea'));
            }
          },
        },
      ]
    );
  };

  const getFilteredIdeas = (): Idea[] => {
    let filtered = state.ideas;

    // Apply category filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(idea => idea.category === selectedFilter);
    }

    // Apply search query
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(idea =>
        idea.title.toLowerCase().includes(query) ||
        idea.description.toLowerCase().includes(query) ||
        idea.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const field = state.sort.field;
      const direction = state.sort.direction;
      
      let aValue = a[field];
      let bValue = b[field];
      
      if (field === 'createdAt' || field === 'updatedAt' || field === 'completedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  };

  const getCategoryIcon = (category: IdeaCategory): string => {
    switch (category) {
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

  const getPriorityColor = (priority: Priority): string => {
    switch (priority) {
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

  const getStatusColor = (status: IdeaStatus): string => {
    switch (status) {
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

  const renderIdeaItem = ({ item }: { item: Idea }) => (
    <Card
      onPress={() => handleIdeaPress(item)}
      style={styles.ideaCard}
    >
      <View style={styles.ideaHeader}>
        <View style={styles.ideaTitleContainer}>
          <Icon
            name={getCategoryIcon(item.category)}
            size={20}
            color={getPriorityColor(item.priority)}
            style={styles.categoryIcon}
          />
          <Text style={styles.ideaTitle} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        
        <View style={styles.ideaActions}>
          <TouchableOpacity
            onPress={() => handleIdeaComplete(item)}
            style={[
              styles.actionButton,
              { backgroundColor: getStatusColor(item.status) }
            ]}
          >
            <Icon
              name={item.status === 'completed' ? 'check' : 'check-circle-outline'}
              size={16}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => handleDeleteIdea(item)}
            style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
          >
            <Icon name="delete" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.ideaDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.ideaFooter}>
        <View style={styles.tagsContainer}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        
        <Text style={styles.ideaDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="lightbulb-outline" size={64} color="#8E8E93" />
      <Text style={styles.emptyTitle}>No ideas yet</Text>
      <Text style={styles.emptyMessage}>
        Tap the + button to capture your first idea!
      </Text>
      <Button
        title="Add First Idea"
        onPress={() => navigation.navigate('Capture')}
        style={styles.emptyButton}
      />
    </View>
  );

  const renderFilterButton = (filter: string, label: string) => (
    <TouchableOpacity
      key={filter}
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filter && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (state.loading.isLoading) {
    return <LoadingSpinner message={state.loading.loadingMessage} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Ideas</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Icon name="settings" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { key: 'all', label: 'All' },
            { key: 'location', label: 'Locations' },
            { key: 'habit', label: 'Habits' },
            { key: 'task', label: 'Tasks' },
          ]}
          renderItem={({ item }) => renderFilterButton(item.key, item.label)}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      <FlatList
        data={getFilteredIdeas()}
        renderItem={renderIdeaItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  
  settingsButton: {
    padding: 8,
  },
  
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  
  filtersList: {
    paddingHorizontal: 16,
  },
  
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  
  listContainer: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  
  ideaCard: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  
  ideaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  ideaTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  categoryIcon: {
    marginRight: 8,
  },
  
  ideaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  
  ideaActions: {
    flexDirection: 'row',
  },
  
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  
  ideaDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 12,
  },
  
  ideaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  tagsContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  
  tag: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  
  tagText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  
  ideaDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  
  emptyMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  
  emptyButton: {
    paddingHorizontal: 24,
  },
});

export default HomeScreen;