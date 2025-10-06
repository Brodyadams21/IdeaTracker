// Demo data for testing IdeaTracker
// This file contains sample ideas to help users understand the app

import { ProcessedIdea } from '../services/ai/ideaProcessor';

export const demoIdeas: ProcessedIdea[] = [
  {
    id: 'demo-1',
    originalText: 'Try Papa Johns pizza',
    category: 'location',
    processedText: 'Visit Papa Johns restaurant to try their pizza',
    title: 'Try Papa Johns Pizza',
    tags: ['location', 'restaurant', 'pizza', 'food', 'dining'],
    createdAt: new Date(),
    completed: false,
    location: {
      placeName: 'Papa Johns',
      placeType: 'restaurant',
      searchQuery: 'Papa Johns pizza',
      address: 'Papa Johns restaurant',
    },
    metadata: {
      estimatedTime: '1 hour',
      priority: 'medium',
      aiProcessed: false,
      cuisine: 'pizza',
      activityType: 'dining',
    },
  },
  {
    id: 'demo-2',
    originalText: 'Learn French language',
    category: 'habit',
    processedText: 'Practice and learn French language daily',
    title: 'Learn French',
    tags: ['habit', 'learning', 'language', 'french', 'education'],
    createdAt: new Date(),
    completed: false,
    habitDetails: {
      frequency: 'daily',
      duration: '30 minutes',
    },
    metadata: {
      estimatedTime: '30 minutes',
      priority: 'high',
      aiProcessed: false,
      activityType: 'learning',
    },
  },
  {
    id: 'demo-3',
    originalText: 'Try Chinese food',
    category: 'oneTime',
    processedText: 'Try Chinese cuisine at a local restaurant',
    title: 'Try Chinese Food',
    tags: ['oneTime', 'food', 'chinese', 'cuisine', 'food-adventure'],
    createdAt: new Date(),
    completed: false,
    metadata: {
      estimatedTime: '2 hours',
      priority: 'medium',
      aiProcessed: false,
      cuisine: 'chinese',
      activityType: 'dining',
    },
  },
  {
    id: 'demo-4',
    originalText: 'Visit Central Park',
    category: 'location',
    processedText: 'Explore Central Park in New York City',
    title: 'Visit Central Park',
    tags: ['location', 'park', 'outdoor', 'sightseeing', 'new york'],
    createdAt: new Date(),
    completed: false,
    location: {
      placeName: 'Central Park',
      placeType: 'park',
      searchQuery: 'Central Park New York',
      address: 'Central Park, New York, NY',
      city: 'New York',
      country: 'USA',
    },
    metadata: {
      estimatedTime: '3 hours',
      priority: 'low',
      aiProcessed: false,
      activityType: 'sightseeing',
    },
  },
  {
    id: 'demo-5',
    originalText: 'Meditate every morning',
    category: 'habit',
    processedText: 'Practice meditation as a daily morning routine',
    title: 'Morning Meditation',
    tags: ['habit', 'meditation', 'morning', 'wellness', 'routine'],
    createdAt: new Date(),
    completed: false,
    habitDetails: {
      frequency: 'daily',
      duration: '15 minutes',
    },
    metadata: {
      estimatedTime: '15 minutes',
      priority: 'high',
      aiProcessed: false,
      activityType: 'wellness',
    },
  },
];

export const demoCategories = {
  location: demoIdeas.filter(idea => idea.category === 'location'),
  habit: demoIdeas.filter(idea => idea.category === 'habit'),
  oneTime: demoIdeas.filter(idea => idea.category === 'oneTime'),
};

export const demoStats = {
  total: demoIdeas.length,
  byCategory: {
    location: demoCategories.location.length,
    habit: demoCategories.habit.length,
    oneTime: demoCategories.oneTime.length,
  },
  completed: 0,
  withAI: 0,
};

// Helper function to get demo ideas by category
export const getDemoIdeasByCategory = (category: 'location' | 'habit' | 'oneTime') => {
  return demoCategories[category] || [];
};

// Helper function to get random demo idea
export const getRandomDemoIdea = () => {
  const randomIndex = Math.floor(Math.random() * demoIdeas.length);
  return demoIdeas[randomIndex];
};

export default demoIdeas;
