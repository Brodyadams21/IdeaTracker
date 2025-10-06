import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { ProcessedIdea } from '../services/ai/ideaProcessor';

// Collection references
export const ideasCollection = firestore().collection('ideas');
export const usersCollection = firestore().collection('users');
export const habitsCollection = firestore().collection('habits');

// Types
export interface FirebaseIdea extends ProcessedIdea {
  userId: string;
  updatedAt?: Date;
}

// Timeout wrapper for Firebase operations
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Firebase operation timeout')), timeoutMs)
    )
  ]);
};

// Debug logging
const DEBUG = true;
const log = (...args: any[]) => {
  if (DEBUG) console.log('[Firebase]', ...args);
};

// Helper function to safely convert Firebase timestamps
const safeTimestampToDate = (timestamp: any): Date => {
  if (!timestamp) {
    return new Date();
  }
  
  // Check if it's a Firebase Timestamp with toDate method
  if (timestamp && typeof timestamp.toDate === 'function') {
    try {
      return timestamp.toDate();
    } catch (error) {
      console.warn('Error converting timestamp:', error);
      return new Date();
    }
  }
  
  // Check if it's already a Date
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  // Try to parse as string or number
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  
  // Default to current date
  return new Date();
};

// Save a processed idea to Firebase with enhanced metadata
export const saveIdea = async (processedIdea: ProcessedIdea): Promise<string> => {
  try {
    log('Starting to save idea:', {
      category: processedIdea.category,
      title: processedIdea.title,
      tags: processedIdea.tags
    });
    
    // Get current user
    const userId = auth().currentUser?.uid || 'anonymous';
    
    // Prepare data for Firebase - handle undefined values
    const ideaData: Record<string, any> = {
      // Core fields
      id: processedIdea.id,
      originalText: processedIdea.originalText,
      category: processedIdea.category,
      processedText: processedIdea.processedText,
      title: processedIdea.title || processedIdea.processedText.slice(0, 50),
      tags: processedIdea.tags || [],
      completed: processedIdea.completed || false,
      
      // Timestamps
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      
      // User info
      userId: userId,
      
      // AI processing info
      aiProcessed: processedIdea.metadata?.aiProcessed || false,
    };
    
    // Add enhanced location data if present
    if (processedIdea.location) {
      ideaData.location = {
        latitude: processedIdea.location.latitude || null,
        longitude: processedIdea.location.longitude || null,
        address: processedIdea.location.address || null,
        placeName: processedIdea.location.placeName || null,
        searchQuery: processedIdea.location.searchQuery || null,
        placeType: processedIdea.location.placeType || null,
        country: processedIdea.location.country || null,
        city: processedIdea.location.city || null,
      };
      log('Including enhanced location data:', ideaData.location);
    }
    
    // Add enhanced habit details if present
    if (processedIdea.habitDetails) {
      ideaData.habitDetails = {
        frequency: processedIdea.habitDetails.frequency || 'daily',
        targetDays: processedIdea.habitDetails.targetDays || [],
        reminderTime: processedIdea.habitDetails?.reminderTime || null,
        streak: processedIdea.habitDetails?.streak || 0,
        duration: processedIdea.habitDetails?.duration || null,
      };
      log('Including habit details:', ideaData.habitDetails);
    }
    
    // Add enhanced metadata if present
    if (processedIdea.metadata) {
      ideaData.metadata = {
        estimatedTime: processedIdea.metadata.estimatedTime || null,
        difficulty: processedIdea.metadata.difficulty || 'medium',
        priority: processedIdea.metadata.priority || 'medium',
        processingTime: processedIdea.metadata.processingTime || null,
        sentiment: processedIdea.metadata.sentiment || null,
        actionVerb: processedIdea.metadata.actionVerb || null,
        cuisine: processedIdea.metadata.cuisine || null,
        activityType: processedIdea.metadata.activityType || null,
      };
      log('Including rich metadata:', ideaData.metadata);
    }
    
    // Remove any undefined values (Firebase doesn't like them)
    const cleanedData = JSON.parse(JSON.stringify(ideaData));
    
    log('Saving to Firestore with enhanced data');
    
    // Use the ID from processedIdea as document ID
    const docRef = ideasCollection.doc(processedIdea.id);
    await withTimeout(docRef.set(cleanedData), 5000);
    
    log('Idea saved successfully:', processedIdea.id);
    
    // If it's a habit, also create/update in habits collection
    if (processedIdea.category === 'habit') {
      await saveHabitTracking(processedIdea.id, processedIdea);
    }
    
    // If it's a location, optionally fetch coordinates (future enhancement)
    if (processedIdea.category === 'location' && !processedIdea.location?.latitude) {
      // TODO: Could integrate with Google Places API here
      log('Location saved without coordinates. Consider geocoding:', processedIdea.location?.searchQuery);
    }
    
    return processedIdea.id;
  } catch (error: any) {
    console.error('[Firebase] Error saving idea:', error);
    
    // Check if it's a network error
    if (error.code === 'unavailable' || error.message?.includes('offline')) {
      throw new Error('Cannot save while offline. Please check your connection.');
    }
    
    // Check if it's a permission error
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please sign in to save ideas.');
    }
    
    throw error;
  }
};

// Save enhanced habit tracking data
const saveHabitTracking = async (ideaId: string, processedIdea: ProcessedIdea) => {
  try {
    const habitData = {
      ideaId: ideaId,
      userId: auth().currentUser?.uid || 'anonymous',
      title: processedIdea.title || processedIdea.processedText,
      frequency: processedIdea.habitDetails?.frequency || 'daily',
      duration: processedIdea.habitDetails?.duration || null,
      streak: 0,
      lastCompleted: null,
      completionDates: [],
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    
    await habitsCollection.doc(ideaId).set(habitData);
    log('Habit tracking created for:', ideaId);
  } catch (error) {
    console.error('Error creating habit tracking:', error);
    // Don't throw - this is optional functionality
  }
};

// Get recent ideas with enhanced metadata
export const getRecentIdeas = async (limit = 10): Promise<FirebaseIdea[]> => {
  try {
    log('Fetching recent ideas...');
    
    const userId = auth().currentUser?.uid;
    let query = ideasCollection.orderBy('createdAt', 'desc').limit(limit);
    
    // Filter by user if logged in
    if (userId && userId !== 'anonymous') {
      query = query.where('userId', '==', userId);
    }
    
    const snapshot = await withTimeout(query.get(), 5000);
    
    const ideas: FirebaseIdea[] = snapshot.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        originalText: data.originalText || data.text || '', // Handle old format
        category: data.category || 'uncategorized',
        processedText: data.processedText || data.description || data.text || '',
        title: data.title,
        tags: data.tags || [],
        createdAt: safeTimestampToDate(data.createdAt),
        completed: data.completed || false,
        userId: data.userId || 'anonymous',
        location: data.location ? {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          address: data.location.address,
          placeName: data.location.placeName,
          searchQuery: data.location.searchQuery,
          placeType: data.location.placeType,
          country: data.location.country,
          city: data.location.city,
        } : undefined,
        habitDetails: data.habitDetails ? {
          frequency: data.habitDetails.frequency,
          targetDays: data.habitDetails.targetDays,
          reminderTime: data.habitDetails.reminderTime,
          streak: data.habitDetails.streak,
          duration: data.habitDetails.duration,
        } : undefined,
        metadata: data.metadata ? {
          estimatedTime: data.metadata.estimatedTime,
          difficulty: data.metadata.difficulty,
          priority: data.metadata.priority,
          processingTime: data.metadata.processingTime,
          aiProcessed: data.metadata.aiProcessed || data.aiProcessed || false,
          sentiment: data.metadata.sentiment,
          actionVerb: data.metadata.actionVerb,
          cuisine: data.metadata.cuisine,
          activityType: data.metadata.activityType,
        } : {
          aiProcessed: data.aiProcessed || false,
        },
        updatedAt: data.updatedAt ? safeTimestampToDate(data.updatedAt) : undefined,
      } as FirebaseIdea;
    });
    
    log(`Fetched ${ideas.length} ideas with enhanced metadata`);
    return ideas;
  } catch (error: any) {
    console.error('[Firebase] Error fetching ideas:', error);
    return [];
  }
};

// Get ideas by category with enhanced metadata
export const getIdeasByCategory = async (category: 'location' | 'habit' | 'oneTime', limit = 20): Promise<FirebaseIdea[]> => {
  try {
    log(`Fetching ${category} ideas...`);
    
    const userId = auth().currentUser?.uid;
    let query = ideasCollection
      .where('category', '==', category)
      .orderBy('createdAt', 'desc')
      .limit(limit);
    
    if (userId && userId !== 'anonymous') {
      query = query.where('userId', '==', userId);
    }
    
    const snapshot = await withTimeout(query.get(), 5000);
    
    const ideas: FirebaseIdea[] = snapshot.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        originalText: data.originalText || data.text || '',
        category: data.category,
        processedText: data.processedText || data.description || data.text || '',
        title: data.title,
        tags: data.tags || [],
        createdAt: safeTimestampToDate(data.createdAt),
        completed: data.completed || false,
        userId: data.userId || 'anonymous',
        location: data.location ? {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          address: data.location.address,
          placeName: data.location.placeName,
          searchQuery: data.location.searchQuery,
          placeType: data.location.placeType,
          country: data.location.country,
          city: data.location.city,
        } : undefined,
        habitDetails: data.habitDetails ? {
          frequency: data.habitDetails.frequency,
          targetDays: data.habitDetails.targetDays,
          reminderTime: data.habitDetails.reminderTime,
          streak: data.habitDetails.streak,
          duration: data.habitDetails.duration,
        } : undefined,
        metadata: data.metadata ? {
          estimatedTime: data.metadata.estimatedTime,
          difficulty: data.metadata.difficulty,
          priority: data.metadata.priority,
          processingTime: data.metadata.processingTime,
          aiProcessed: data.metadata.aiProcessed || data.aiProcessed || false,
          sentiment: data.metadata.sentiment,
          actionVerb: data.metadata.actionVerb,
          cuisine: data.metadata.cuisine,
          activityType: data.metadata.activityType,
        } : {
          aiProcessed: data.aiProcessed || false,
        },
        updatedAt: data.updatedAt ? safeTimestampToDate(data.updatedAt) : undefined,
      } as FirebaseIdea;
    });
    
    log(`Fetched ${ideas.length} ${category} ideas`);
    return ideas;
  } catch (error: any) {
    console.error(`[Firebase] Error fetching ${category} ideas:`, error);
    return [];
  }
};

// Get ideas by tag
export const getIdeasByTag = async (tag: string, limit = 20): Promise<FirebaseIdea[]> => {
  try {
    log(`Fetching ideas with tag: ${tag}`);
    
    const userId = auth().currentUser?.uid;
    let query = ideasCollection
      .where('tags', 'array-contains', tag.toLowerCase())
      .orderBy('createdAt', 'desc')
      .limit(limit);
    
    if (userId && userId !== 'anonymous') {
      query = query.where('userId', '==', userId);
    }
    
    const snapshot = await withTimeout(query.get(), 5000);
    
    const ideas: FirebaseIdea[] = snapshot.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        originalText: data.originalText || data.text || '',
        category: data.category,
        processedText: data.processedText || data.description || data.text || '',
        title: data.title,
        tags: data.tags || [],
        createdAt: safeTimestampToDate(data.createdAt),
        completed: data.completed || false,
        userId: data.userId || 'anonymous',
        location: data.location,
        habitDetails: data.habitDetails,
        metadata: data.metadata || { aiProcessed: data.aiProcessed || false },
        updatedAt: data.updatedAt ? safeTimestampToDate(data.updatedAt) : undefined,
      } as FirebaseIdea;
    });
    
    log(`Found ${ideas.length} ideas with tag: ${tag}`);
    return ideas;
  } catch (error: any) {
    console.error(`[Firebase] Error fetching ideas by tag:`, error);
    return [];
  }
};

// Search ideas by text
export const searchIdeas = async (searchText: string, limit = 20): Promise<FirebaseIdea[]> => {
  try {
    log(`Searching ideas for: ${searchText}`);
    
    const userId = auth().currentUser?.uid;
    const searchLower = searchText.toLowerCase();
    
    // Get all ideas and filter client-side (Firestore doesn't support full-text search)
    let query = ideasCollection.orderBy('createdAt', 'desc').limit(100);
    
    if (userId && userId !== 'anonymous') {
      query = query.where('userId', '==', userId);
    }
    
    const snapshot = await withTimeout(query.get(), 5000);
    
    const allIdeas: FirebaseIdea[] = snapshot.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        originalText: data.originalText || data.text || '',
        category: data.category,
        processedText: data.processedText || data.description || data.text || '',
        title: data.title,
        tags: data.tags || [],
        createdAt: safeTimestampToDate(data.createdAt),
        completed: data.completed || false,
        userId: data.userId || 'anonymous',
        location: data.location,
        habitDetails: data.habitDetails,
        metadata: data.metadata || { aiProcessed: data.aiProcessed || false },
        updatedAt: data.updatedAt ? safeTimestampToDate(data.updatedAt) : undefined,
      } as FirebaseIdea;
    });
    
    // Filter by search text
    const filteredIdeas = allIdeas.filter(idea => {
      const searchableText = [
        idea.originalText,
        idea.processedText,
        idea.title,
        ...idea.tags,
        idea.location?.placeName,
        idea.location?.city,
        idea.location?.country,
        idea.metadata?.cuisine,
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchableText.includes(searchLower);
    });
    
    log(`Found ${filteredIdeas.length} ideas matching: ${searchText}`);
    return filteredIdeas.slice(0, limit);
  } catch (error: any) {
    console.error(`[Firebase] Error searching ideas:`, error);
    return [];
  }
};

// Update idea completion status
export const updateIdeaCompletion = async (ideaId: string, completed: boolean): Promise<void> => {
  try {
    log(`Updating idea ${ideaId} completion to:`, completed);
    
    await withTimeout(
      ideasCollection.doc(ideaId).update({
        completed: completed,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      }),
      5000
    );
    
    // If it's a habit and being marked complete, update streak
    const idea = await ideasCollection.doc(ideaId).get();
    if (idea.data()?.category === 'habit' && completed) {
      await updateHabitStreak(ideaId);
    }
    
    log('Idea completion updated');
  } catch (error: any) {
    console.error('[Firebase] Error updating idea:', error);
    throw error;
  }
};

// Update habit streak
const updateHabitStreak = async (ideaId: string): Promise<void> => {
  try {
    const habitRef = habitsCollection.doc(ideaId);
    const habitDoc = await habitRef.get();
    
    if (habitDoc.exists()) {
      const data = habitDoc.data();
      const today = new Date().toDateString();
      const completionDates = data?.completionDates || [];
      
      // Add today if not already completed
      if (!completionDates.includes(today)) {
        completionDates.push(today);
        
        // Calculate streak
        let streak = 1;
        const sortedDates = completionDates.sort((a: string, b: string) => 
          new Date(b).getTime() - new Date(a).getTime()
        );
        
        for (let i = 1; i < sortedDates.length; i++) {
          const current = new Date(sortedDates[i - 1]);
          const previous = new Date(sortedDates[i]);
          const diffDays = Math.floor((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            streak++;
          } else {
            break;
          }
        }
        
        await habitRef.update({
          completionDates: completionDates,
          lastCompleted: firestore.FieldValue.serverTimestamp(),
          streak: streak,
        });
        
        log(`Habit streak updated to ${streak} days`);
      }
    }
  } catch (error) {
    console.error('Error updating habit streak:', error);
  }
};

// Delete an idea
export const deleteIdea = async (ideaId: string): Promise<void> => {
  try {
    log('Deleting idea:', ideaId);
    
    // Delete from ideas collection
    await withTimeout(ideasCollection.doc(ideaId).delete(), 5000);
    
    // Also delete from habits collection if it exists
    try {
      await habitsCollection.doc(ideaId).delete();
    } catch (error) {
      // Ignore - might not exist
    }
    
    log('Idea deleted successfully');
  } catch (error: any) {
    console.error('[Firebase] Error deleting idea:', error);
    throw error;
  }
};

// Get location ideas for map with enhanced data
export const getLocationIdeas = async (): Promise<FirebaseIdea[]> => {
  try {
    log('Fetching location ideas for map...');
    
    const userId = auth().currentUser?.uid;
    let query = ideasCollection
      .where('category', '==', 'location')
      .where('completed', '==', false)
      .limit(50); // Removed orderBy to avoid index requirement
    
    if (userId && userId !== 'anonymous') {
      query = query.where('userId', '==', userId);
    }
    
    const snapshot = await withTimeout(query.get(), 5000);
    
    const locationIdeas = snapshot.docs
      .map(doc => {
        const data = doc.data();
        
        return {
          id: doc.id,
          originalText: data.originalText || data.text || '',
          category: 'location' as const,
          processedText: data.processedText || data.description || data.text || '',
          title: data.title,
          tags: data.tags || [],
          createdAt: safeTimestampToDate(data.createdAt),
          completed: false,
          userId: data.userId || 'anonymous',
          location: data.location ? {
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            address: data.location.address,
            placeName: data.location.placeName,
            searchQuery: data.location.searchQuery,
            placeType: data.location.placeType,
            country: data.location.country,
            city: data.location.city,
          } : undefined,
          metadata: data.metadata || { aiProcessed: data.aiProcessed || false },
        } as FirebaseIdea;
      })
      .filter(idea => {
        // Include ideas that have location data OR could potentially be geocoded
        const hasLocationData = !!idea.location;
        const hasGeocodableText = !!(idea.originalText || idea.processedText || idea.title);
        return hasLocationData || hasGeocodableText;
      });
    
    log(`Found ${locationIdeas.length} location ideas`);
    
    // Group by place type for logging
    const placeTypes = locationIdeas.reduce((acc, idea) => {
      const type = idea.location?.placeType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    log('Location breakdown:', placeTypes);
    
    return locationIdeas;
  } catch (error: any) {
    console.error('[Firebase] Error fetching location ideas:', error);
    return [];
  }
};

// Get all unique tags from user's ideas
export const getAllTags = async (): Promise<string[]> => {
  try {
    log('Fetching all unique tags...');
    
    const userId = auth().currentUser?.uid;
    let query = ideasCollection.orderBy('createdAt', 'desc').limit(200);
    
    if (userId && userId !== 'anonymous') {
      query = query.where('userId', '==', userId);
    }
    
    const snapshot = await withTimeout(query.get(), 5000);
    
    const allTags = new Set<string>();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.tags && Array.isArray(data.tags)) {
        data.tags.forEach((tag: string) => allTags.add(tag.toLowerCase()));
      }
    });
    
    const uniqueTags = Array.from(allTags).sort();
    log(`Found ${uniqueTags.length} unique tags`);
    
    return uniqueTags;
  } catch (error: any) {
    console.error('[Firebase] Error fetching tags:', error);
    return [];
  }
};

// Get ideas statistics
export const getIdeasStatistics = async () => {
  try {
    log('Calculating ideas statistics...');
    
    const userId = auth().currentUser?.uid;
    let query = ideasCollection.orderBy('createdAt', 'desc');
    
    if (userId && userId !== 'anonymous') {
      query = query.where('userId', '==', userId);
    }
    
    const snapshot = await withTimeout(query.get(), 5000);
    
    const stats = {
      total: snapshot.size,
      byCategory: {
        location: 0,
        habit: 0,
        oneTime: 0,
      },
      completed: 0,
      withAI: 0,
      byPlaceType: {} as Record<string, number>,
      byCuisine: {} as Record<string, number>,
      topTags: {} as Record<string, number>,
    };
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Category counts
      if (data.category) {
        stats.byCategory[data.category as keyof typeof stats.byCategory]++;
      }
      
      // Completion status
      if (data.completed) stats.completed++;
      
      // AI processing
      if (data.aiProcessed || data.metadata?.aiProcessed) stats.withAI++;
      
      // Place types
      if (data.location?.placeType) {
        stats.byPlaceType[data.location.placeType] = (stats.byPlaceType[data.location.placeType] || 0) + 1;
      }
      
      // Cuisines
      if (data.metadata?.cuisine) {
        stats.byCuisine[data.metadata.cuisine] = (stats.byCuisine[data.metadata.cuisine] || 0) + 1;
      }
      
      // Tags
      if (data.tags && Array.isArray(data.tags)) {
        data.tags.forEach((tag: string) => {
          stats.topTags[tag] = (stats.topTags[tag] || 0) + 1;
        });
      }
    });
    
    // Sort top tags
    const sortedTags = Object.entries(stats.topTags)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    
    stats.topTags = Object.fromEntries(sortedTags);
    
    log('Statistics calculated:', stats);
    return stats;
  } catch (error: any) {
    console.error('[Firebase] Error calculating statistics:', error);
    return null;
  }
};

// Anonymous auth
export const signInAnonymously = async () => {
  try {
    log('Signing in anonymously...');
    
    // Check if already signed in
    const currentUser = auth().currentUser;
    if (currentUser) {
      log('Already signed in:', currentUser.uid);
      return currentUser;
    }
    
    // Sign in anonymously
    const userCredential = await withTimeout(auth().signInAnonymously(), 10000);
    log('Signed in successfully:', userCredential.user.uid);
    return userCredential.user;
  } catch (error: any) {
    console.error('[Firebase] Error signing in:', error);
    
    // More specific error messages
    if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection.');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Anonymous auth not enabled. Please enable it in Firebase Console.');
    }
    
    throw error;
  }
};

// Sign out
export const signOut = async () => {
  try {
    await auth().signOut();
    log('Signed out successfully');
  } catch (error) {
    console.error('[Firebase] Error signing out:', error);
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth().currentUser;
};

// Listen to auth state changes
export const onAuthStateChanged = (callback: (user: any) => void) => {
  return auth().onAuthStateChanged(callback);
};