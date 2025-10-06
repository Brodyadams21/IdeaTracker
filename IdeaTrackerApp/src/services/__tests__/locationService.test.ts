// Test file for the new location service
// Tests both API functionality and core logic without external dependencies

import {
  findLocation,
  setUserLocation,
  getUserLocation,
  clearSearchCache,
  getCacheStats,
  calculateDistance,
  calculateRelevance,
  removeDuplicates
} from '../locationService';

// Mock user location (New Orleans area)
const mockUserLocation = {
  latitude: 29.9511,
  longitude: -90.0715,
  accuracy: 10,
  timestamp: Date.now()
};

describe('Location Service - Core Functionality', () => {
  beforeEach(() => {
    // Clear cache between tests
    clearSearchCache();
    // Set mock user location
    setUserLocation(mockUserLocation);
  });

  test('should calculate distance correctly', () => {
    // Test distance calculation (Haversine formula)
    const distance = calculateDistance(29.9511, -90.0715, 29.9511, -90.0715);
    expect(distance).toBe(0); // Same point should be 0 distance

    // Test approximate distance (New Orleans to Baton Rouge ~130km)
    const distanceToBatonRouge = calculateDistance(29.9511, -90.0715, 30.4518, -91.1871);
    expect(distanceToBatonRouge).toBeGreaterThan(120);
    expect(distanceToBatonRouge).toBeLessThan(140);
  });

  test('should calculate relevance scores correctly', () => {
    // Exact match should have highest relevance
    expect(calculateRelevance('Starbucks', 'Starbucks')).toBe(1.0);

    // Partial match should have lower relevance
    const partialScore = calculateRelevance('Starbucks Coffee', 'Starbucks');
    expect(partialScore).toBeGreaterThan(0.5);
    expect(partialScore).toBeLessThan(1.0);

    // No match should have low relevance
    expect(calculateRelevance('Starbucks', 'McDonalds')).toBeLessThan(0.5);
  });

  test('should handle user location management', () => {
    // Test setting and getting user location
    const testLocation = { latitude: 40.7128, longitude: -74.0060 };
    setUserLocation(testLocation);

    const retrievedLocation = getUserLocation();
    expect(retrievedLocation).toEqual(testLocation);
  });

  test('should manage search cache correctly', () => {
    // Cache should start empty
    expect(getCacheStats().size).toBe(0);

    // After clearing, should still be empty
    clearSearchCache();
    expect(getCacheStats().size).toBe(0);
  });

  test('should remove duplicate locations', () => {
    const locations = [
      {
        latitude: 29.9511,
        longitude: -90.0715,
        address: 'Test Address',
        placeName: 'Test Place',
        relevance: 0.8,
        source: 'Test'
      },
      {
        latitude: 29.9511,
        longitude: -90.0715,
        address: 'Test Address 2',
        placeName: 'Test Place 2',
        relevance: 0.7,
        source: 'Test'
      }
    ];

    const deduplicated = removeDuplicates(locations);
    expect(deduplicated.length).toBe(1); // Should remove duplicates
    expect(deduplicated[0].placeName).toBe('Test Place'); // Should keep first one
  });

  test('should test Google Places API debugging', async () => {
    console.log('🧪 Testing Google Places API with debugging...');

    const result = await findLocation('papa johns', {
      maxResults: 5,
      searchRadius: 25,
      userLat: mockUserLocation.latitude,
      userLon: mockUserLocation.longitude,
      timeout: 15000
    });

    console.log('🧪 Google Places Test Results:');
    console.log(`🧪 Total results: ${result.totalResults}`);
    console.log(`🧪 Search radius: ${result.searchRadius}km`);

    if (result.bestMatch) {
      console.log('🧪 Best match:', {
        name: result.bestMatch.placeName,
        distance: result.bestMatch.distance?.toFixed(1) + 'km',
        source: result.bestMatch.source,
        state: result.bestMatch.state
      });
    }

    if (result.errors && result.errors.length > 0) {
      console.log('🧪 Errors encountered:', result.errors);
    }

    // Result should have proper structure
    expect(result).toHaveProperty('query', 'papa johns');
    expect(result).toHaveProperty('totalResults');
    expect(Array.isArray(result.locations)).toBe(true);

    // Check if we're getting results from Google Places API
    const googleResults = result.locations.filter(loc =>
      loc.source.includes('Google Places')
    );
    console.log(`🧪 Google Places API results: ${googleResults.length}`);

    // This test will help us see if Google Places API is working
  }, 20000);

  test('should handle empty or invalid queries gracefully', async () => {
    // Test empty query
    const result = await findLocation('', {
      maxResults: 1,
      timeout: 3000 // Shorter timeout for empty query
    });

    expect(result.totalResults).toBe(0);
    expect(result.query).toBe('');
    expect(Array.isArray(result.locations)).toBe(true);
  }, 5000);

  test('should return proper error information when services fail', async () => {
    // Test with a very short timeout to force failures
    const result = await findLocation('Test Query', {
      maxResults: 1,
      timeout: 100 // Very short timeout
    });

    // Should still return a valid result object even if all services fail
    expect(result).toHaveProperty('query', 'Test Query');
    expect(result).toHaveProperty('locations');
    expect(Array.isArray(result.locations)).toBe(true);
  }, 5000);
});
