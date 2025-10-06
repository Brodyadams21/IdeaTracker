import OpenAI from 'openai';
import { API_CONFIG } from '../config/api';
import { AIProcessingResult, IdeaCategory, Priority } from '../types';

class AIService {
  private openai: OpenAI | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      if (API_CONFIG.OPENAI.apiKey && API_CONFIG.OPENAI.apiKey !== 'YOUR_OPENAI_API_KEY') {
        this.openai = new OpenAI({
          apiKey: API_CONFIG.OPENAI.apiKey,
          dangerouslyAllowBrowser: true, // For React Native
        });
        this.isInitialized = true;
      }
    } catch (error) {
      console.warn('OpenAI initialization failed:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Categorize an idea using AI
   */
  async categorizeIdea(idea: string): Promise<AIProcessingResult> {
    if (!this.isInitialized || !this.openai) {
      return this.fallbackCategorization(idea);
    }

    try {
      const prompt = `
        Analyze this idea and categorize it as one of: location, habit, or task.
        Also determine priority (low, medium, high, urgent) and generate relevant tags.
        
        Idea: "${idea}"
        
        Respond with JSON format:
        {
          "category": "location|habit|task",
          "priority": "low|medium|high|urgent",
          "tags": ["tag1", "tag2", "tag3"],
          "estimatedTime": number_in_minutes,
          "confidence": 0.0_to_1.0,
          "reasoning": "brief explanation"
        }
        
        Guidelines:
        - location: specific places to visit (restaurants, cities, landmarks)
        - habit: repeated activities (learning, exercise, daily routines)
        - task: one-time activities (calling someone, trying new food)
        - priority: based on urgency and importance
        - tags: 2-5 relevant keywords
        - estimatedTime: realistic time in minutes
        - confidence: how certain you are (0.0-1.0)
      `;

      const response = await this.openai.chat.completions.create({
        model: API_CONFIG.OPENAI.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: API_CONFIG.OPENAI.maxTokens,
        temperature: API_CONFIG.OPENAI.temperature,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(content);
      return {
        category: result.category as IdeaCategory,
        priority: result.priority as Priority,
        tags: result.tags || [],
        estimatedTime: result.estimatedTime,
        confidence: result.confidence || 0.5,
        reasoning: result.reasoning,
      };
    } catch (error) {
      console.error('AI categorization failed:', error);
      return this.fallbackCategorization(idea);
    }
  }

  /**
   * Generate tags for an idea
   */
  async generateTags(idea: string): Promise<string[]> {
    if (!this.isInitialized || !this.openai) {
      return this.fallbackTagGeneration(idea);
    }

    try {
      const prompt = `
        Generate 3-5 relevant tags for this idea: "${idea}"
        
        Return as a JSON array of strings.
        Tags should be short, descriptive, and useful for filtering.
      `;

      const response = await this.openai.chat.completions.create({
        model: API_CONFIG.OPENAI.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('AI tag generation failed:', error);
      return this.fallbackTagGeneration(idea);
    }
  }

  /**
   * Estimate time for an idea
   */
  async estimateTime(idea: string, category: IdeaCategory): Promise<number> {
    if (!this.isInitialized || !this.openai) {
      return this.fallbackTimeEstimation(idea, category);
    }

    try {
      const prompt = `
        Estimate how long this ${category} would take to complete: "${idea}"
        
        Return only a number representing minutes.
        Be realistic and consider the complexity.
      `;

      const response = await this.openai.chat.completions.create({
        model: API_CONFIG.OPENAI.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10,
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const time = parseInt(content.trim());
      return isNaN(time) ? this.fallbackTimeEstimation(idea, category) : time;
    } catch (error) {
      console.error('AI time estimation failed:', error);
      return this.fallbackTimeEstimation(idea, category);
    }
  }

  /**
   * Fallback categorization when AI is not available
   */
  private fallbackCategorization(idea: string): AIProcessingResult {
    const lowerIdea = idea.toLowerCase();
    
    // Simple keyword-based categorization
    let category: IdeaCategory = 'task';
    let priority: Priority = 'medium';
    let tags: string[] = [];
    let estimatedTime = 30;

    // Location keywords
    if (lowerIdea.includes('visit') || lowerIdea.includes('go to') || 
        lowerIdea.includes('restaurant') || lowerIdea.includes('cafe') ||
        lowerIdea.includes('museum') || lowerIdea.includes('park') ||
        lowerIdea.includes('city') || lowerIdea.includes('place')) {
      category = 'location';
      estimatedTime = 120;
      tags = ['travel', 'exploration'];
    }
    // Habit keywords
    else if (lowerIdea.includes('learn') || lowerIdea.includes('practice') ||
             lowerIdea.includes('daily') || lowerIdea.includes('routine') ||
             lowerIdea.includes('exercise') || lowerIdea.includes('study') ||
             lowerIdea.includes('meditate') || lowerIdea.includes('read')) {
      category = 'habit';
      estimatedTime = 60;
      tags = ['personal', 'development'];
    }

    // Priority keywords
    if (lowerIdea.includes('urgent') || lowerIdea.includes('asap') ||
        lowerIdea.includes('important') || lowerIdea.includes('critical')) {
      priority = 'urgent';
    } else if (lowerIdea.includes('low') || lowerIdea.includes('sometime')) {
      priority = 'low';
    } else if (lowerIdea.includes('high') || lowerIdea.includes('priority')) {
      priority = 'high';
    }

    // Extract basic tags
    const words = idea.split(' ').filter(word => word.length > 3);
    tags = [...tags, ...words.slice(0, 3)];

    return {
      category,
      priority,
      tags,
      estimatedTime,
      confidence: 0.6,
      reasoning: 'Fallback categorization based on keywords',
    };
  }

  /**
   * Fallback tag generation
   */
  private fallbackTagGeneration(idea: string): string[] {
    const words = idea
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 3 && !this.isStopWord(word))
      .slice(0, 5);
    
    return words;
  }

  /**
   * Fallback time estimation
   */
  private fallbackTimeEstimation(idea: string, category: IdeaCategory): number {
    const baseTime = {
      location: 120,
      habit: 60,
      task: 30,
    };

    const complexity = idea.split(' ').length;
    return baseTime[category] * Math.min(complexity / 5, 2);
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
      'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who',
      'boy', 'did', 'she', 'use', 'man', 'new', 'now', 'old', 'see', 'two',
    ];
    return stopWords.includes(word);
  }

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return this.isInitialized;
  }
}

export default new AIService();