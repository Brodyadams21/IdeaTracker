// ideaProcessor.ts - Enhanced AI Categorization with Rich Tagging
// 
// Key Features:
// - Properly categorizes "try chinese food" as oneTime (not location)
// - Categorizes "learn french" as habit (not location)
// - Only marks as location if there's a SPECIFIC place mentioned
// - Generates rich, searchable tags for organization
// - Falls back to local processing if AI fails
//
import { Alert } from 'react-native';
import { findBestLocation, findNearbyLocation, getUserLocation } from '../locationService';

// Types
export type IdeaCategory = 'location' | 'habit' | 'oneTime';

export interface ProcessedIdea {
  id: string;
  originalText: string;
  category: IdeaCategory;
  processedText: string;
  title?: string;
  tags: string[];
  createdAt: Date;
  completed: boolean;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    placeName?: string;
    searchQuery?: string;
    placeType?: string; // restaurant, city, country, attraction, etc.
    country?: string;
    city?: string;
  };
  habitDetails?: {
    frequency: string;
    targetDays?: number[];
    reminderTime?: string;
    streak?: number;
    duration?: string; // "21 days", "3 months", etc.
  };
  metadata?: {
    estimatedTime?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    priority?: 'low' | 'medium' | 'high';
    aiProcessed: boolean;
    processingTime?: number;
    sentiment?: 'excited' | 'neutral' | 'urgent';
    actionVerb?: string; // "visit", "try", "explore", etc.
    cuisine?: string; // for restaurants
    activityType?: string; // "dining", "sightseeing", "shopping", etc.
  };
}

// Import centralized configuration and logging
import { config, isApiKeyConfigured } from '../../config/env';
import { createLogger } from '../../utils/logger';

// Configuration from centralized config
const OPENAI_API_KEY: string = config.openaiApiKey;
const USE_AI: boolean = config.useAI && isApiKeyConfigured(OPENAI_API_KEY);
const AI_TIMEOUT = config.aiTimeout;
const MAX_RETRIES = config.maxRetries;

// Centralized logging
const log = createLogger('IdeaProcessor');

// Comprehensive location database
const LOCATION_DATABASE = {
  countries: [
    'italy', 'france', 'spain', 'germany', 'japan', 'china', 'india', 'usa', 'united states',
    'canada', 'mexico', 'brazil', 'argentina', 'uk', 'united kingdom', 'australia',
    'thailand', 'vietnam', 'korea', 'greece', 'turkey', 'egypt', 'morocco', 'portugal',
    'netherlands', 'belgium', 'switzerland', 'austria', 'poland', 'russia', 'sweden',
    'norway', 'denmark', 'finland', 'iceland', 'ireland', 'scotland', 'wales'
  ],
  cities: [
    'new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia', 'san antonio',
    'san diego', 'dallas', 'san jose', 'austin', 'jacksonville', 'san francisco', 'boston',
    'seattle', 'denver', 'washington', 'las vegas', 'portland', 'miami', 'atlanta',
    'london', 'paris', 'rome', 'madrid', 'barcelona', 'berlin', 'amsterdam', 'prague',
    'vienna', 'budapest', 'lisbon', 'copenhagen', 'stockholm', 'oslo', 'dublin',
    'edinburgh', 'tokyo', 'osaka', 'kyoto', 'seoul', 'beijing', 'shanghai', 'hong kong',
    'singapore', 'bangkok', 'mumbai', 'delhi', 'sydney', 'melbourne', 'toronto', 'vancouver',
    'montreal', 'mexico city', 'rio de janeiro', 'buenos aires', 'lima', 'bogota'
  ],
  landmarks: [
    'eiffel tower', 'statue of liberty', 'golden gate', 'big ben', 'colosseum',
    'times square', 'central park', 'grand canyon', 'niagara falls', 'mount rushmore',
    'space needle', 'empire state', 'brooklyn bridge', 'alcatraz', 'hollywood sign'
  ],
  placeTypes: [
    'restaurant', 'cafe', 'coffee', 'bistro', 'diner', 'pizzeria', 'steakhouse', 'sushi',
    'bar', 'pub', 'brewery', 'winery', 'club', 'lounge', 'tavern',
    'store', 'shop', 'mall', 'market', 'boutique', 'outlet', 'supermarket',
    'museum', 'gallery', 'theater', 'cinema', 'concert', 'venue', 'stadium',
    'park', 'beach', 'lake', 'mountain', 'trail', 'garden', 'zoo', 'aquarium',
    'hotel', 'motel', 'resort', 'spa', 'gym', 'fitness', 'yoga', 'wellness',
    'hospital', 'clinic', 'pharmacy', 'bank', 'airport', 'station', 'library'
  ],
  cuisines: [
    'italian', 'chinese', 'japanese', 'thai', 'indian', 'mexican', 'greek',
    'mediterranean', 'american', 'korean', 'vietnamese', 'spanish', 'turkish',
    'middle eastern', 'ethiopian', 'moroccan', 'brazilian', 'peruvian', 'caribbean',
    'german', 'british', 'irish', 'seafood', 'steakhouse', 'vegetarian', 'vegan',
    'sushi', 'ramen', 'pizza', 'burger', 'bbq', 'barbecue', 'fusion', 'tapas',
    // Note: 'french' is both a cuisine and language - context matters
  ]
};

// Main processing function
export async function processIdea(rawText: string): Promise<ProcessedIdea> {
  const startTime = Date.now();
  log.info('Processing idea', { rawText });

  // Validate input
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('Cannot process empty idea');
  }

  const trimmedText = rawText.trim();

  // Quick location check for obvious places
  const quickLocationCheck = isObviousLocation(trimmedText);
  if (quickLocationCheck) {
    log.debug('Obvious location detected', { location: quickLocationCheck });
  } else if (trimmedText.toLowerCase().match(/\b(try|eat|have)\s+(chinese|italian|mexican|thai|indian|japanese|korean|french|spanish|greek)\s*(food|cuisine)?\b/i)) {
    log.debug('Generic food task detected - NOT a location');
  }

  // Check if AI is properly configured
  const aiEnabled = USE_AI && OPENAI_API_KEY !== 'YOUR_API_KEY_HERE' && OPENAI_API_KEY.startsWith('sk-');
  
  if (!aiEnabled) {
    log.warn('AI disabled or not configured, using enhanced local processing');
    return processLocally(trimmedText, startTime);
  }

  // Try AI processing with retries
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      log.debug(`AI attempt ${attempt}/${MAX_RETRIES}`);
      
      // For "try X food" patterns, hint the AI to categorize as oneTime
      const isGenericFood = trimmedText.toLowerCase().match(/\b(try|eat|have)\s+\w+\s*(food|cuisine)\b/i) && 
                          !trimmedText.match(/\b(at|restaurant|place)\s+[A-Z]/i);
      
      const result = await processWithAI(trimmedText, quickLocationCheck, !!isGenericFood);
      
      // Validate AI result
      if (isValidProcessedIdea(result)) {
        const processingTime = Date.now() - startTime;
        log.info('AI processing successful', { processingTime });
        
        return {
          ...result,
          metadata: {
            ...result.metadata,
            processingTime,
            aiProcessed: true,
          },
        };
      } else {
        throw new Error('Invalid AI response structure');
      }
    } catch (error) {
      lastError = error as Error;
      log.error(`AI attempt ${attempt} failed`, { error: (error as Error).message });
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // Fallback to enhanced local processing
  log.warn('Falling back to enhanced local processing');
  return processLocally(trimmedText, startTime);
}

// Check for obvious locations - but be more specific
function isObviousLocation(text: string): string | null {
  const lower = text.toLowerCase();
  
  // Learning/studying patterns should NOT be locations
  if (lower.match(/\b(learn|study|practice|speak)\s+(french|spanish|italian|german|chinese|japanese|korean)\b/i)) {
    return null;
  }
  
  // Generic food without specific place should NOT be location
  const cuisines = 'chinese|italian|mexican|thai|indian|japanese|korean|french|spanish|greek|vietnamese|american|mediterranean|turkish|brazilian|peruvian';
  if (lower.match(new RegExp(`\\b(try|eat|have|taste|get)\\s+(${cuisines})\\s*(food|cuisine)\\b`, 'i')) && 
      !lower.match(/\b(at|in|restaurant|place|shop|store|called|named)\s+[A-Z]/i)) {
    return null;
  }
  
  // Check for actual place indicators
  const hasPlaceIndicator = lower.match(/\b(at|in|on|near|visit|go to|restaurant|cafe|shop|store|place)\b/i);
  
  // Check countries with context
  for (const country of LOCATION_DATABASE.countries) {
    if (lower.includes(country)) {
      // Only if it's about visiting/traveling, not learning the language or trying the food
      if (lower.match(new RegExp(`\\b(visit|travel|trip|go to|in|explore)\\s+${country}\\b`, 'i')) &&
          !lower.match(new RegExp(`\\b(learn|study)\\s+${country}`, 'i'))) {
        return country;
      }
    }
  }
  
  // Check cities - these are usually locations
  for (const city of LOCATION_DATABASE.cities) {
    if (lower.includes(city)) {
      return city;
    }
  }
  
  // Check landmarks - these are always locations
  for (const landmark of LOCATION_DATABASE.landmarks) {
    if (lower.includes(landmark)) {
      return landmark;
    }
  }
  
  // Check for specific restaurant/business names (capitalized)
  const businessMatch = text.match(/\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\s*(?:Restaurant|Cafe|Bar|Grill|Bistro|Pizza|Sushi)/);
  if (businessMatch) {
    return businessMatch[0];
  }
  
  return null;
}

// Enhanced AI Processing
async function processWithAI(text: string, knownLocation: string | null, isGenericFood: boolean = false): Promise<ProcessedIdea> {
  log.debug('Starting enhanced AI processing', { text, knownLocation, isGenericFood });

  const prompt = createEnhancedPrompt(text, knownLocation, isGenericFood);
  
  try {
    const response = await fetchWithTimeout(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an expert at categorizing ideas and extracting rich metadata. 
You MUST respond with valid JSON only, no markdown or explanations.
CRITICAL RULES:
1. "try [cuisine] food" or "eat [cuisine] food" without a restaurant name is ALWAYS oneTime, NEVER location
2. Only categorize as location if there's a SPECIFIC place mentioned (restaurant name, city, address)
3. Generic food adventures are oneTime tasks
4. For oneTime food tasks, use titles like "Try Chinese food" NOT "Visit Chinese food"
Always generate specific, searchable tags that help users organize and find their ideas later.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 800,
          response_format: { type: "json_object" }
        }),
      },
      AI_TIMEOUT
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('Empty AI response');
    }

    log.debug('AI raw response', { response: aiResponse });

    // Parse and validate JSON
    const parsed = JSON.parse(aiResponse);
    log.debug('Parsed AI response', { parsed });

    // Convert to ProcessedIdea
    const processed = await convertAIResponseToProcessedIdea(text, parsed);
    
    // Log if there's a mismatch
    if (text.toLowerCase().match(/\b(try|eat|have)\s+\w+\s*(food|cuisine)\b/i) && processed.category === 'location') {
      log.warn('Generic food task miscategorized as location');
    }
    
    return processed;

  } catch (error) {
    log.error('AI processing error', { error: (error as Error).message });
    throw error;
  }
}

// Create enhanced prompt for AI
function createEnhancedPrompt(text: string, knownLocation: string | null, isGenericFood: boolean = false): string {
  const locationHint = knownLocation ? `\nNOTE: This clearly mentions "${knownLocation}" which is a location.` : '';
  const foodHint = isGenericFood ? `\nIMPORTANT: This is a generic food task WITHOUT a specific restaurant, so it should be categorized as oneTime.` : '';
  
  return `Analyze and categorize this idea with rich metadata: "${text}"${locationHint}${foodHint}

CRITICAL CATEGORIZATION RULES:

1. "location" - ONLY when there's a SPECIFIC place, destination, or location mentioned:
   ✓ "try Papa Johns" (specific restaurant)
   ✓ "visit Italy" (specific country to travel to)
   ✓ "new sushi place on Main St" (specific location)
   ✓ "museum downtown" (specific area)
   ✗ "try chinese food" (no specific place = oneTime)
   ✗ "eat pizza" (no specific place = oneTime)
   ✗ "try italian food" (no specific place = oneTime)
   
2. "habit" - Repeated activities, routines, learning, or practice:
   ✓ "learn French" (learning activity)
   ✓ "practice guitar daily" (repeated practice)
   ✓ "meditate every morning" (routine)
   ✓ "study Spanish" (ongoing learning)
   ✗ "visit France" (one-time trip = location)
   
3. "oneTime" - Single tasks, general activities without specific location:
   ✓ "try chinese food" (no specific restaurant)
   ✓ "try italian food" (general food adventure)
   ✓ "eat mexican food" (no specific place)
   ✓ "watch a movie" (general activity)
   ✓ "call mom" (single task)
   ✓ "buy groceries" (general task)

CRITICAL: "try [cuisine] food" without a restaurant name is ALWAYS oneTime, NEVER location!

IMPORTANT DISTINCTIONS:
- "learn Italian" = habit (learning the language)
- "visit Italy" = location (traveling to the country)
- "try Italian food" = oneTime (no specific restaurant mentioned)
- "try Luigi's Italian Restaurant" = location (specific place)
- "try chinese food" = oneTime (general food adventure)
- "try Golden Dragon chinese restaurant" = location (specific place)

For oneTime food tasks, use titles like:
- "Try chinese food" NOT "Visit chinese food"
- "Eat italian food" NOT "Visit italian"

Generate comprehensive tags that include:
- Category tags (task, food-adventure for general food tasks)
- Specific tags (cuisine type, activity type)
- Contextual tags (urgent, weekend, date-night)
- Action tags (try, eat, taste for food tasks)

Return JSON:
{
  "category": "location" | "habit" | "oneTime",
  "title": "short actionable title (max 50 chars)",
  "processedText": "enhanced description with context",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "confidence": 0.0 to 1.0,
  "reasoning": "explanation of categorization",
  "location": {
    "placeName": "extracted place name if location",
    "placeType": "restaurant|city|country|attraction|store|etc",
    "searchQuery": "what to search on Google Maps",
    "country": "country if identifiable",
    "city": "city if identifiable"
  },
  "metadata": {
    "estimatedTime": "time needed",
    "priority": "low|medium|high",
    "sentiment": "excited|neutral|urgent",
    "actionVerb": "visit|try|explore|learn|practice|etc",
    "cuisine": "if food-related, the cuisine type",
    "activityType": "dining|sightseeing|shopping|learning|entertainment|etc"
  },
  "habitDetails": {
    "frequency": "if habit, how often",
    "duration": "if habit, for how long"
  }
}`;
}

// Convert AI response to ProcessedIdea with rich data
async function convertAIResponseToProcessedIdea(originalText: string, aiResponse: any): Promise<ProcessedIdea> {
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  
  // Override AI if it miscategorizes generic food
  let category = aiResponse.category || 'oneTime';
  let title = aiResponse.title;
  
  // Override AI if it miscategorizes generic food
  const cuisineList = 'chinese|italian|mexican|thai|indian|japanese|korean|french|spanish|greek|vietnamese|american|mediterranean|turkish|brazilian|peruvian|ethiopian|moroccan|lebanese|russian|polish|german|british|irish|cuban|jamaican|african|asian|european';
  const genericFoodMatch = originalText.toLowerCase().match(new RegExp(`\\b(try|eat|have)\\s+(${cuisineList})\\s*(food|cuisine)?\\b`, 'i'));
  if (genericFoodMatch && !originalText.match(/\b(at|restaurant|place)\s+[A-Z]/i) && category === 'location') {
    log.warn('Overriding AI: Generic food miscategorized as location');
    category = 'oneTime';
    const verb = genericFoodMatch[1].charAt(0).toUpperCase() + genericFoodMatch[1].slice(1);
    const cuisine = genericFoodMatch[2].charAt(0).toUpperCase() + genericFoodMatch[2].slice(1);
    title = `${verb} ${cuisine} food`;
  }
  
  const processed: ProcessedIdea = {
    id,
    originalText,
    category: category as IdeaCategory,
    processedText: aiResponse.processedText || originalText,
    title: title,
    tags: ensureRichTags(aiResponse.tags || [], aiResponse, category),
    createdAt: new Date(),
    completed: false,
    metadata: {
      aiProcessed: true,
      priority: aiResponse.metadata?.priority || 'medium',
      estimatedTime: aiResponse.metadata?.estimatedTime,
      sentiment: aiResponse.metadata?.sentiment,
      actionVerb: aiResponse.metadata?.actionVerb,
      cuisine: aiResponse.metadata?.cuisine,
      activityType: aiResponse.metadata?.activityType,
    },
  };

  // Add location details only if category is location
  if (category === 'location' && aiResponse.location) {
    processed.location = {
      placeName: aiResponse.location.placeName,
      placeType: aiResponse.location.placeType,
      searchQuery: aiResponse.location.searchQuery || aiResponse.location.placeName,
      address: originalText,
      country: aiResponse.location.country,
      city: aiResponse.location.city,
    };
    
    // Try to find real coordinates for the location
    try {
      console.log('🗺️ Searching for coordinates for:', aiResponse.location.placeName);
      
      // Get user's current location from the app
      const userLocation = await getUserCurrentLocation();
      
      let geocodedLocation;
      if (userLocation) {
        // Use nearby search for better results
        geocodedLocation = await findNearbyLocation(
          aiResponse.location.placeName, 
          userLocation.latitude, 
          userLocation.longitude
        );
      } else {
        // Fallback to general search
        geocodedLocation = await findBestLocation(aiResponse.location.placeName);
      }
      
      if (geocodedLocation) {
        processed.location.latitude = geocodedLocation.latitude;
        processed.location.longitude = geocodedLocation.longitude;
        processed.location.address = geocodedLocation.address;
        processed.location.placeType = geocodedLocation.placeType;
        processed.location.city = geocodedLocation.city;
        processed.location.country = geocodedLocation.country;
        
        console.log('✅ Found coordinates:', {
          lat: geocodedLocation.latitude,
          lng: geocodedLocation.longitude,
          address: geocodedLocation.address,
          distance: geocodedLocation.distance ? `${geocodedLocation.distance.toFixed(1)}km` : 'unknown'
        });
      } else {
        console.log('⚠️ No coordinates found for:', aiResponse.location.placeName);
      }
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      // Continue without coordinates - the idea will still be saved
    }
  }

  // Add habit details if category is habit
  if (category === 'habit' && aiResponse.habitDetails) {
    processed.habitDetails = {
      frequency: aiResponse.habitDetails.frequency || 'daily',
      duration: aiResponse.habitDetails.duration,
    };
  }

  log.debug('Converted to ProcessedIdea', { processed });
  return processed;
}

// Ensure tags are rich and searchable
function ensureRichTags(tags: string[], aiResponse: any, category?: string): string[] {
  const tagSet = new Set(tags.map(t => t.toLowerCase()));
  
  // Add category tag
  tagSet.add(category || aiResponse.category);
  
  // Add location-specific tags
  if ((category || aiResponse.category) === 'location' && aiResponse.location) {
    if (aiResponse.location.placeType) {
      tagSet.add(aiResponse.location.placeType);
    }
    if (aiResponse.location.country) {
      tagSet.add(aiResponse.location.country.toLowerCase());
    }
    if (aiResponse.location.city) {
      tagSet.add(aiResponse.location.city.toLowerCase());
    }
    if (aiResponse.metadata?.cuisine) {
      tagSet.add(aiResponse.metadata.cuisine.toLowerCase());
      tagSet.add('food');
      tagSet.add('dining');
    }
    if (aiResponse.metadata?.activityType) {
      tagSet.add(aiResponse.metadata.activityType);
    }
  }
  
  // Add oneTime-specific tags for food tasks
  if ((category || aiResponse.category) === 'oneTime' && aiResponse.metadata?.cuisine) {
    tagSet.add(aiResponse.metadata.cuisine.toLowerCase());
    tagSet.add('food');
    tagSet.add('food-adventure');
    tagSet.add('task');
  }
  
  // Add action verb as tag
  if (aiResponse.metadata?.actionVerb) {
    tagSet.add(aiResponse.metadata.actionVerb);
  }
  
  // Add priority if high
  if (aiResponse.metadata?.priority === 'high') {
    tagSet.add('urgent');
  }
  
  // Convert back to array and limit
  return Array.from(tagSet).slice(0, 10);
}

// Enhanced local processing fallback
async function processLocally(text: string, startTime: number): Promise<ProcessedIdea> {
  log.debug('Using enhanced local processing');
  
  const analysis = analyzeTextComprehensively(text);
  let category = determineCategoryFromAnalysis(analysis);
  
  // Double-check for generic food patterns
  const genericFoodMatch = text.toLowerCase().match(/\b(try|eat|have)\s+(\w+)\s*(food|cuisine)\b/i);
  if (genericFoodMatch && !text.match(/\b(at|restaurant|place)\s+[A-Z]/i) && category === 'location') {
    log.warn('Local override: Generic food miscategorized as location');
    category = 'oneTime';
    analysis.hasLocation = false;
    analysis.hasTask = true;
  }
  
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  
  const processed: ProcessedIdea = {
    id,
    originalText: text,
    category,
    processedText: text,
    title: generateSmartTitle(text, category, analysis),
    tags: generateComprehensiveTags(text, category, analysis),
    createdAt: new Date(),
    completed: false,
    metadata: {
      aiProcessed: false,
      processingTime: Date.now() - startTime,
      estimatedTime: estimateTime(text, category),
      priority: analysis.priority,
      sentiment: analysis.sentiment,
      actionVerb: analysis.actionVerb,
      activityType: analysis.activityType,
    },
  };

  // Add category-specific details
  if (category === 'location' && analysis.hasLocation) {
    processed.location = {
      placeName: analysis.placeName || extractPlaceName(text),
      placeType: analysis.placeType,
      searchQuery: analysis.searchQuery || text,
      address: text,
      country: analysis.country,
      city: analysis.city,
    };
    
    if (analysis.cuisine) {
      processed.metadata!.cuisine = analysis.cuisine;
    }
    
    // Try to find real coordinates for the location
    try {
      console.log('🗺️ Searching for coordinates for:', processed.location.placeName);
      const current = getUserLocation();
      const geocodedLocation = current
        ? await findNearbyLocation(processed.location.placeName || text, current.latitude, current.longitude)
        : await findBestLocation(processed.location.placeName || text);
      
      if (geocodedLocation) {
        processed.location.latitude = geocodedLocation.latitude;
        processed.location.longitude = geocodedLocation.longitude;
        processed.location.address = geocodedLocation.address;
        processed.location.placeType = geocodedLocation.placeType;
        processed.location.city = geocodedLocation.city;
        processed.location.country = geocodedLocation.country;
        
        console.log('✅ Found coordinates:', {
          lat: geocodedLocation.latitude,
          lng: geocodedLocation.longitude,
          address: geocodedLocation.address
        });
      } else {
        console.log('⚠️ No coordinates found for:', processed.location.placeName);
      }
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      // Continue without coordinates - the idea will still be saved
    }
  } else if (category === 'habit') {
    processed.habitDetails = {
      frequency: analysis.frequency || 'daily',
      duration: analysis.duration,
    };
  } else if (category === 'oneTime' && analysis.cuisine) {
    // Add cuisine to metadata for food tasks
    processed.metadata!.cuisine = analysis.cuisine;
  }

  log.debug('Local processing result', { processed });
  return processed;
}

// Comprehensive text analysis
function analyzeTextComprehensively(text: string): any {
  const lower = text.toLowerCase();
  const analysis: any = {
    hasLocation: false,
    hasHabit: false,
    hasTask: false,
    priority: 'medium',
    sentiment: 'neutral',
    confidence: 0,
  };

  // FIRST: Check for learning/study habits (these are NOT locations)
  const learningMatch = lower.match(/\b(learn|study|practice|master|improve)\s+(\w+)/i);
  if (learningMatch) {
    analysis.hasHabit = true;
    analysis.actionVerb = learningMatch[1];
    analysis.confidence += 0.9;
    
    // Don't treat language names as locations in learning context
    const languages = ['french', 'spanish', 'italian', 'german', 'chinese', 'japanese', 'korean', 'english'];
    if (languages.some(lang => lower.includes(`${learningMatch[1]} ${lang}`))) {
      analysis.hasLocation = false; // Explicitly not a location
    }
  }

  // Check for habit patterns BEFORE location checks
  const habitPatterns = [
    /\b(daily|every day|each day)\b/i,
    /\b(weekly|every week)\b/i,
    /\b(monthly|every month)\b/i,
    /\b\d+\s*(times?|x)\s*(per|a|every)\s*(day|week|month)\b/i,
    /\b(practice|exercise|workout|meditate|read|write|study|learn)\b/i,
    /\b(morning|evening|night)\s+(routine|ritual)\b/i,
  ];

  for (const pattern of habitPatterns) {
    const match = text.match(pattern);
    if (match) {
      analysis.hasHabit = true;
      analysis.frequency = match[0];
      analysis.confidence += 0.8;
      break;
    }
  }

  // Generic food/cuisine without specific location = oneTime task
  const cuisineList = 'chinese|italian|mexican|thai|indian|japanese|korean|french|spanish|greek|vietnamese|american|mediterranean|turkish|brazilian|peruvian|ethiopian|moroccan|lebanese|russian|polish|german|british|irish|cuban|jamaican|african|asian|european';
  const genericFoodMatch = text.toLowerCase().match(new RegExp(`\\b(try|eat|have|get|order|taste|enjoy)\\s+(${cuisineList})\\s*(food|cuisine|dinner|lunch|breakfast)?\\b`, 'i'));
  if (genericFoodMatch && !text.match(/\b(at|restaurant|place|shop|store|in|on|from)\s+[A-Z]/i)) {
    log.debug('Generic food task detected', { match: genericFoodMatch[0] });
    analysis.hasTask = true;
    analysis.actionVerb = genericFoodMatch[1];
    analysis.activityType = 'food';
    analysis.cuisine = genericFoodMatch[2];
    analysis.confidence += 0.9; // High confidence this is a task
    // This is explicitly NOT a location
    analysis.hasLocation = false;
    
    // If we already thought this was a location because of cuisine, override it
    if (analysis.placeType === 'restaurant' && !analysis.placeName) {
      analysis.placeType = undefined;
    }
  }

  // Check for specific place indicators
  const placeIndicators = [
    /\b(restaurant|cafe|bistro|diner|bar|pub|pizzeria)\s+(?:called|named)?\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i,
    /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(restaurant|cafe|bistro|diner|bar|pub|pizzeria)/i,
    /\b(at|in)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s*(?!food|cuisine)/i, // Not followed by food/cuisine
    /\b(visit|go to|check out)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s*(?!food|cuisine)/i,
  ];

  for (const pattern of placeIndicators) {
    const match = text.match(pattern);
    if (match) {
      analysis.hasLocation = true;
      analysis.placeName = match[2] || match[1];
      analysis.confidence += 0.9;
      break;
    }
  }

  // Check for countries WITH travel context
  for (const country of LOCATION_DATABASE.countries) {
    if (lower.includes(country)) {
      // Only mark as location if it's about visiting/traveling
      if (lower.match(new RegExp(`\\b(visit|travel|trip|go to|explore|tour|fly to|in)\\s+${country}\\b`, 'i'))) {
        analysis.hasLocation = true;
        analysis.country = country;
        analysis.placeType = 'country';
        analysis.confidence += 0.9;
      }
      break;
    }
  }

  // Check for cities (usually locations unless learning context)
  if (!analysis.hasHabit) {
    for (const city of LOCATION_DATABASE.cities) {
      if (lower.includes(city)) {
        analysis.hasLocation = true;
        analysis.city = city;
        analysis.placeType = analysis.placeType || 'city';
        analysis.confidence += 0.9;
        break;
      }
    }
  }

  // Check for place types WITH context - but not generic food
  for (const placeType of LOCATION_DATABASE.placeTypes) {
    if (lower.includes(placeType)) {
      // Need specific context, not just the place type
      if (lower.match(new RegExp(`\\b(new|local|nearby|the|a|an|specific)\\s+${placeType}\\b`, 'i')) ||
          lower.match(new RegExp(`\\b${placeType}\\s+(on|at|in|near|called|named)\\b`, 'i')) ||
          lower.match(new RegExp(`\\b[A-Z]\\w+(?:'s)?\\s+${placeType}\\b`, 'i'))) { // Proper noun + place type
        analysis.hasLocation = true;
        analysis.placeType = analysis.placeType || placeType;
        analysis.confidence += 0.7;
        
        // Set activity type based on place
        if (['restaurant', 'cafe', 'pizzeria', 'sushi', 'steakhouse'].includes(placeType)) {
          analysis.activityType = 'dining';
        } else if (['museum', 'gallery', 'theater', 'cinema'].includes(placeType)) {
          analysis.activityType = 'entertainment';
        } else if (['store', 'shop', 'mall', 'market'].includes(placeType)) {
          analysis.activityType = 'shopping';
        }
      }
      break;
    }
  }

  // Extract action verbs - but be context-aware
  const actionVerbs = {
    location: ['visit', 'go', 'explore', 'discover', 'check out', 'see', 'tour', 'eat at', 'dine at'],
    habit: ['practice', 'exercise', 'meditate', 'study', 'learn', 'read', 'write', 'train', 'master', 'improve'],
    task: ['call', 'email', 'buy', 'order', 'finish', 'complete', 'send', 'pick up', 'watch', 'make', 'cook', 'prepare']
  };

  // Special handling for "try" - it depends on context
  if (lower.includes('try')) {
    analysis.actionVerb = 'try';
    // Only mark as location if there's already a specific place identified
    if (analysis.placeName || analysis.city || analysis.country) {
      analysis.hasLocation = true;
    } else if (analysis.cuisine && !analysis.hasLocation) {
      // "try X food" without a place is a task
      analysis.hasTask = true;
    }
  }

  for (const [type, verbs] of Object.entries(actionVerbs)) {
    for (const verb of verbs) {
      if (lower.includes(verb)) {
        analysis.actionVerb = analysis.actionVerb || verb;
        if (type === 'location' && (analysis.placeName || analysis.city || analysis.country)) {
          analysis.hasLocation = true;
        } else if (type === 'habit') {
          analysis.hasHabit = true;
        } else if (type === 'task') {
          analysis.hasTask = true;
        }
        break;
      }
    }
  }

  // Sentiment analysis
  if (lower.includes('asap') || lower.includes('urgent') || lower.includes('important')) {
    analysis.priority = 'high';
    analysis.sentiment = 'urgent';
  } else if (lower.includes('excited') || lower.includes('can\'t wait') || lower.includes('amazing')) {
    analysis.sentiment = 'excited';
  }

  // Extract place name if location but no name yet
  if (analysis.hasLocation && !analysis.placeName) {
    analysis.placeName = extractPlaceName(text);
  }

  // Generate search query for locations
  if (analysis.hasLocation) {
    analysis.searchQuery = generateSearchQuery(text, analysis);
  }

  return analysis;
}

// Determine category from analysis
function determineCategoryFromAnalysis(analysis: any): IdeaCategory {
  // Habit signals are strongest when explicit
  if (analysis.hasHabit && (analysis.frequency || analysis.confidence > 0.7)) {
    return 'habit';
  }
  
  // If it has cuisine but no specific place, it's definitely a task
  if (analysis.cuisine && !analysis.placeName && !analysis.city && analysis.hasTask) {
    return 'oneTime';
  }
  
  // Location ONLY if there's a specific place
  if (analysis.hasLocation && analysis.confidence > 0.5) {
    // Must have an actual place, not just a cuisine type
    if (analysis.placeName || analysis.city || analysis.country || 
        (analysis.placeType && analysis.placeType !== 'restaurant')) {
      return 'location';
    }
  }
  
  // Learning activities are habits
  if (analysis.actionVerb && ['learn', 'study', 'practice', 'master', 'improve'].includes(analysis.actionVerb)) {
    return 'habit';
  }
  
  // Food-related tasks without specific location
  if (analysis.activityType === 'food' && !analysis.hasLocation) {
    return 'oneTime';
  }
  
  // Default to oneTime for tasks
  return 'oneTime';
}

// Generate comprehensive tags
function generateComprehensiveTags(text: string, category: IdeaCategory, analysis: any): string[] {
  const tags = new Set<string>();
  
  // Add category
  tags.add(category);
  
  // Add from analysis
  if (analysis.placeType && category === 'location') tags.add(analysis.placeType);
  if (analysis.country) tags.add(analysis.country);
  if (analysis.city) tags.add(analysis.city);
  if (analysis.cuisine) {
    tags.add(analysis.cuisine);
    tags.add('food');
    if (category === 'location') tags.add('restaurant');
  }
  if (analysis.activityType) tags.add(analysis.activityType);
  if (analysis.actionVerb) tags.add(analysis.actionVerb);
  if (analysis.priority === 'high') tags.add('urgent');
  if (analysis.sentiment === 'excited') tags.add('excited');
  
  // Category-specific tags
  if (category === 'habit') {
    tags.add('routine');
    if (analysis.actionVerb === 'learn' || analysis.actionVerb === 'study') {
      tags.add('learning');
      tags.add('education');
    }
    if (text.toLowerCase().includes('exercise') || text.toLowerCase().includes('workout')) {
      tags.add('fitness');
      tags.add('health');
    }
  }
  
  if (category === 'oneTime') {
    tags.add('task');
    if (analysis.cuisine && !analysis.placeName) {
      tags.add('food-adventure');
    }
  }
  
  // Add contextual tags based on content
  const lower = text.toLowerCase();
  
  // Time-based tags
  if (lower.includes('weekend')) tags.add('weekend');
  if (lower.includes('tonight')) tags.add('tonight');
  if (lower.includes('tomorrow')) tags.add('tomorrow');
  
  // Context tags
  if (lower.includes('date') || lower.includes('romantic')) tags.add('date-night');
  if (lower.includes('family')) tags.add('family-friendly');
  if (lower.includes('friend')) tags.add('social');
  if (lower.includes('work') || lower.includes('business')) tags.add('business');
  
  // Activity tags
  if (lower.includes('outdoor')) tags.add('outdoor');
  if (lower.includes('indoor')) tags.add('indoor');
  if (lower.includes('adventure')) tags.add('adventure');
  if (lower.includes('relax')) tags.add('relaxation');
  
  return Array.from(tags).slice(0, 10);
}

// Helper functions
function generateSmartTitle(text: string, category: IdeaCategory, analysis: any): string {
  if (category === 'location') {
    if (analysis.placeName) {
      return `Visit ${analysis.placeName}`;
    }
    if (analysis.city && analysis.country) {
      return `Trip to ${analysis.city}, ${analysis.country}`;
    }
    if (analysis.city || analysis.country) {
      return `Visit ${analysis.city || analysis.country}`;
    }
  }
  
  if (category === 'habit') {
    if (analysis.actionVerb && analysis.actionVerb.match(/learn|study|practice/)) {
      const subject = text.match(/(?:learn|study|practice)\s+(\w+)/i);
      if (subject) {
        return `${analysis.actionVerb} ${subject[1]}`;
      }
    }
    if (analysis.frequency) {
      return `${text.split(' ').slice(0, 3).join(' ')} ${analysis.frequency}`;
    }
  }
  
  if (category === 'oneTime') {
    // Better titles for food tasks
    if (analysis.cuisine && !analysis.placeName) {
      const cuisineCapitalized = analysis.cuisine.charAt(0).toUpperCase() + analysis.cuisine.slice(1);
      if (analysis.actionVerb === 'try') {
        return `Try ${cuisineCapitalized} food`;
      } else if (analysis.actionVerb) {
        const verbCapitalized = analysis.actionVerb.charAt(0).toUpperCase() + analysis.actionVerb.slice(1);
        return `${verbCapitalized} ${cuisineCapitalized} food`;
      }
      return `${cuisineCapitalized} food adventure`;
    }
    // Use the original text for other tasks
    return text.length <= 50 ? text : text.slice(0, 47) + '...';
  }
  
  // Default: first 50 chars
  return text.length <= 50 ? text : text.slice(0, 47) + '...';
}

function extractPlaceName(text: string): string {
  // Try to extract proper nouns or quoted names
  const properNounMatch = text.match(/\b[A-Z][a-zA-Z\s&'-]+\b/);
  if (properNounMatch) {
    return properNounMatch[0].trim();
  }
  
  // Try after common patterns
  const patterns = [
    /(?:try|visit|go to|check out)\s+([^,\.\!]+)/i,
    /(?:at|in)\s+([A-Z][^,\.\!]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return text.slice(0, 30);
}

function generateSearchQuery(text: string, analysis: any): string {
  const parts = [];
  
  if (analysis.placeName) parts.push(analysis.placeName);
  if (analysis.city && !analysis.placeName?.includes(analysis.city)) parts.push(analysis.city);
  if (analysis.country && !analysis.city) parts.push(analysis.country);
  
  return parts.join(', ') || text;
}

function estimateTime(text: string, category: IdeaCategory): string {
  const timeMatch = text.match(/(\d+)\s*(hours?|hrs?|minutes?|mins?)/i);
  if (timeMatch) {
    const amount = parseInt(timeMatch[1]);
    const unit = timeMatch[2].toLowerCase();
    if (unit.startsWith('h')) {
      return `${amount} hour${amount !== 1 ? 's' : ''}`;
    } else {
      return `${amount} minute${amount !== 1 ? 's' : ''}`;
    }
  }
  
  switch (category) {
    case 'location':
      return '1-3 hours';
    case 'habit':
      return '30 minutes';
    case 'oneTime':
      return '1 hour';
  }
}

// Validation helper
function isValidProcessedIdea(obj: any): boolean {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.originalText === 'string' &&
    ['location', 'habit', 'oneTime'].includes(obj.category) &&
    Array.isArray(obj.tags) &&
    obj.tags.length > 0
  );
}

// Fetch with timeout wrapper
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

// Get user's current location from the location service
async function getUserCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  console.log('📍 getUserCurrentLocation called - getting location from service');
  const userLocation = getUserLocation();
  
  if (userLocation) {
    console.log('📍 Found user location:', userLocation);
    return {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude
    };
  } else {
    console.log('📍 No user location available in service');
    return null;
  }
}

// Export utilities
export const IdeaProcessorUtils = {
  isLocationIdea: (idea: ProcessedIdea) => idea.category === 'location',
  isHabitIdea: (idea: ProcessedIdea) => idea.category === 'habit',
  isOneTimeIdea: (idea: ProcessedIdea) => idea.category === 'oneTime',
  getDisplayTitle: (idea: ProcessedIdea) => idea.title || idea.processedText.slice(0, 50),
  getSearchQuery: (idea: ProcessedIdea) => idea.location?.searchQuery || idea.location?.placeName || idea.originalText,
  getPlaceType: (idea: ProcessedIdea) => idea.location?.placeType || 'place',
  getTags: (idea: ProcessedIdea) => idea.tags || [],
};

/* TEST CASES - Expected categorizations:
 * 
 * LOCATIONS (specific places):
 * - "try Papa Johns" → location (specific restaurant)
 * - "visit Italy" → location (travel destination)
 * - "new sushi place on Main St" → location (specific location)
 * - "Golden Dragon chinese restaurant" → location (named restaurant)
 * 
 * HABITS (repeated activities):
 * - "learn French" → habit (learning activity)
 * - "meditate daily" → habit (daily routine)
 * - "practice guitar" → habit (practice activity)
 * - "exercise 3x week" → habit (regular activity)
 * 
 * ONE-TIME TASKS (no specific location):
 * - "try chinese food" → oneTime (no restaurant specified)
 * - "try italian food" → oneTime (general food adventure)
 * - "eat mexican food" → oneTime (no specific place)
 * - "call mom" → oneTime (single task)
 * - "watch a movie" → oneTime (general activity)
 */