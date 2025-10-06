import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { findLocation, findNearbyLocation } from '../services/locationService';
import { GeocodedLocation } from '../services/locationService';
import Geolocation from '@react-native-community/geolocation';

export default function LocationDemo() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<GeocodedLocation[]>([]);
  const [bestMatch, setBestMatch] = useState<GeocodedLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Get user's current location
  const getUserLocation = () => {
    setLocationLoading(true);
    
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setLocationLoading(false);
        console.log('📍 User location:', { latitude, longitude });
      },
      (error) => {
        console.error('Location error:', error);
        setLocationLoading(false);
        Alert.alert('Location Error', 'Could not get your location');
      },
      { 
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  // Search with proximity-first approach
  const searchLocation = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    setLoading(true);
    setResults([]);
    setBestMatch(null);

    try {
      console.log('🔍 Searching for:', searchQuery);
      
      let searchResult;
      
      if (userLocation) {
        // Use proximity-first search with user location
        console.log('📍 Using proximity-first search near:', userLocation);
        searchResult = await findLocation(searchQuery, {
          maxResults: 10,
          searchRadius: 25, // 25km radius
          userLat: userLocation.latitude,
          userLon: userLocation.longitude
        });
      } else {
        // General search without user location
        console.log('📍 Using general search (no user location)');
        searchResult = await findLocation(searchQuery, {
          maxResults: 10,
          searchRadius: 100 // Larger radius when no user location
        });
      }
      
      setResults(searchResult.locations);
      setBestMatch(searchResult.bestMatch || null);
      
      console.log(`✅ Found ${searchResult.totalResults} locations`);
      console.log('🎯 Best match:', searchResult.bestMatch);
      
    } catch (error: any) {
      console.error('Search error:', error);
      Alert.alert('Error', `Search failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderLocation = (location: GeocodedLocation, index: number) => (
    <View key={index} style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <Text style={styles.locationName}>{location.placeName}</Text>
        <Text style={styles.locationType}>{location.placeType || 'place'}</Text>
      </View>
      
      <Text style={styles.locationAddress}>{location.address}</Text>
      
      <View style={styles.locationDetails}>
        <Text style={styles.coordinates}>
          📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
        </Text>
        
        {location.city && (
          <Text style={styles.city}>🏙️ {location.city}</Text>
        )}
        
        {location.country && (
          <Text style={[styles.country, location.country.toLowerCase() !== 'united states' && location.country.toLowerCase() !== 'usa' && location.country.toLowerCase() !== 'us' && styles.foreignCountry]}>
            🌍 {location.country}
          </Text>
        )}
        
        {location.distance !== undefined && (
          <Text style={styles.distance}>📏 {location.distance.toFixed(1)}km away</Text>
        )}
        
        <Text style={styles.relevance}>⭐ Relevance: {(location.relevance * 100).toFixed(0)}%</Text>
        <Text style={styles.smartScore}>🧠 Final Score: {(location as any).finalScore?.toFixed(1) || 'N/A'}/100</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗺️ Location Service Demo</Text>
      <Text style={styles.subtitle}>
        Test the automatic location finding and geocoding
      </Text>

      <View style={styles.locationContainer}>
        <TouchableOpacity 
          style={[styles.locationButton, userLocation && styles.locationButtonActive]}
          onPress={getUserLocation}
          disabled={locationLoading}
        >
          <Text style={styles.locationButtonText}>
            {locationLoading ? '📍 Getting Location...' : 
             userLocation ? '📍 Location Set' : '📍 Set My Location'}
          </Text>
        </TouchableOpacity>
        
        {userLocation && (
          <Text style={styles.locationText}>
            📍 {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
          </Text>
        )}
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Try: 'Papa Johns', 'Central Park', 'Starbucks'..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchLocation}
        />
        
        <TouchableOpacity 
          style={[styles.searchButton, loading && styles.searchButtonDisabled]}
          onPress={searchLocation}
          disabled={loading}
        >
          <Text style={styles.searchButtonText}>
            {loading ? '🔍 Searching...' : '🔍 Search'}
          </Text>
        </TouchableOpacity>
      </View>

      {bestMatch && (
        <View style={styles.bestMatchContainer}>
          <Text style={styles.bestMatchTitle}>🎯 Best Match</Text>
          {renderLocation(bestMatch, -1)}
          
          {/* Warning for foreign results */}
          {bestMatch.country && 
           bestMatch.country.toLowerCase() !== 'united states' && 
           bestMatch.country.toLowerCase() !== 'usa' && 
           bestMatch.country.toLowerCase() !== 'us' && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                ⚠️ This result is from {bestMatch.country}. Consider setting your location for better local results.
              </Text>
            </View>
          )}
        </View>
      )}

      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>
            📍 All Results ({results.length})
          </Text>
          
          <ScrollView style={styles.resultsList}>
            {results.map((location, index) => renderLocation(location, index))}
          </ScrollView>
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>How it works:</Text>
        <Text style={styles.infoText}>
          • Set your location first for nearby results{'\n'}
          • Searches multiple geocoding services{'\n'}
          • Finds real coordinates automatically{'\n'}
          • Smart scoring balances proximity + relevance{'\n'}
          • Theme parks beat restaurants for "universal studios"{'\n'}
          • Heavy penalty for foreign results on common businesses{'\n'}
          • Shows smart score (0-100) for each result
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  locationContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  locationButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  locationButtonActive: {
    backgroundColor: '#4CAF50',
  },
  locationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#ccc',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bestMatchContainer: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  bestMatchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  resultsList: {
    flex: 1,
  },
  locationCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  locationType: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  locationDetails: {
    gap: 5,
  },
  coordinates: {
    fontSize: 12,
    color: '#007AFF',
    fontFamily: 'monospace',
  },
  city: {
    fontSize: 12,
    color: '#666',
  },
  country: {
    fontSize: 12,
    color: '#666',
  },
  foreignCountry: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  distance: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  relevance: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
  smartScore: {
    fontSize: 12,
    color: '#9C27B0',
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1976D2',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1976D2',
  },
  warningContainer: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningText: {
    fontSize: 12,
    color: '#E65100',
    fontStyle: 'italic',
  },
});
