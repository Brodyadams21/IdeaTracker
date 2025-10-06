import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { handleAndShowError } from '../utils/errorHandler';
import { createLogger } from '../utils/logger';
import { CATEGORY_CONFIG, PLACEHOLDERS } from '../constants';
import { FirebaseIdea, CategoryStats } from '../types';

// Use the centralized types from types/index.ts

export default function HomeScreen({ navigation }: any) {
  const [ideas, setIdeas] = useState<FirebaseIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [authReady, setAuthReady] = useState(false);
  const [stats, setStats] = useState<CategoryStats>({
    location: 0,
    oneTime: 0,
    habit: 0,
    uncategorized: 0,
  });
  
  // Logger
  const log = createLogger('HomeScreen');

  useEffect(() => {
    // Wait for auth to be ready before loading ideas
    const authSubscriber = auth().onAuthStateChanged((user) => {
      log.debug('Auth state changed', { userId: user?.uid || 'No user' });
      if (user) {
        setAuthReady(true);
      }
    });

    return authSubscriber;
  }, []);

  useEffect(() => {
    // Only load ideas when auth is ready
    if (authReady) {
      loadIdeas();
    }
  }, [authReady]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (authReady) {
        log.debug('Screen focused - refreshing ideas');
        loadIdeas();
      }
    }, [authReady])
  );

  const loadIdeas = async () => {
    try {
      const currentUser = auth().currentUser;
      log.debug('Loading ideas for user', { userId: currentUser?.uid });
      
      if (!currentUser) {
        log.error('No authenticated user');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const snapshot = await firestore()
        .collection('ideas')
        .where('userId', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .get();

      const fetchedIdeas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FirebaseIdea[];

      log.debug('Loaded ideas', { count: fetchedIdeas.length });
      setIdeas(fetchedIdeas);
      calculateStats(fetchedIdeas);
    } catch (error) {
      handleAndShowError(error, 'Error Loading Ideas', 'HomeScreen.loadIdeas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (ideas: FirebaseIdea[]) => {
    const newStats: CategoryStats = {
      location: 0,
      oneTime: 0,
      habit: 0,
      uncategorized: 0,
    };

    ideas.forEach(idea => {
      if (idea.category && newStats.hasOwnProperty(idea.category)) {
        newStats[idea.category as keyof CategoryStats]++;
      }
    });

    setStats(newStats);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadIdeas();
  };

  const filteredIdeas = selectedCategory === 'all' 
    ? ideas 
    : ideas.filter(idea => idea.category === selectedCategory);

  // Use centralized category configuration

  const toggleCompletion = async (ideaId: string, currentStatus: boolean) => {
    try {
      await firestore()
        .collection('ideas')
        .doc(ideaId)
        .update({
          completed: !currentStatus,
          completedAt: !currentStatus ? firestore.FieldValue.serverTimestamp() : null,
        });
      
      // Update local state
      setIdeas(prevIdeas => 
        prevIdeas.map(idea => 
          idea.id === ideaId 
            ? { ...idea, completed: !currentStatus }
            : idea
        )
      );
    } catch (error) {
      console.error('Error updating idea:', error);
    }
  };

  const renderIdea = ({ item }: { item: FirebaseIdea }) => (
    <TouchableOpacity
      style={[
        styles.ideaCard,
        { borderLeftColor: CATEGORY_CONFIG[item.category]?.color || '#95A5A6' },
        item.completed && styles.completedCard
      ]}
      onPress={() => navigation.navigate('IdeaDetail', { idea: item })}
      activeOpacity={0.7}
    >
      <View style={styles.ideaHeader}>
        <Text style={styles.ideaIcon}>
          {CATEGORY_CONFIG[item.category]?.icon || '📌'}
        </Text>
        <Text style={[styles.ideaTitle, item.completed && styles.completedText]} numberOfLines={1}>
          {item.title}
        </Text>
        <TouchableOpacity
          onPress={() => toggleCompletion(item.id, item.completed)}
          style={styles.checkButton}
        >
          <Text style={styles.checkIcon}>
            {item.completed ? '✅' : '⭕'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.ideaText, item.completed && styles.completedText]} numberOfLines={2}>
        {item.processedText || item.originalText}
      </Text>
      
      <View style={styles.ideaFooter}>
        {item.metadata?.estimatedTime && (
          <Text style={styles.ideaMetadata}>⏱️ {item.metadata.estimatedTime}</Text>
        )}
        {item.location && (
          <Text style={styles.ideaMetadata}>📍 {item.location.placeName || item.location.address}</Text>
        )}
        {item.habitDetails?.frequency && (
          <Text style={styles.ideaMetadata}>🔄 {item.habitDetails.frequency}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const CategoryFilter = ({ category, label, count }: { category: string; label: string; count?: number }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedCategory === category && styles.filterButtonActive,
        selectedCategory === category && { backgroundColor: CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]?.color || '#007AFF' }
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text style={[
        styles.filterText,
        selectedCategory === category && styles.filterTextActive
      ]}>
        {label} {count !== undefined && `(${count})`}
      </Text>
    </TouchableOpacity>
  );

  if (loading || !authReady) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {!authReady ? 'Authenticating...' : 'Loading your ideas...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💡 My Ideas</Text>
        <Text style={styles.subtitle}>
          {ideas.length} total • {ideas.filter(i => !i.completed).length} active
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <CategoryFilter category="all" label="All" count={ideas.length} />
        <CategoryFilter category="location" label="📍 Places" count={stats.location} />
        <CategoryFilter category="habit" label="🔄 Habits" count={stats.habit} />
        <CategoryFilter category="oneTime" label="✨ One-Time" count={stats.oneTime} />
        <CategoryFilter category="uncategorized" label="📌 Other" count={stats.uncategorized} />
      </ScrollView>

      <FlatList
        data={filteredIdeas}
        renderItem={renderIdea}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>
              {selectedCategory === 'all' ? '💭' : CATEGORY_CONFIG[selectedCategory as keyof typeof CATEGORY_CONFIG]?.icon || '💭'}
            </Text>
            <Text style={styles.emptyText}>
              {selectedCategory === 'all' 
                ? 'No ideas yet. Start capturing!' 
                : `No ${selectedCategory} ideas yet`}
            </Text>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={() => navigation.navigate('Capture')}
            >
              <Text style={styles.captureButtonText}>Capture an Idea</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  filterContainer: {
    backgroundColor: 'white',
    maxHeight: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  ideaCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    opacity: 0.7,
    backgroundColor: '#f9f9f9',
  },
  ideaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ideaIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  ideaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  checkButton: {
    padding: 5,
  },
  checkIcon: {
    fontSize: 20,
  },
  ideaText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  ideaFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ideaMetadata: {
    fontSize: 12,
    color: '#999',
    marginRight: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  captureButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  captureButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});