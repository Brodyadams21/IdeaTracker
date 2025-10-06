import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useApp } from '../context/AppContext';
import { Idea, IdeaCategory, Priority, IdeaStatus } from '../types';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';

const ListsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { state } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<IdeaCategory | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<Priority | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<IdeaStatus | 'all'>('all');

  const filteredIdeas = useMemo(() => {
    let filtered = state.ideas;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(idea => idea.category === selectedCategory);
    }

    if (selectedPriority !== 'all') {
      filtered = filtered.filter(idea => idea.priority === selectedPriority);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(idea => idea.status === selectedStatus);
    }

    return filtered;
  }, [state.ideas, selectedCategory, selectedPriority, selectedStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleIdeaPress = (idea: Idea) => {
    navigation.navigate('IdeaDetail', { ideaId: idea.id });
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

  const getStatusIcon = (status: IdeaStatus): string => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'in_progress':
        return 'play-circle';
      case 'cancelled':
        return 'cancel';
      case 'pending':
        return 'schedule';
      default:
        return 'help';
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
        
        <View style={styles.ideaStatus}>
          <Icon
            name={getStatusIcon(item.status)}
            size={16}
            color={getStatusColor(item.status)}
          />
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

  const renderFilterButton = (
    value: string,
    label: string,
    currentValue: string,
    onPress: (value: string) => void
  ) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        currentValue === value && styles.filterButtonActive
      ]}
      onPress={() => onPress(value)}
    >
      <Text style={[
        styles.filterButtonText,
        currentValue === value && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="list" size={64} color="#8E8E93" />
      <Text style={styles.emptyTitle}>No ideas found</Text>
      <Text style={styles.emptyMessage}>
        Try adjusting your filters or add some new ideas!
      </Text>
    </View>
  );

  const renderStats = () => {
    const total = state.ideas.length;
    const completed = state.ideas.filter(idea => idea.status === 'completed').length;
    const inProgress = state.ideas.filter(idea => idea.status === 'in_progress').length;
    const pending = state.ideas.filter(idea => idea.status === 'pending').length;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#34C759' }]}>{completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#007AFF' }]}>{inProgress}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#8E8E93' }]}>{pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>
    );
  };

  if (state.loading.isLoading) {
    return <LoadingSpinner message={state.loading.loadingMessage} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lists</Text>
        <Text style={styles.subtitle}>Organize your ideas</Text>
      </View>

      {renderStats()}

      <View style={styles.filtersContainer}>
        <Text style={styles.filtersTitle}>Category</Text>
        <View style={styles.filtersRow}>
          {renderFilterButton('all', 'All', selectedCategory, setSelectedCategory)}
          {renderFilterButton('location', 'Locations', selectedCategory, setSelectedCategory)}
          {renderFilterButton('habit', 'Habits', selectedCategory, setSelectedCategory)}
          {renderFilterButton('task', 'Tasks', selectedCategory, setSelectedCategory)}
        </View>

        <Text style={styles.filtersTitle}>Priority</Text>
        <View style={styles.filtersRow}>
          {renderFilterButton('all', 'All', selectedPriority, setSelectedPriority)}
          {renderFilterButton('urgent', 'Urgent', selectedPriority, setSelectedPriority)}
          {renderFilterButton('high', 'High', selectedPriority, setSelectedPriority)}
          {renderFilterButton('medium', 'Medium', selectedPriority, setSelectedPriority)}
          {renderFilterButton('low', 'Low', selectedPriority, setSelectedPriority)}
        </View>

        <Text style={styles.filtersTitle}>Status</Text>
        <View style={styles.filtersRow}>
          {renderFilterButton('all', 'All', selectedStatus, setSelectedStatus)}
          {renderFilterButton('pending', 'Pending', selectedStatus, setSelectedStatus)}
          {renderFilterButton('in_progress', 'In Progress', selectedStatus, setSelectedStatus)}
          {renderFilterButton('completed', 'Completed', selectedStatus, setSelectedStatus)}
          {renderFilterButton('cancelled', 'Cancelled', selectedStatus, setSelectedStatus)}
        </View>
      </View>

      <FlatList
        data={filteredIdeas}
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
  
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    marginTop: 12,
  },
  
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
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
  
  ideaStatus: {
    padding: 4,
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
    paddingVertical: 60,
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
  },
});

export default ListsScreen;