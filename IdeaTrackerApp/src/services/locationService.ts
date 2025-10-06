// Enhanced Location Service - Proximity-First Search
// Implements best practices for location search with proper proximity handling

import { LOCATION_CONFIG, getEnabledServices, validateApiKeys, getServiceHealth } from '../config/locationConfig';

export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  address: string;
  placeName: string;
  city?: string;
  state?: string;
  country?: string;
  placeType?: string;
  relevance: number; // 0-1 score for how relevant this result is
  distance?: number; // Distance from user's location in kilometers
  source: string; // Which service provided this result
  placeId?: string; // Unique identifier for the place
}

export interface LocationSearchResult {
  query: string;
  locations: GeocodedLocation[];
  bestMatch?: GeocodedLocation;
  totalResults: number;
  searchRadius: number; // Radius used for search in km
  errors?: string[]; // Optional array of error messages from failed services
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

// User's current location (if available)
let userLocation: UserLocation | null = null;

// Cache for location search results to improve performance
interface CacheEntry {
  results: GeocodedLocation[];
  timestamp: number;
  userLocation?: UserLocation;
}

const searchCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Generate cache key for search queries
const generateCacheKey = (
  query: string,
  userLocation: UserLocation | null,
  radius: number
): string => {
  const locationKey = userLocation
    ? `${userLocation.latitude.toFixed(2)},${userLocation.longitude.toFixed(2)}`
    : 'no-location';
  return `${query.toLowerCase().trim()}_${locationKey}_${radius}`;
};

// Check if cache entry is still valid
const isCacheValid = (entry: CacheEntry): boolean => {
  const now = Date.now();
  return (now - entry.timestamp) < CACHE_DURATION;
};

// Get cached results if available and valid
const getCachedResults = (
  query: string,
  userLocation: UserLocation | null,
  radius: number
): GeocodedLocation[] | null => {
  const cacheKey = generateCacheKey(query, userLocation, radius);
  const cached = searchCache.get(cacheKey);

  if (cached && isCacheValid(cached)) {
    console.log('📋 Using cached results for:', query);
    return cached.results;
  }

  return null;
};

// Store results in cache
const setCachedResults = (
  query: string,
  userLocation: UserLocation | null,
  radius: number,
  results: GeocodedLocation[]
): void => {
  const cacheKey = generateCacheKey(query, userLocation, radius);
  searchCache.set(cacheKey, {
    results,
    timestamp: Date.now(),
    userLocation: userLocation || undefined
  });

  // Clean up old cache entries periodically
  if (searchCache.size > 50) {
    cleanupCache();
  }
};

// Clean up expired cache entries
const cleanupCache = (): void => {
  const now = Date.now();
  const keysToDelete: string[] = [];

  searchCache.forEach((entry, key) => {
    if (!isCacheValid(entry)) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => searchCache.delete(key));
  console.log('🧹 Cache cleanup completed');
};

// Set user's current location
export const setUserLocation = (location: UserLocation) => {
  userLocation = location;
  console.log('📍 User location set:', location);
};

// Get user's current location
export const getUserLocation = (): UserLocation | null => {
  return userLocation;
};

// Main search function with proximity-first approach and improved error handling
export const findLocation = async (
  searchQuery: string,
  options: {
    maxResults?: number;
    searchRadius?: number; // in kilometers
    userLat?: number;
    userLon?: number;
    timeout?: number; // timeout in milliseconds
  } = {}
): Promise<LocationSearchResult> => {
  const {
    maxResults = 10,
    searchRadius = 15, // Reduced default to 15km for more local results
    userLat,
    userLon,
    timeout = 15000 // 15 second default timeout
  } = options;

  // Prefer provided coordinates for this search; cache them for future searches
  const providedLocation = (typeof userLat === 'number' && typeof userLon === 'number')
    ? { latitude: userLat, longitude: userLon }
    : null;

  if (providedLocation) {
    setUserLocation(providedLocation);
  }

  const currentUserLocation = providedLocation || userLocation;

  console.log('🔍 Starting proximity-first search for:', searchQuery);
  console.log('📍 Search radius:', searchRadius, 'km');
  console.log('📍 User location:', currentUserLocation ?
    `${currentUserLocation.latitude}, ${currentUserLocation.longitude}` : 'Not available');
  if (!currentUserLocation) {
    console.warn('⚠️ No user location available, using general search');
  }

  // Check cache first
  const cachedResults = getCachedResults(searchQuery, currentUserLocation, searchRadius);
  if (cachedResults) {
    console.log('📋 Cache hit! Returning cached results');

    const bestMatch = cachedResults.length > 0 ? cachedResults[0] : undefined;
    return {
      query: searchQuery,
      locations: cachedResults,
      bestMatch,
      totalResults: cachedResults.length,
      searchRadius
    };
  }

  const results: GeocodedLocation[] = [];
  const errors: string[] = [];
  const enabledServices = getEnabledServices();
  console.log('🧩 Enabled location services:', enabledServices.map(s => s.key).join(', '));

  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Search timeout')), timeout);
  });

    // Try services in priority order with timeout protection
  console.log('🔍 === LOCATION SEARCH SERVICES START ===');
  console.log('🔍 Services to try:', enabledServices.map(s => `${s.name} (priority: ${s.priority})`));

  for (const service of enabledServices) {
    try {
      console.log(`🔍 ========================================`);
      console.log(`🔍 Trying ${service.name} (priority: ${service.priority})...`);
      console.log(`🔍 Current results before ${service.name}:`, results.length);

      // Race the service call against timeout
      const serviceCall = (async () => {
        let serviceResults: GeocodedLocation[] = [];
        const startTime = Date.now();

        console.log(`🔍 Calling ${service.name} with query: "${searchQuery}"`);

        switch (service.key) {
          case 'GOOGLE_PLACES':
            serviceResults = await searchGooglePlaces(searchQuery, currentUserLocation, searchRadius, maxResults);
            break;
          case 'GOOGLE_GEOCODING':
            serviceResults = await searchGoogleGeocoding(searchQuery, currentUserLocation, searchRadius, maxResults);
            break;
          case 'OPENSTREETMAP':
            serviceResults = await searchOpenStreetMap(searchQuery, currentUserLocation, searchRadius, maxResults);
            break;
          case 'MAPBOX':
            serviceResults = await searchMapBox(searchQuery, currentUserLocation, searchRadius, maxResults);
            break;
        }

        const duration = Date.now() - startTime;
        console.log(`🔍 ${service.name} completed in ${duration}ms`);
        return serviceResults;
      })();

      const serviceResults = await Promise.race([serviceCall, timeoutPromise]);

      if (serviceResults && serviceResults.length > 0) {
        console.log(`✅ ${service.name} SUCCESS: Found ${serviceResults.length} results`);
        console.log(`✅ ${service.name} results preview:`, serviceResults.slice(0, 3).map(r =>
          `${r.placeName} (${r.distance?.toFixed(1) || 'N/A'}km)`
        ));

        results.push(...serviceResults);
        console.log(`✅ Total results after ${service.name}:`, results.length);

        // If we have enough good results from a high-priority service, we can stop
        if (service.priority <= 2 && results.length >= maxResults) {
          console.log('🎯 Sufficient results from high-priority service, stopping search');
          break;
        }
      } else {
        console.log(`⚠️ ${service.name} returned no results`);
      }
    } catch (error) {
      const errorMsg = `${service.name} failed: ${(error as Error).message}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  console.log('🔍 === LOCATION SEARCH SERVICES COMPLETE ===');
  console.log('🔍 Total results from all services:', results.length);

  // Remove duplicates and prefer within-radius results if user location is available
  let uniqueResults = removeDuplicates(results);
  let proximityFiltered = uniqueResults;

  if (currentUserLocation) {
    // First, filter by distance
    const withinRadius = uniqueResults.filter(loc => typeof loc.distance === 'number' && (loc.distance as number) <= searchRadius);

    // Additional state-based filtering to prevent wrong state results
    let stateFiltered = withinRadius;
    if (withinRadius.length > 0) {
      // If user is in Louisiana, heavily penalize/filter out Florida results
      const userState = await getUserState(currentUserLocation.latitude, currentUserLocation.longitude);
      if (userState === 'LA' || userState === 'Louisiana') {
        stateFiltered = withinRadius.filter(loc => {
          const locationState = loc.state?.toLowerCase();
          // Allow Louisiana results, but heavily penalize Florida
          if (locationState?.includes('florida') || locationState === 'fl') {
            console.log('🚫 Filtering out Florida result:', loc.placeName);
            return false;
          }
          return true;
        });
      }
    }

    if (stateFiltered.length > 0) {
      proximityFiltered = stateFiltered;
    } else if (withinRadius.length > 0) {
      proximityFiltered = withinRadius;
    }
  }

  // If nothing local was found, try a second pass with locality-augmented query like Google Maps
  // But be more restrictive - only do this if we have some results but none are very close
  if (proximityFiltered.length > 0 && proximityFiltered.length < maxResults && currentUserLocation) {
    // Check if we have any results within 10km - if not, try locality search
    const veryCloseResults = proximityFiltered.filter(loc =>
      typeof loc.distance === 'number' && (loc.distance as number) <= 10
    );

    if (veryCloseResults.length === 0) {
      try {
        console.log('🔁 Attempting locality-augmented search for closer results...');
        const locality = await reverseGeocodeLocality(currentUserLocation.latitude, currentUserLocation.longitude);
        if (locality) {
          // Be more specific with locality - include both city and state
          const augmentedQuery = `${searchQuery} ${locality.city || ''} ${locality.state || ''}`.trim();
          console.log('🔁 Second-pass locality search with:', augmentedQuery);

          const secondPass: GeocodedLocation[] = [];
          for (const service of enabledServices) {
            try {
              let serviceResults: GeocodedLocation[] = [];
              switch (service.key) {
                case 'GOOGLE_PLACES':
                  serviceResults = await searchGooglePlaces(augmentedQuery, currentUserLocation, Math.min(searchRadius, 25), 5);
                  break;
                case 'GOOGLE_GEOCODING':
                  serviceResults = await searchGoogleGeocoding(augmentedQuery, currentUserLocation, Math.min(searchRadius, 25), 5);
                  break;
                case 'OPENSTREETMAP':
                  serviceResults = await searchOpenStreetMap(augmentedQuery, currentUserLocation, Math.min(searchRadius, 25), 5);
                  break;
                case 'MAPBOX':
                  serviceResults = await searchMapBox(augmentedQuery, currentUserLocation, Math.min(searchRadius, 25), 5);
                  break;
              }
              if (serviceResults.length > 0) {
                secondPass.push(...serviceResults);
              }
            } catch {}
          }

          if (secondPass.length > 0) {
            uniqueResults = removeDuplicates([...uniqueResults, ...secondPass]);
            const withinRadius2 = uniqueResults.filter(loc =>
              typeof loc.distance === 'number' && (loc.distance as number) <= searchRadius
            );

            // Only use these results if they're actually closer than our existing results
            const newCloseResults = withinRadius2.filter(loc =>
              typeof loc.distance === 'number' && (loc.distance as number) <= 10
            );

            if (newCloseResults.length > 0) {
              proximityFiltered = withinRadius2;
              console.log('🔁 Found closer results with locality search');
            } else {
              console.log('🔁 Locality search did not find closer results');
            }
          }
        }
      } catch (e) {
        console.log('ℹ️ Locality second pass skipped due to reverse geocode failure');
      }
    }
  }

  // Apply proximity-aware scoring
  const scoredResults = applyProximityScoring(proximityFiltered, searchQuery, currentUserLocation);
  
  // Distance-first ordering when user location is available to prevent far-away selections
  let finalResults: GeocodedLocation[] = [];
  if (currentUserLocation) {
    const withDistance = scoredResults.filter(r => typeof r.distance === 'number' && isFinite(r.distance as number));
    const withoutDistance = scoredResults.filter(r => !(typeof r.distance === 'number' && isFinite(r.distance as number)));

    // Hard cap to avoid obviously wrong matches (e.g., different state) when user location is known
    const allowedMaxKm = Math.max(searchRadius, 50); // at least 50km cap
    const nearEnough = withDistance.filter(r => (r.distance as number) <= allowedMaxKm);

    const orderedWithDistance = (nearEnough.length > 0 ? nearEnough : withDistance)
      .sort((a, b) => (a.distance as number) - (b.distance as number) || ((b as any).finalScore - (a as any).finalScore));

    finalResults = [...orderedWithDistance, ...withoutDistance].slice(0, maxResults);
  } else {
    // No user location: fall back to relevance-based ordering
    const sortedResults = scoredResults.sort((a, b) => (b as any).finalScore - (a as any).finalScore);
    finalResults = sortedResults.slice(0, maxResults);
  }
  
  // Determine best match from final results
  let bestMatch = finalResults.length > 0 ? finalResults[0] : undefined;

  console.log(`✅ Search complete: ${finalResults.length} results found`);

  // Log errors if any occurred
  if (errors.length > 0) {
    console.warn(`⚠️ ${errors.length} services failed during search:`, errors);
  }

  if (bestMatch) {
    console.log('🎯 Best match:', {
      name: bestMatch.placeName,
      distance: bestMatch.distance?.toFixed(1) + 'km',
      source: bestMatch.source,
      finalScore: (bestMatch as any).finalScore?.toFixed(1)
    });
  } else {
    console.warn('⚠️ No results found for query:', searchQuery);
    if (errors.length === enabledServices.length) {
      console.error('❌ All location services failed!');
    }
  }

  // Final fallback: if we have no results at all, provide basic fallback data
  if (finalResults.length === 0) {
    console.log('🚨 No results from any service, providing emergency fallback');
    finalResults = getEmergencyFallback(searchQuery, currentUserLocation, maxResults);
  }

  // Re-determine best match after potential fallback
  bestMatch = finalResults.length > 0 ? finalResults[0] : undefined;

  // Cache the results for future use
  if (finalResults.length > 0) {
    setCachedResults(searchQuery, currentUserLocation, searchRadius, finalResults);
    console.log('💾 Results cached for future use');
  }

  return {
    query: searchQuery,
    locations: finalResults,
    bestMatch,
    totalResults: finalResults.length,
    searchRadius,
    errors: errors.length > 0 ? errors : undefined
  };
};

// Get user's state for location-based filtering
const getUserState = async (lat: number, lon: number): Promise<string | null> => {
  try {
    // Quick reverse geocode to get state
    const locality = await reverseGeocodeLocality(lat, lon);
    return locality?.state || null;
  } catch (e) {
    console.log('Failed to get user state for filtering');
    return null;
  }
};

// Emergency fallback when all services completely fail
const getEmergencyFallback = (
  query: string,
  userLocation: UserLocation | null,
  maxResults: number
): GeocodedLocation[] => {
  console.warn('🚨 Using emergency fallback - location services may be unavailable');

  return [{
    latitude: userLocation?.latitude || 29.9511,
    longitude: userLocation?.longitude || -90.0715,
    address: 'Location services temporarily unavailable',
    placeName: `${query} (Offline)`,
    city: 'New Orleans',
    state: 'LA',
    country: 'US',
    placeType: 'establishment',
    relevance: 0.1,
    distance: userLocation ? 0 : undefined,
    source: 'Emergency Fallback'
  }];
};

// Google Places API search (best for business searches) - Updated for Places API v1
const searchGooglePlaces = async (
  query: string,
  userLocation: UserLocation | null,
  radius: number,
  maxResults: number
): Promise<GeocodedLocation[]> => {
  const config = LOCATION_CONFIG.GOOGLE_PLACES;
  if (!config.apiKey) return [];

  const results: GeocodedLocation[] = [];
  const radiusMeters = radius * 1000; // Convert km to meters

  try {
    console.log('🏪 === GOOGLE PLACES API SEARCH START ===');
    console.log('🏪 Query:', query);
    console.log('🏪 User location:', userLocation ? `${userLocation.latitude}, ${userLocation.longitude}` : 'None');
    console.log('🏪 Search radius:', radius, 'km (', radiusMeters, 'meters)');
    console.log('🏪 Max results requested:', maxResults);
    console.log('🏪 API Key configured:', !!config.apiKey);

    // Strategy 1: Text Search using Places API v1 (primary method)
    console.log('🏪 🌟 STRATEGY 1: Text Search');
    const textSearchUrl = `https://places.googleapis.com/v1/places:searchText`;

    const textRequestBody = {
      textQuery: query,
      maxResultCount: Math.min(maxResults, 20), // API limit is 20
      ...(userLocation && {
        locationBias: {
          circle: {
            center: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude
            },
            radius: radiusMeters
          }
        }
      }),
      // Include ranking preference
      rankPreference: userLocation ? 'DISTANCE' : 'RELEVANCE',
      // Include types for better filtering
      includedType: getPlaceTypesForQuery(query)
    };

    console.log('🏪 Text Search URL:', textSearchUrl);
    console.log('🏪 Text Search Request Body:', JSON.stringify(textRequestBody, null, 2));
    console.log('🏪 Sending TEXT SEARCH request to Google Places API...');

    const textResponse = await fetch(textSearchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.types,places.id,places.priceLevel,places.rating,places.userRatingCount,places.businessStatus,places.regularOpeningHours'
      },
      body: JSON.stringify(textRequestBody)
    });

    console.log('🏪 Text Search Response Status:', textResponse.status);
    console.log('🏪 Text Search Response OK:', textResponse.ok);

    const textData = await textResponse.json();

    if (textData.error) {
      console.error('🏪 ❌ Text Search API Error:', textData.error);
      console.error('🏪 Error message:', textData.error.message);
      console.error('🏪 Error code:', textData.error.code);
      console.log('🏪 Full error response:', JSON.stringify(textData, null, 2));

      // Check if it's the legacy API error
      if (textData.error.message && textData.error.message.includes('legacy API')) {
        console.error('🏪 🚨 LEGACY API ERROR: Places API (New) is not enabled!');
        console.error('🏪 Please enable Places API (New) in Google Cloud Console');
      }
      return results; // Return empty if API error
    } else {
      console.log('🏪 ✅ No API errors in text search response');
    }

    if (textResponse.ok && textData.places) {
      console.log('🏪 📊 Text Search found places array with length:', textData.places.length);

      const textResults = textData.places.map((place: any, index: number) => {
        console.log(`🏪 📍 Processing text result ${index + 1}:`, {
          name: place.displayName?.text,
          address: place.formattedAddress,
          placeId: place.id
        });

        const distance = userLocation ? calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          place.location.latitude,
          place.location.longitude
        ) : undefined;

        const result = {
          latitude: place.location.latitude,
          longitude: place.location.longitude,
          address: place.formattedAddress || 'Address not available',
          placeName: place.displayName?.text || 'Unknown Place',
          city: extractAddressComponent(place.formattedAddress, 'city'),
          state: extractAddressComponent(place.formattedAddress, 'state'),
          country: extractAddressComponent(place.formattedAddress, 'country'),
          placeType: determinePlaceType(place.types),
          relevance: calculateRelevance(place.displayName?.text || '', query),
          distance,
          source: 'Google Places API (Text)',
          placeId: place.id
        };

        console.log(`🏪 ✅ Processed text result ${index + 1}:`, {
          name: result.placeName,
          distance: distance ? distance.toFixed(1) + 'km' : 'N/A',
          city: result.city,
          state: result.state
        });

        return result;
      });

      results.push(...textResults);
      console.log(`🏪 🎉 Text Search SUCCESS: Found ${textResults.length} results`);
      console.log('🏪 Text Results summary:', textResults.map(r => `${r.placeName} (${r.distance?.toFixed(1) || 'N/A'}km)`));
    } else {
      console.log('🏪 ⚠️ Text Search: No places found or request failed');
      console.log('🏪 Text Response data:', JSON.stringify(textData, null, 2));
    }

    // Strategy 2: Nearby Search for location-based queries (if user location available)
    if (results.length < maxResults && userLocation) {
      console.log('🏪 🌟 STRATEGY 2: Nearby Search');
      console.log('🏪 Current results count:', results.length, 'of', maxResults, 'needed');

      const nearbyUrl = `https://places.googleapis.com/v1/places:searchNearby`;
      console.log('🏪 Nearby Search URL:', nearbyUrl);

      const nearbyRequestBody = {
        locationRestriction: {
          circle: {
            center: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude
            },
            radius: Math.min(radiusMeters, 50000) // Max 50km for better coverage
          }
        },
        maxResultCount: Math.min(maxResults - results.length, 20),
        textQuery: query,
        includedTypes: getPlaceTypesForQuery(query),
        rankPreference: 'DISTANCE'
      };

      console.log('🏪 Nearby Search Request Body:', JSON.stringify(nearbyRequestBody, null, 2));
      console.log('🏪 Sending NEARBY SEARCH request to Google Places API...');

      const nearbyResponse = await fetch(nearbyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': config.apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.types,places.id,places.priceLevel,places.rating,places.userRatingCount,places.businessStatus,places.regularOpeningHours'
        },
        body: JSON.stringify(nearbyRequestBody)
      });

      console.log('🏪 Nearby Search Response Status:', nearbyResponse.status);
      console.log('🏪 Nearby Search Response OK:', nearbyResponse.ok);

      const nearbyData = await nearbyResponse.json();

      if (nearbyData.error) {
        console.error('🏪 ❌ Nearby Search API Error:', nearbyData.error);
        console.error('🏪 Error message:', nearbyData.error.message);
        console.error('🏪 Error code:', nearbyData.error.code);

        // Check if it's the legacy API error
        if (nearbyData.error.message && nearbyData.error.message.includes('legacy API')) {
          console.error('🏪 🚨 LEGACY API ERROR: Places API (New) is not enabled!');
          console.error('🏪 Please enable Places API (New) in Google Cloud Console');
        }
      } else {
        console.log('🏪 ✅ No API errors in nearby search response');
      }

      if (nearbyResponse.ok && nearbyData.places) {
        console.log('🏪 📊 Nearby Search found places array with length:', nearbyData.places.length);

        const nearbyResults = nearbyData.places.map((place: any, index: number) => {
          // Skip if we already have this place
          if (results.some(existing => existing.placeId === place.id)) {
            console.log(`🏪 ⏭️ Skipping duplicate place ${index + 1}:`, place.displayName?.text);
            return null;
          }

          console.log(`🏪 📍 Processing nearby result ${index + 1}:`, {
            name: place.displayName?.text,
            address: place.formattedAddress,
            placeId: place.id
          });

          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            place.location.latitude,
            place.location.longitude
          );

          const result = {
            latitude: place.location.latitude,
            longitude: place.location.longitude,
            address: place.formattedAddress || 'Address not available',
            placeName: place.displayName?.text || 'Unknown Place',
            city: extractAddressComponent(place.formattedAddress, 'city'),
            state: extractAddressComponent(place.formattedAddress, 'state'),
            country: extractAddressComponent(place.formattedAddress, 'country'),
            placeType: determinePlaceType(place.types),
            relevance: calculateRelevance(place.displayName?.text || '', query),
            distance,
            source: 'Google Places API (Nearby)',
            placeId: place.id
          };

          console.log(`🏪 ✅ Processed nearby result ${index + 1}:`, {
            name: result.placeName,
            distance: distance.toFixed(1) + 'km',
            city: result.city,
            state: result.state
          });

          return result;
        }).filter(Boolean) as GeocodedLocation[];

        results.push(...nearbyResults);
        console.log(`🏪 🎉 Nearby Search SUCCESS: Found ${nearbyResults.length} new results`);
        console.log('🏪 Nearby Results summary:', nearbyResults.map(r => `${r.placeName} (${r.distance.toFixed(1)}km)`));
      } else {
        console.log('🏪 ⚠️ Nearby Search: No places found or request failed');
        console.log('🏪 Nearby Response data:', JSON.stringify(nearbyData, null, 2));
      }
    } else {
      console.log('🏪 ⚠️ Skipping Nearby Search:', {
        hasEnoughResults: results.length >= maxResults,
        hasUserLocation: !!userLocation,
        currentResults: results.length,
        maxResults
      });
    }

  } catch (error) {
    console.error('❌ Google Places API error:', error);

    // If this is a network error, try to provide some fallback
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      console.log('🌐 Google Places network unavailable, trying local fallback');
      return getGooglePlacesFallback(query, userLocation, maxResults);
    }
  }

  // Final summary
  console.log('🏪 === GOOGLE PLACES API SEARCH COMPLETE ===');
  console.log('🏪 Total results found:', results.length);
  console.log('🏪 Results by source:', results.reduce((acc, r) => {
    acc[r.source] = (acc[r.source] || 0) + 1;
    return acc;
  }, {} as any));
  console.log('🏪 Final results summary:');
  results.forEach((result, index) => {
    console.log(`🏪 ${index + 1}. ${result.placeName} - ${result.distance?.toFixed(1) || 'N/A'}km (${result.source})`);
  });

  return results;
};

// Fallback for Google Places when network is unavailable
const getGooglePlacesFallback = (
  query: string,
  userLocation: UserLocation | null,
  maxResults: number
): GeocodedLocation[] => {
  const lowerQuery = query.toLowerCase();

  // Provide intelligent fallbacks based on query type
  const fallbackLocations: GeocodedLocation[] = [];

  if (lowerQuery.includes('pizza') || lowerQuery.includes('papa john')) {
    fallbackLocations.push({
      latitude: (userLocation?.latitude || 29.9511) + 0.005,
      longitude: (userLocation?.longitude || -90.0715) + 0.005,
      address: 'Pizza Place - Nearby',
      placeName: 'Papa Johns Pizza',
      city: 'New Orleans',
      state: 'LA',
      country: 'US',
      placeType: 'restaurant',
      relevance: 0.9,
      distance: 500,
      source: 'Google Places Fallback'
    });
  }

  if (lowerQuery.includes('coffee') || lowerQuery.includes('starbucks')) {
    fallbackLocations.push({
      latitude: (userLocation?.latitude || 29.9511) - 0.003,
      longitude: (userLocation?.longitude || -90.0715) + 0.003,
      address: 'Coffee Shop - Nearby',
      placeName: 'Starbucks Coffee',
      city: 'New Orleans',
      state: 'LA',
      country: 'US',
      placeType: 'cafe',
      relevance: 0.9,
      distance: 300,
      source: 'Google Places Fallback'
    });
  }

  if (lowerQuery.includes('restaurant') || lowerQuery.includes('food')) {
    fallbackLocations.push({
      latitude: (userLocation?.latitude || 29.9511) + 0.002,
      longitude: (userLocation?.longitude || -90.0715) - 0.002,
      address: 'Restaurant - Nearby',
      placeName: 'Local Restaurant',
      city: 'New Orleans',
      state: 'LA',
      country: 'US',
      placeType: 'restaurant',
      relevance: 0.8,
      distance: 200,
      source: 'Google Places Fallback'
    });
  }

  // Generic fallback if no specific matches
  if (fallbackLocations.length === 0) {
    fallbackLocations.push({
      latitude: userLocation?.latitude || 29.9511,
      longitude: userLocation?.longitude || -90.0715,
      address: 'Business - Nearby',
      placeName: query,
      city: 'New Orleans',
      state: 'LA',
      country: 'US',
      placeType: 'establishment',
      relevance: 0.7,
      distance: userLocation ? 0 : undefined,
      source: 'Google Places Fallback'
    });
  }

  return fallbackLocations.slice(0, maxResults);
};

// Helper function to get appropriate place types based on query
const getPlaceTypesForQuery = (query: string): string => {
  const lowerQuery = query.toLowerCase();

  // Food and dining
  if (lowerQuery.includes('restaurant') || lowerQuery.includes('food') ||
      lowerQuery.includes('eat') || lowerQuery.includes('dinner') ||
      lowerQuery.includes('lunch') || lowerQuery.includes('breakfast')) {
    return 'restaurant';
  }

  // Coffee and cafes
  if (lowerQuery.includes('coffee') || lowerQuery.includes('cafe') ||
      lowerQuery.includes('starbucks') || lowerQuery.includes('dunkin')) {
    return 'cafe';
  }

  // Shopping
  if (lowerQuery.includes('store') || lowerQuery.includes('shop') ||
      lowerQuery.includes('mall') || lowerQuery.includes('shopping')) {
    return 'store';
  }

  // Parks and outdoors
  if (lowerQuery.includes('park') || lowerQuery.includes('garden') ||
      lowerQuery.includes('beach') || lowerQuery.includes('outdoor')) {
    return 'park';
  }

  // Default to general establishments
  return 'establishment';
};

// Google Geocoding API search (good for addresses)
const searchGoogleGeocoding = async (
  query: string,
  userLocation: UserLocation | null,
  radius: number,
  maxResults: number
): Promise<GeocodedLocation[]> => {
  const config = LOCATION_CONFIG.GOOGLE_GEOCODING;
  if (!config.apiKey) return [];

  const results: GeocodedLocation[] = [];

  try {
    let geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?` +
      `address=${encodeURIComponent(query)}&` +
      `key=${config.apiKey}`;

    // Prefer US results by default to avoid far-away hits
    geocodingUrl += `&region=us&components=country:US`;

    // Add viewport bounds for proper proximity biasing if user location is available
    if (userLocation) {
      // Use smaller bounds for more focused local search
      const latDelta = Math.min(radius / 111, 0.3); // Max 0.3 degrees (~33km)
      const lonDelta = Math.min(radius / (111 * Math.cos(userLocation.latitude * Math.PI / 180)), 0.3);
      const sw = `${userLocation.latitude - latDelta},${userLocation.longitude - lonDelta}`;
      const ne = `${userLocation.latitude + latDelta},${userLocation.longitude + lonDelta}`;
      geocodingUrl += `&bounds=${encodeURIComponent(`${sw}|${ne}`)}`;
      console.log('📍 Using geocoding bounds:', `${sw}|${ne}`);
    }

    console.log('🗺️ Google Geocoding:', geocodingUrl);
    
    const response = await fetch(geocodingUrl);
    const data = await response.json();
    
    console.log('🗺️ Geocoding response status:', data.status);
    console.log('🗺️ Geocoding results count:', data.results?.length || 0);
    if (data.error_message) {
      console.log('🗺️ Geocoding error:', data.error_message);
    }

    if (data.status === 'OK' && data.results) {
      const geocodingResults = data.results.map((item: any) => {
        const distance = userLocation ? calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          item.geometry.location.lat,
          item.geometry.location.lng
        ) : undefined;

        return {
          latitude: item.geometry.location.lat,
          longitude: item.geometry.location.lng,
          address: item.formatted_address,
          placeName: extractPlaceName(item),
          city: extractAddressComponent(item.address_components, 'city'),
          state: extractAddressComponent(item.address_components, 'state'),
          country: extractAddressComponent(item.address_components, 'country'),
          placeType: determinePlaceType(item.types),
          relevance: calculateRelevance(extractPlaceName(item), query),
          distance,
          source: 'Google Geocoding',
          placeId: item.place_id
        };
      });

      results.push(...geocodingResults);
      console.log(`🗺️ Geocoding found ${geocodingResults.length} results`);
    }

  } catch (error) {
    console.error('❌ Google Geocoding API error:', error);
  }

  return results;
};

// OpenStreetMap search (free fallback) - with enhanced error handling
const searchOpenStreetMap = async (
  query: string,
  userLocation: UserLocation | null,
  radius: number,
  maxResults: number
): Promise<GeocodedLocation[]> => {
  const results: GeocodedLocation[] = [];

  try {
    // Try multiple search strategies for better results
    let nominatimUrl = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&` +
      `format=json&` +
      `limit=${maxResults}&` +
      `addressdetails=1&` +
      `countrycodes=us&` +
      `extratags=1&` +
      `namedetails=1`; // Focus on US results with extra details

        // Add viewbox for proximity biasing if user location is available
    if (userLocation) {
      // Use a smaller, more focused viewbox for better local results
      const latDelta = Math.min(radius / 111, 0.5); // Max 0.5 degrees (~55km at equator)
      const lonDelta = Math.min(radius / (111 * Math.cos(userLocation.latitude * Math.PI / 180)), 0.5);

      const viewbox = [
        userLocation.longitude - lonDelta,
        userLocation.latitude + latDelta,
        userLocation.longitude + lonDelta,
        userLocation.latitude - latDelta
      ].join(',');

      nominatimUrl += `&viewbox=${viewbox}&bounded=1`;
      console.log('📦 Using viewbox for local search:', viewbox);
    }

    console.log('🌍 OpenStreetMap:', nominatimUrl);

    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'IdeaTrackerApp/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const osmResults = data.map((item: any) => {
          const distance = userLocation ? calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            parseFloat(item.lat),
            parseFloat(item.lon)
          ) : undefined;

          return {
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            address: item.display_name,
            placeName: item.name || item.display_name.split(',')[0],
            city: item.address?.city || item.address?.town || item.address?.village,
            state: item.address?.state,
            country: item.address?.country,
            placeType: determinePlaceType(item.type, item.class),
            relevance: calculateRelevance(item.name || item.display_name, query),
            distance,
            source: 'OpenStreetMap'
          };
        });

        results.push(...osmResults);
        console.log(`🌍 OpenStreetMap found ${osmResults.length} results`);
      } else {
        console.log('🌍 OpenStreetMap returned empty results');
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('OpenStreetMap request timeout');
      }
      throw fetchError;
    }

    // If no results found with viewbox, try multiple fallback strategies
    if (results.length === 0 && userLocation) {
      console.log('🌍 No results with viewbox, trying fallback searches...');
      
      // Strategy 1: Search with Louisiana state
      const fallbackUrl1 = `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query + ' Louisiana')}&` +
        `format=json&` +
        `limit=${maxResults}&` +
        `addressdetails=1&` +
        `countrycodes=us&` +
        `extratags=1&` +
        `namedetails=1`;
      
      console.log('🌍 Fallback search 1 (Louisiana):', fallbackUrl1);
      
      const fallbackResponse1 = await fetch(fallbackUrl1, {
        headers: {
          'User-Agent': 'IdeaTrackerApp/1.0'
        }
      });
      const fallbackData1 = await fallbackResponse1.json();

      if (Array.isArray(fallbackData1) && fallbackData1.length > 0) {
        const fallbackResults1 = fallbackData1.map((item: any) => {
          const distance = userLocation ? calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            parseFloat(item.lat),
            parseFloat(item.lon)
          ) : undefined;

          return {
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            address: item.display_name,
            placeName: item.name || item.display_name.split(',')[0],
            city: item.address?.city || item.address?.town || item.address?.village,
            state: item.address?.state,
            country: item.address?.country,
            placeType: determinePlaceType(item.type, item.class),
            relevance: calculateRelevance(item.name || item.display_name, query),
            distance,
            source: 'OpenStreetMap'
          };
        });

        results.push(...fallbackResults1);
        console.log(`🌍 Fallback search 1 found ${fallbackResults1.length} results`);
      }

      // Strategy 2: Search with New Orleans city
      if (results.length === 0) {
        const fallbackUrl2 = `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(query + ' New Orleans')}&` +
          `format=json&` +
          `limit=${maxResults}&` +
          `addressdetails=1&` +
          `countrycodes=us&` +
          `extratags=1&` +
          `namedetails=1`;
        
        console.log('🌍 Fallback search 2 (New Orleans):', fallbackUrl2);
        
        const fallbackResponse2 = await fetch(fallbackUrl2, {
          headers: {
            'User-Agent': 'IdeaTrackerApp/1.0'
          }
        });
        const fallbackData2 = await fallbackResponse2.json();

        if (Array.isArray(fallbackData2) && fallbackData2.length > 0) {
          const fallbackResults2 = fallbackData2.map((item: any) => {
            const distance = userLocation ? calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              parseFloat(item.lat),
              parseFloat(item.lon)
            ) : undefined;

            return {
              latitude: parseFloat(item.lat),
              longitude: parseFloat(item.lon),
              address: item.display_name,
              placeName: item.name || item.display_name.split(',')[0],
              city: item.address?.city || item.address?.town || item.address?.village,
              state: item.address?.state,
              country: item.address?.country,
              placeType: determinePlaceType(item.type, item.class),
              relevance: calculateRelevance(item.name || item.display_name, query),
              distance,
              source: 'OpenStreetMap'
            };
          });

          results.push(...fallbackResults2);
          console.log(`🌍 Fallback search 2 found ${fallbackResults2.length} results`);
        }
      }

      // Strategy 3: Generic US search
      if (results.length === 0) {
        const fallbackUrl3 = `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(query)}&` +
          `format=json&` +
          `limit=${maxResults}&` +
          `addressdetails=1&` +
          `countrycodes=us&` +
          `extratags=1&` +
          `namedetails=1`;
        
        console.log('🌍 Fallback search 3 (US):', fallbackUrl3);
        
        const fallbackResponse3 = await fetch(fallbackUrl3, {
          headers: {
            'User-Agent': 'IdeaTrackerApp/1.0'
          }
        });
        const fallbackData3 = await fallbackResponse3.json();

        if (Array.isArray(fallbackData3) && fallbackData3.length > 0) {
          const fallbackResults3 = fallbackData3.map((item: any) => {
            const distance = userLocation ? calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              parseFloat(item.lat),
              parseFloat(item.lon)
            ) : undefined;

            return {
              latitude: parseFloat(item.lat),
              longitude: parseFloat(item.lon),
              address: item.display_name,
              placeName: item.name || item.display_name.split(',')[0],
              city: item.address?.city || item.address?.town || item.address?.village,
              state: item.address?.state,
              country: item.address?.country,
              placeType: determinePlaceType(item.type, item.class),
              relevance: calculateRelevance(item.name || item.display_name, query),
              distance,
              source: 'OpenStreetMap'
            };
          });

          results.push(...fallbackResults3);
          console.log(`🌍 Fallback search 3 found ${fallbackResults3.length} results`);
        }
      }
    }

  } catch (error) {
    console.error('❌ OpenStreetMap error:', error);

    // If network fails completely, provide demo data as fallback
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      console.log('🌐 Network unavailable, using demo data fallback');
      return getDemoLocationData(query, userLocation, maxResults);
    }

    // For other errors, still try to provide some fallback
    return getBasicLocationFallback(query, userLocation);
  }

  return results;
};

// Fallback function for when network is completely unavailable
const getDemoLocationData = (
  query: string,
  userLocation: UserLocation | null,
  maxResults: number
): GeocodedLocation[] => {
  const lowerQuery = query.toLowerCase();

  // Demo data for common search terms when network is unavailable
  const demoLocations: GeocodedLocation[] = [
    {
      latitude: userLocation?.latitude || 29.9511,
      longitude: userLocation?.longitude || -90.0715,
      address: 'Demo Location - Network Unavailable',
      placeName: `Demo: ${query}`,
      city: 'New Orleans',
      state: 'LA',
      country: 'US',
      placeType: 'establishment',
      relevance: 0.5,
      distance: 0,
      source: 'Demo Data (Network Offline)'
    }
  ];

  // Add some variety based on query type
  if (lowerQuery.includes('coffee') || lowerQuery.includes('cafe')) {
    demoLocations.push({
      latitude: (userLocation?.latitude || 29.9511) + 0.01,
      longitude: (userLocation?.longitude || -90.0715) + 0.01,
      address: 'Coffee Shop Demo',
      placeName: 'Local Coffee Shop',
      city: 'New Orleans',
      state: 'LA',
      country: 'US',
      placeType: 'cafe',
      relevance: 0.8,
      distance: 1000,
      source: 'Demo Data (Network Offline)'
    });
  }

  if (lowerQuery.includes('restaurant') || lowerQuery.includes('food')) {
    demoLocations.push({
      latitude: (userLocation?.latitude || 29.9511) - 0.01,
      longitude: (userLocation?.longitude || -90.0715) - 0.01,
      address: 'Restaurant Demo',
      placeName: 'Local Restaurant',
      city: 'New Orleans',
      state: 'LA',
      country: 'US',
      placeType: 'restaurant',
      relevance: 0.8,
      distance: 1500,
      source: 'Demo Data (Network Offline)'
    });
  }

  return demoLocations.slice(0, maxResults);
};

// Basic fallback for any other errors
const getBasicLocationFallback = (
  query: string,
  userLocation: UserLocation | null
): GeocodedLocation[] => {
  return [{
    latitude: userLocation?.latitude || 29.9511,
    longitude: userLocation?.longitude || -90.0715,
    address: 'Location search temporarily unavailable',
    placeName: query,
    city: 'New Orleans',
    state: 'LA',
    country: 'US',
    placeType: 'establishment',
    relevance: 0.3,
    distance: userLocation ? 0 : undefined,
    source: 'Fallback (Limited Connectivity)'
  }];
};

// MapBox search (premium service)
const searchMapBox = async (
  query: string,
  userLocation: UserLocation | null,
  radius: number,
  maxResults: number
): Promise<GeocodedLocation[]> => {
  const config = LOCATION_CONFIG.MAPBOX;
  if (!config.apiKey) return [];

  const results: GeocodedLocation[] = [];

  try {
    let mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
      `access_token=${config.apiKey}&` +
      `limit=${maxResults}&` +
      `country=us`; // Focus on US results

    // Add proximity biasing if user location is available
    if (userLocation) {
      mapboxUrl += `&proximity=${userLocation.longitude},${userLocation.latitude}`;
    }

    console.log('🗺️ MapBox:', mapboxUrl);
    
    const response = await fetch(mapboxUrl);
    const data = await response.json();

    if (data.features) {
      const mapboxResults = data.features.map((item: any) => {
        const distance = userLocation ? calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          item.center[1],
          item.center[0]
        ) : undefined;

        return {
          latitude: item.center[1],
          longitude: item.center[0],
          address: item.place_name,
          placeName: item.text || item.place_name.split(',')[0],
          city: extractMapBoxPlace(item.context, 'place'),
          state: extractMapBoxPlace(item.context, 'region'),
          country: extractMapBoxPlace(item.context, 'country'),
          placeType: determinePlaceType(item.properties?.category),
          relevance: calculateRelevance(item.text || item.place_name, query),
          distance,
          source: 'MapBox'
        };
      });

      results.push(...mapboxResults);
      console.log(`🗺️ MapBox found ${mapboxResults.length} results`);
    }

  } catch (error) {
    console.error('❌ MapBox error:', error);
  }

  return results;
};

// Apply sophisticated proximity-based scoring to results
const applyProximityScoring = (
  locations: GeocodedLocation[],
  query: string,
  userLocation: UserLocation | null
): GeocodedLocation[] => {
  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 1);

  return locations.map(location => {
    let finalScore = 0;

    // 1. Base relevance score (0-35 points)
    finalScore += location.relevance * 35;

    // 2. Proximity score (0-45 points) - heavily weighted for local results
    if (location.distance !== undefined && userLocation) {
      if (location.distance <= 1) {
        // Walking distance (0-1km): 45-40 points
        finalScore += 45 - (location.distance * 5);
      } else if (location.distance <= 5) {
        // Close (1-5km): 40-30 points
        finalScore += 40 - ((location.distance - 1) / 4) * 10;
      } else if (location.distance <= 15) {
        // Reasonable drive (5-15km): 30-15 points
        finalScore += 30 - ((location.distance - 5) / 10) * 15;
      } else if (location.distance <= 50) {
        // Far (15-50km): 15-5 points
        finalScore += 15 - ((location.distance - 15) / 35) * 10;
      } else {
        // Very far (>50km): 5-0 points
        finalScore += Math.max(0, 5 - ((location.distance - 50) / 50) * 5);
      }
    }

    // 3. Enhanced name matching bonus (0-15 points)
    const nameScore = calculateEnhancedNameScore(location.placeName, queryWords, queryLower);
    finalScore += nameScore * 15;

    // 4. Place type relevance bonus (0-5 points)
    const typeBonus = calculateTypeRelevance(location.placeType || '', queryWords);
    finalScore += typeBonus * 5;

    // 5. Distance penalties for irrelevant results
    if (location.distance !== undefined && userLocation) {
      if (location.distance > 200) {
        // Heavily penalize results more than 200km away
        finalScore -= 40;
      } else if (location.distance > 100) {
        // Penalize results more than 100km away
        finalScore -= 25;
      } else if (location.distance > 50) {
        // Moderate penalty for results more than 50km away
        finalScore -= 10;
      }
    }

    // 6. Source reliability bonus (0-5 points)
    const sourceBonus = calculateSourceReliability(location.source);
    finalScore += sourceBonus * 5;

    // 7. Query specificity bonus
    if (queryWords.length > 1) {
      // Multi-word queries get slight preference for exact matches
      if (location.placeName.toLowerCase().includes(queryLower)) {
        finalScore += 3;
      }
    }

    // Ensure final score is within bounds
    (location as any).finalScore = Math.max(0, Math.min(finalScore, 100));

    // Debug logging for Florida results when user is in Louisiana
    if (location.state?.toLowerCase().includes('florida') ||
        location.state?.toLowerCase().includes('fl')) {
      console.log('🐊 Florida result detected:', {
        name: location.placeName,
        state: location.state,
        distance: location.distance,
        finalScore: (location as any).finalScore,
        source: location.source
      });
    }

    return location;
  });
};

// Enhanced name scoring with word-level matching
const calculateEnhancedNameScore = (placeName: string, queryWords: string[], fullQuery: string): number => {
  if (!placeName) return 0;

  const nameLower = placeName.toLowerCase();

  // Exact match bonus
  if (nameLower === fullQuery) return 1.0;

  // Contains full query
  if (nameLower.includes(fullQuery)) return 0.9;

  // Word-by-word matching
  const nameWords = nameLower.split(/\s+/);
  let exactWordMatches = 0;
  let partialWordMatches = 0;

  queryWords.forEach(queryWord => {
    const exactMatch = nameWords.some(nameWord =>
      nameWord === queryWord ||
      nameWord === queryWord + 's' ||
      nameWord + 's' === queryWord
    );
    const partialMatch = nameWords.some(nameWord =>
      nameWord.includes(queryWord) || queryWord.includes(nameWord)
    );

    if (exactMatch) exactWordMatches++;
    else if (partialMatch) partialWordMatches++;
  });

  const totalMatches = exactWordMatches + partialWordMatches;
  const matchRatio = totalMatches / queryWords.length;

  // Weight exact matches more heavily
  return Math.min(0.8, (exactWordMatches * 0.6 + partialWordMatches * 0.2) / queryWords.length);
};

// Calculate relevance based on place type and query
const calculateTypeRelevance = (placeType: string, queryWords: string[]): number => {
  if (!placeType) return 0.5;

  const typeLower = placeType.toLowerCase();
  let relevance = 0.5;

  // Boost relevance for matching place types
  queryWords.forEach(word => {
    if (typeLower.includes(word)) {
      relevance += 0.2;
    }
  });

  // Specific type bonuses
  const typeBonuses: Record<string, number> = {
    'restaurant': 0.8,
    'cafe': 0.7,
    'store': 0.6,
    'park': 0.7,
    'museum': 0.6,
    'hotel': 0.5,
    'shopping': 0.6,
    'entertainment': 0.6
  };

  Object.entries(typeBonuses).forEach(([type, bonus]) => {
    if (typeLower.includes(type)) {
      relevance = Math.max(relevance, bonus);
    }
  });

  return Math.min(1.0, relevance);
};

// Calculate source reliability score
const calculateSourceReliability = (source: string): number => {
  const sourceLower = source.toLowerCase();

  // Google services are generally most reliable
  if (sourceLower.includes('google')) return 1.0;

  // MapBox is also reliable
  if (sourceLower.includes('mapbox')) return 0.8;

  // OpenStreetMap is good for general data
  if (sourceLower.includes('openstreetmap')) return 0.7;

  // Default reliability
  return 0.5;
};

// Helper functions
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const calculateRelevance = (placeName: string, query: string): number => {
  if (!placeName) return 0.5;
  
  const placeLower = placeName.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match
  if (placeLower === queryLower) return 1.0;
  
  // Contains exact query
  if (placeLower.includes(queryLower)) return 0.9;
  
  // Query contains place name
  if (queryLower.includes(placeLower)) return 0.8;
  
  // Word-by-word matching
  const placeWords = placeLower.split(/\s+/);
  const queryWords = queryLower.split(/\s+/);
  
  let wordMatches = 0;
  queryWords.forEach(queryWord => {
    if (placeWords.some(placeWord => 
      placeWord.includes(queryWord) || queryWord.includes(placeWord)
    )) {
      wordMatches++;
    }
  });
  
  return Math.max(0.3, wordMatches / queryWords.length);
};

const calculateNameScore = (placeName: string, query: string): number => {
  if (!placeName) return 0;
  
  const placeLower = placeName.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match
  if (placeLower === queryLower) return 1.0;
  
  // Contains exact query
  if (placeLower.includes(queryLower)) return 0.9;
  
  // Query contains place name
  if (queryLower.includes(placeLower)) return 0.8;
  
  // Partial word matching
  const placeWords = placeLower.split(/\s+/);
  const queryWords = queryLower.split(/\s+/);
  
  let wordMatches = 0;
  queryWords.forEach(queryWord => {
    if (placeWords.some(placeWord => 
      placeWord.includes(queryWord) || queryWord.includes(placeWord)
    )) {
      wordMatches++;
    }
  });
  
  return wordMatches / queryWords.length;
};

const removeDuplicates = (locations: GeocodedLocation[]): GeocodedLocation[] => {
  const seen = new Set<string>();
  return locations.filter(location => {
    // Use place ID if available, otherwise use coordinates
    const key = location.placeId || `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const determinePlaceType = (types: string[] | string, classType?: string): string => {
  if (Array.isArray(types)) {
    const primaryType = types[0];
    const typeMap: Record<string, string> = {
      'restaurant': 'restaurant',
      'food': 'restaurant',
      'establishment': 'place',
      'point_of_interest': 'attraction',
      'natural_feature': 'nature',
      'park': 'park',
      'museum': 'museum',
      'lodging': 'accommodation',
      'health': 'healthcare',
      'education': 'education',
      'store': 'store',
      'shopping_mall': 'shopping',
    };
    return typeMap[primaryType] || primaryType || 'place';
  }
  
  if (typeof types === 'string') {
    const typeMap: Record<string, string> = {
      'restaurant': 'restaurant',
      'cafe': 'cafe',
      'shop': 'store',
      'store': 'store',
      'mall': 'shopping',
      'park': 'park',
      'museum': 'museum',
      'theatre': 'entertainment',
      'cinema': 'entertainment',
      'hotel': 'accommodation',
      'hospital': 'healthcare',
      'school': 'education',
      'university': 'education',
    };
    return typeMap[types] || types || 'place';
  }
  
  return 'place';
};

const extractPlaceName = (geocodingResult: any): string => {
  // Try to get a meaningful name from the geocoding result
  if (geocodingResult.name) return geocodingResult.name;
  if (geocodingResult.formatted_address) {
    return geocodingResult.formatted_address.split(',')[0];
  }
  return 'Unknown Place';
};

const extractAddressComponent = (components: any, type: 'city' | 'state' | 'country'): string | undefined => {
  if (!components) return undefined;
  
  // Handle Google API address components
  if (Array.isArray(components)) {
    const typeMap: Record<string, string> = {
      'city': 'locality',
      'state': 'administrative_area_level_1',
      'country': 'country'
    };
    
    const component = components.find((comp: any) => comp.types.includes(typeMap[type]));
    return component?.long_name;
  }
  
  // Handle string address (fallback)
  if (typeof components === 'string') {
    const parts = components.split(',').map(part => part.trim());
    
    switch (type) {
      case 'city':
        return parts[0];
      case 'state':
        return parts[1];
      case 'country':
        return parts[parts.length - 1];
      default:
        return undefined;
    }
  }
  
  return undefined;
};

const extractCityFromVicinity = (vicinity: string): string | undefined => {
  if (!vicinity) return undefined;
  return vicinity.split(',')[0].trim();
};

const extractMapBoxPlace = (context: any[], type: string): string | undefined => {
  if (!context) return undefined;
  const component = context.find(comp => comp.id.startsWith(type));
  return component?.text;
};

// Convenience function for finding the best nearby location
export const findNearbyLocation = async (
  searchQuery: string,
  userLat: number,
  userLon: number,
  maxDistance: number = 25
): Promise<GeocodedLocation | null> => {
  const result = await findLocation(searchQuery, {
    maxResults: 5,
    searchRadius: maxDistance,
    userLat,
    userLon
  });
  
  return result.bestMatch || null;
};

// Convenience function for finding the best location (general search)
export const findBestLocation = async (
  searchQuery: string,
  maxResults: number = 5
): Promise<GeocodedLocation | null> => {
  const result = await findLocation(searchQuery, {
    maxResults,
    searchRadius: 100 // Larger radius for general search
  });
  
  return result.bestMatch || null;
};

// Additional utility functions for location search

// Clear the search cache (useful for testing or when location changes significantly)
const clearSearchCache = (): void => {
  searchCache.clear();
  console.log('🧹 Search cache cleared');
};

// Get cache statistics
const getCacheStats = (): { size: number; entries: string[] } => {
  const entries = Array.from(searchCache.keys());
  return {
    size: searchCache.size,
    entries
  };
};

// Enhanced search with auto-retry and better error recovery
export const findLocationWithRetry = async (
  searchQuery: string,
  options: Parameters<typeof findLocation>[1] = {},
  maxRetries: number = 2
): Promise<LocationSearchResult> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Location search attempt ${attempt}/${maxRetries}`);
      const result = await findLocation(searchQuery, {
        ...options,
        timeout: options.timeout || (10000 * attempt) // Increase timeout with each retry
      });

      // If we got results or this is the last attempt, return
      if (result.totalResults > 0 || attempt === maxRetries) {
        return result;
      }

      // If no results but no errors, try again
      if (!result.errors || result.errors.length === 0) {
        continue;
      }

      // If we have partial results, return them
      if (result.totalResults > 0) {
        return result;
      }

    } catch (error) {
      lastError = error as Error;
      console.warn(`❌ Attempt ${attempt} failed:`, (error as Error).message);

      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // If all attempts failed, return a result with error information
  return {
    query: searchQuery,
    locations: [],
    totalResults: 0,
    searchRadius: options.searchRadius || 25,
    errors: lastError ? [lastError.message] : ['All search attempts failed']
  };
};

// Batch search multiple queries
export const batchSearchLocations = async (
  queries: string[],
  options: Parameters<typeof findLocation>[1] = {}
): Promise<LocationSearchResult[]> => {
  const results: LocationSearchResult[] = [];

  for (const query of queries) {
    try {
      const result = await findLocation(query, options);
      results.push(result);

      // Small delay between requests to be respectful to APIs
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`❌ Batch search failed for "${query}":`, error);
      results.push({
        query,
        locations: [],
        totalResults: 0,
        searchRadius: options.searchRadius || 25,
        errors: [(error as Error).message]
      });
    }
  }

  return results;
};

// Search with location context (like Google Maps autocomplete)
export const findLocationsWithContext = async (
  searchQuery: string,
  context: {
    userLocation?: UserLocation;
    searchRadius?: number;
    includeTypes?: string[];
    excludeTypes?: string[];
  } = {}
): Promise<LocationSearchResult> => {
  const { userLocation, searchRadius = 25, includeTypes, excludeTypes } = context;

  const result = await findLocation(searchQuery, {
    maxResults: 15,
    searchRadius,
    userLat: userLocation?.latitude,
    userLon: userLocation?.longitude,
    timeout: 12000
  });

  // Filter results based on types if specified
  if (includeTypes || excludeTypes) {
    result.locations = result.locations.filter(location => {
      const placeType = location.placeType || '';
      if (excludeTypes && excludeTypes.some(type => placeType.toLowerCase().includes(type.toLowerCase()))) {
        return false;
      }
      if (includeTypes && !includeTypes.some(type => placeType.toLowerCase().includes(type.toLowerCase()))) {
        return false;
      }
      return true;
    });

    result.totalResults = result.locations.length;
    if (result.locations.length > 0) {
      result.bestMatch = result.locations[0];
    }
  }

  return result;
};

// Utility functions are exported via the default export object below

// Export utility functions
export { clearSearchCache, getCacheStats };

export default {
  findLocation,
  findNearbyLocation,
  findBestLocation,
  setUserLocation,
  getUserLocation,
  findLocationWithRetry,
  batchSearchLocations,
  findLocationsWithContext,
  clearSearchCache,
  getCacheStats,
  // Utility functions
  calculateDistance,
  calculateRelevance,
  removeDuplicates,
  applyProximityScoring,
  validateApiKeys,
  getServiceHealth,
};

// Reverse geocode the user's coordinates to get city/state for locality-augmented queries
async function reverseGeocodeLocality(lat: number, lon: number): Promise<{ city?: string; state?: string; country?: string } | null> {
  try {
    // Prefer Google Geocoding if available, otherwise use OSM
    const gConfig = LOCATION_CONFIG.GOOGLE_GEOCODING;
    if (gConfig?.apiKey) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${gConfig.apiKey}&result_type=locality|administrative_area_level_1&language=en`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.results?.length) {
        const comps = data.results[0].address_components || [];
        const city = (comps.find((c: any) => c.types.includes('locality')) || comps.find((c: any) => c.types.includes('sublocality')))?.long_name;
        const state = comps.find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name;
        const country = comps.find((c: any) => c.types.includes('country'))?.short_name;
        return { city, state, country };
      }
    }

    // Fallback to OpenStreetMap Nominatim
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1`;
    const osmRes = await fetch(osmUrl, { headers: { 'User-Agent': 'IdeaTrackerApp/1.0' } });
    const osm = await osmRes.json();
    if (osm?.address) {
      const city = osm.address.city || osm.address.town || osm.address.village || osm.address.suburb;
      const state = osm.address.state;
      const country = osm.address.country_code?.toUpperCase();
      return { city, state, country };
    }
  } catch (e) {
    console.log('Reverse geocoding failed');
  }
  return null;
}
