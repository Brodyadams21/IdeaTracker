import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '../config/firebase';
import { Idea, FilterOptions, SortOptions, SearchOptions, PaginatedResponse } from '../types';

class DataService {
  private firestore = getFirebaseFirestore();
  private ideasCollection = 'ideas';

  /**
   * Save a new idea
   */
  async saveIdea(idea: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>): Promise<Idea> {
    try {
      const now = new Date();
      const ideaData = {
        ...idea,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(collection(this.firestore, this.ideasCollection), ideaData);
      
      return {
        ...ideaData,
        id: docRef.id,
      };
    } catch (error) {
      console.error('Error saving idea:', error);
      throw new Error('Failed to save idea');
    }
  }

  /**
   * Get all ideas with optional filtering
   */
  async getIdeas(filters?: FilterOptions): Promise<Idea[]> {
    try {
      let q = collection(this.firestore, this.ideasCollection);

      // Apply filters
      if (filters) {
        const constraints = [];

        if (filters.category) {
          constraints.push(where('category', '==', filters.category));
        }

        if (filters.priority) {
          constraints.push(where('priority', '==', filters.priority));
        }

        if (filters.status) {
          constraints.push(where('status', '==', filters.status));
        }

        if (filters.tags && filters.tags.length > 0) {
          constraints.push(where('tags', 'array-contains-any', filters.tags));
        }

        if (filters.dateRange) {
          constraints.push(where('createdAt', '>=', filters.dateRange.start));
          constraints.push(where('createdAt', '<=', filters.dateRange.end));
        }

        if (constraints.length > 0) {
          q = query(q, ...constraints);
        }
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        completedAt: doc.data().completedAt?.toDate(),
      })) as Idea[];
    } catch (error) {
      console.error('Error getting ideas:', error);
      throw new Error('Failed to get ideas');
    }
  }

  /**
   * Get a single idea by ID
   */
  async getIdea(id: string): Promise<Idea | null> {
    try {
      const docRef = doc(this.firestore, this.ideasCollection, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate() || new Date(),
          updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
          completedAt: docSnap.data().completedAt?.toDate(),
        } as Idea;
      }

      return null;
    } catch (error) {
      console.error('Error getting idea:', error);
      throw new Error('Failed to get idea');
    }
  }

  /**
   * Update an existing idea
   */
  async updateIdea(id: string, updates: Partial<Idea>): Promise<Idea> {
    try {
      const docRef = doc(this.firestore, this.ideasCollection, id);
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await updateDoc(docRef, updateData);

      // Get the updated idea
      const updatedIdea = await this.getIdea(id);
      if (!updatedIdea) {
        throw new Error('Idea not found after update');
      }

      return updatedIdea;
    } catch (error) {
      console.error('Error updating idea:', error);
      throw new Error('Failed to update idea');
    }
  }

  /**
   * Delete an idea
   */
  async deleteIdea(id: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.ideasCollection, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting idea:', error);
      throw new Error('Failed to delete idea');
    }
  }

  /**
   * Search ideas with pagination
   */
  async searchIdeas(options: SearchOptions): Promise<PaginatedResponse<Idea>> {
    try {
      const { query: searchQuery, filters, sort, limit: limitCount = 20, offset = 0 } = options;

      let q = collection(this.firestore, this.ideasCollection);

      // Apply filters
      if (filters) {
        const constraints = [];

        if (filters.category) {
          constraints.push(where('category', '==', filters.category));
        }

        if (filters.priority) {
          constraints.push(where('priority', '==', filters.priority));
        }

        if (filters.status) {
          constraints.push(where('status', '==', filters.status));
        }

        if (filters.tags && filters.tags.length > 0) {
          constraints.push(where('tags', 'array-contains-any', filters.tags));
        }

        if (filters.dateRange) {
          constraints.push(where('createdAt', '>=', filters.dateRange.start));
          constraints.push(where('createdAt', '<=', filters.dateRange.end));
        }

        if (constraints.length > 0) {
          q = query(q, ...constraints);
        }
      }

      // Apply sorting
      q = query(q, orderBy(sort.field, sort.direction));

      // Apply pagination
      if (offset > 0) {
        // For offset-based pagination, we need to get all docs up to offset
        // This is not efficient for large datasets, but works for now
        const allSnapshot = await getDocs(q);
        const allDocs = allSnapshot.docs;
        const startIndex = offset;
        const endIndex = startIndex + limitCount;
        const paginatedDocs = allDocs.slice(startIndex, endIndex);

        return {
          data: paginatedDocs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            completedAt: doc.data().completedAt?.toDate(),
          })) as Idea[],
          total: allDocs.length,
          page: Math.floor(offset / limitCount) + 1,
          limit: limitCount,
          hasMore: endIndex < allDocs.length,
        };
      } else {
        // First page
        q = query(q, limit(limitCount));
        const snapshot = await getDocs(q);

        return {
          data: snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            completedAt: doc.data().completedAt?.toDate(),
          })) as Idea[],
          total: snapshot.size, // This is approximate
          page: 1,
          limit: limitCount,
          hasMore: snapshot.size === limitCount,
        };
      }
    } catch (error) {
      console.error('Error searching ideas:', error);
      throw new Error('Failed to search ideas');
    }
  }

  /**
   * Get ideas by category
   */
  async getIdeasByCategory(category: string): Promise<Idea[]> {
    return this.getIdeas({ category: category as any });
  }

  /**
   * Get ideas by priority
   */
  async getIdeasByPriority(priority: string): Promise<Idea[]> {
    return this.getIdeas({ priority: priority as any });
  }

  /**
   * Get ideas by status
   */
  async getIdeasByStatus(status: string): Promise<Idea[]> {
    return this.getIdeas({ status: status as any });
  }

  /**
   * Get recent ideas
   */
  async getRecentIdeas(limitCount: number = 10): Promise<Idea[]> {
    try {
      const q = query(
        collection(this.firestore, this.ideasCollection),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        completedAt: doc.data().completedAt?.toDate(),
      })) as Idea[];
    } catch (error) {
      console.error('Error getting recent ideas:', error);
      throw new Error('Failed to get recent ideas');
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    try {
      const allIdeas = await this.getIdeas();
      
      const stats = {
        total: allIdeas.length,
        byCategory: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
      };

      allIdeas.forEach(idea => {
        // Count by category
        stats.byCategory[idea.category] = (stats.byCategory[idea.category] || 0) + 1;
        
        // Count by priority
        stats.byPriority[idea.priority] = (stats.byPriority[idea.priority] || 0) + 1;
        
        // Count by status
        stats.byStatus[idea.status] = (stats.byStatus[idea.status] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw new Error('Failed to get statistics');
    }
  }
}

export default new DataService();