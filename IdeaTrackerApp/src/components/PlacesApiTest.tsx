import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { findLocation } from '../services/locationService';
import { debugEnvLoading } from '../config/env';

export default function PlacesApiTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const testPlacesApi = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      // Debug environment loading first
      debugEnvLoading();
      
      // Test with a simple query
      const result = await findLocation('Starbucks', {
        maxResults: 3,
        searchRadius: 10,
        userLat: 29.9511, // New Orleans coordinates
        userLon: -90.0715
      });
      
      console.log('🔍 Places API Test Result:', result);
      setResults(result.locations);
      
      if (result.errors && result.errors.length > 0) {
        Alert.alert('API Errors', result.errors.join('\n'));
      }
      
      if (result.locations.length === 0) {
        Alert.alert('No Results', 'No locations found. Check console for details.');
      } else {
        Alert.alert('Success', `Found ${result.locations.length} locations`);
      }
    } catch (error) {
      console.error('Places API Test Error:', error);
      Alert.alert('Error', `Test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Places API Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={testPlacesApi}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Places API'}
        </Text>
      </TouchableOpacity>
      
      {results.length > 0 && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>Results:</Text>
          {results.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <Text style={styles.resultName}>{result.placeName}</Text>
              <Text style={styles.resultAddress}>{result.address}</Text>
              <Text style={styles.resultSource}>Source: {result.source}</Text>
              {result.distance && (
                <Text style={styles.resultDistance}>
                  Distance: {result.distance.toFixed(1)}km
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  results: {
    marginTop: 10,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultItem: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    marginBottom: 8,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  resultAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  resultSource: {
    fontSize: 11,
    color: '#007AFF',
    marginTop: 2,
  },
  resultDistance: {
    fontSize: 11,
    color: '#28a745',
    marginTop: 2,
  },
});
