import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useApp } from '../context/AppContext';
import { Idea, IdeaStatus } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import dataService from '../services/dataService';

const IdeaDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { state, updateIdea, deleteIdea, setError } = useApp();
  
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);

  const { ideaId } = route.params as { ideaId: string };

  useEffect(() => {
    loadIdea();
  }, [ideaId]);

  const loadIdea = async () => {
    try {
      setLoading(true);
      const foundIdea = state.ideas.find(i => i.id === ideaId);
      if (foundIdea) {
        setIdea(foundIdea);
      } else {
        // Try to load from service
        const loadedIdea = await dataService.getIdea(ideaId);
        if (loadedIdea) {
          setIdea(loadedIdea);
        } else {
          Alert.alert('Error', 'Idea not found');
          navigation.goBack();
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to load idea'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate('EditIdea', { ideaId });
  };

  const handleToggleStatus = async () => {
    if (!idea) return;

    try {
      const newStatus: IdeaStatus = idea.status === 'completed' ? 'pending' : 'completed';
      const updatedIdea = {
        ...idea,
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date() : undefined,
      };

      await dataService.updateIdea(idea.id, updatedIdea);
      updateIdea(idea.id, updatedIdea);
      setIdea(updatedIdea);
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to update idea'));
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Idea',
      'Are you sure you want to delete this idea? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dataService.deleteIdea(idea!.id);
              deleteIdea(idea!.id);
              navigation.goBack();
            } catch (error) {
              setError(error instanceof Error ? error : new Error('Failed to delete idea'));
            }
          },
        },
      ]
    );
  };

  const getCategoryIcon = (category: string): string => {
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

  const getPriorityColor = (priority: string): string => {
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

  const getStatusColor = (status: string): string => {
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

  const getStatusIcon = (status: string): string => {
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

  if (loading) {
    return <LoadingSpinner message="Loading idea..." />;
  }

  if (!idea) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>Idea not found</Text>
        <Text style={styles.errorMessage}>
          The idea you're looking for doesn't exist or has been deleted.
        </Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={styles.errorButton}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleEdit}
            >
              <Icon name="edit" size={20} color="#007AFF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDelete}
            >
              <Icon name="delete" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.titleContainer}>
          <Icon
            name={getCategoryIcon(idea.category)}
            size={24}
            color={getPriorityColor(idea.priority)}
            style={styles.categoryIcon}
          />
          <Text style={styles.title}>{idea.title}</Text>
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(idea.status) }
          ]}>
            <Icon
              name={getStatusIcon(idea.status)}
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.statusText}>
              {idea.status.charAt(0).toUpperCase() + idea.status.slice(1)}
            </Text>
          </View>
          
          <View style={[
            styles.priorityBadge,
            { backgroundColor: getPriorityColor(idea.priority) }
          ]}>
            <Text style={styles.priorityText}>
              {idea.priority.charAt(0).toUpperCase() + idea.priority.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <Card style={styles.descriptionCard}>
          <Text style={styles.descriptionTitle}>Description</Text>
          <Text style={styles.description}>{idea.description}</Text>
        </Card>

        {idea.tags.length > 0 && (
          <Card style={styles.tagsCard}>
            <Text style={styles.tagsTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {idea.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {idea.location && (
          <Card style={styles.locationCard}>
            <Text style={styles.locationTitle}>Location</Text>
            <View style={styles.locationInfo}>
              <Icon name="place" size={20} color="#007AFF" />
              <Text style={styles.locationText}>
                {idea.location.address || 
                 `${idea.location.latitude.toFixed(4)}, ${idea.location.longitude.toFixed(4)}`}
              </Text>
            </View>
          </Card>
        )}

        <Card style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Details</Text>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Category:</Text>
            <Text style={styles.detailValue}>
              {idea.category.charAt(0).toUpperCase() + idea.category.slice(1)}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Priority:</Text>
            <Text style={styles.detailValue}>
              {idea.priority.charAt(0).toUpperCase() + idea.priority.slice(1)}
            </Text>
          </View>
          
          {idea.estimatedTime && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Estimated Time:</Text>
              <Text style={styles.detailValue}>{idea.estimatedTime} minutes</Text>
            </View>
          )}
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailValue}>
              {new Date(idea.createdAt).toLocaleDateString()} at{' '}
              {new Date(idea.createdAt).toLocaleTimeString()}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Last Updated:</Text>
            <Text style={styles.detailValue}>
              {new Date(idea.updatedAt).toLocaleDateString()} at{' '}
              {new Date(idea.updatedAt).toLocaleTimeString()}
            </Text>
          </View>
          
          {idea.completedAt && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Completed:</Text>
              <Text style={styles.detailValue}>
                {new Date(idea.completedAt).toLocaleDateString()} at{' '}
                {new Date(idea.completedAt).toLocaleTimeString()}
              </Text>
            </View>
          )}
        </Card>
      </View>

      <View style={styles.footer}>
        <Button
          title={idea.status === 'completed' ? 'Mark as Pending' : 'Mark as Completed'}
          onPress={handleToggleStatus}
          variant={idea.status === 'completed' ? 'outline' : 'primary'}
          icon={idea.status === 'completed' ? 'schedule' : 'check'}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  backButton: {
    padding: 8,
  },
  
  headerActions: {
    flexDirection: 'row',
  },
  
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  categoryIcon: {
    marginRight: 12,
  },
  
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
  },
  
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  
  priorityText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  content: {
    padding: 20,
  },
  
  descriptionCard: {
    marginBottom: 16,
  },
  
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  
  description: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 24,
  },
  
  tagsCard: {
    marginBottom: 16,
  },
  
  tagsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  
  tag: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  
  tagText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  
  locationCard: {
    marginBottom: 16,
  },
  
  locationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  locationText: {
    fontSize: 16,
    color: '#8E8E93',
    marginLeft: 8,
    flex: 1,
  },
  
  detailsCard: {
    marginBottom: 16,
  },
  
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  
  detailLabel: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  
  detailValue: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
    textAlign: 'right',
  },
  
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  
  errorMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  
  errorButton: {
    paddingHorizontal: 24,
  },
});

export default IdeaDetailScreen;