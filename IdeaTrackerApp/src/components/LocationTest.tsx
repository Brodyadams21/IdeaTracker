import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { findLocation, setUserLocation } from '../services/locationService';

export default function LocationTest() {
  const [searchQuery, setSearchQuery] = useState('Papa Johns');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // Set New Orleans location for testing
  const testLocation = {
    latitude: 29.9511,
    longitude: -90.0715,
    accuracy: 10,
    timestamp: Date.now()
  };

  const testSearch = async () => {
    setLoading(true);
    setResults([]);

    try {
      // Set test location
      setUserLocation(testLocation);

      // Search for the query
      const result = await findLocation(searchQuery, {
        maxResults: 5,
        searchRadius: 25,
        userLat: testLocation.latitude,
        userLon: testLocation.longitude
      });

      setResults(result.locations);
      
      Alert.alert(
        'Search Results', 
        `Found ${result.totalResults} results. Best match: ${result.bestMatch?.placeName} (${result.bestMatch?.distance?.toFixed(1)}km away)`
      );

    } catch (error: any) {
      Alert.alert('Error', `Search failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location Search Test</Text>
      
      <TextInput
        style={styles.input}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Enter search query (e.g., Papa Johns)"
      />
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={testSearch}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Searching...' : 'Test Search'}
        </Text>
      </TouchableOpacity>

      {results.length > 0 && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>Results:</Text>
          {results.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <Text style={styles.resultName}>{result.placeName}</Text>
              <Text style={styles.resultAddress}>{result.address}</Text>
              <Text style={styles.resultDistance}>
                {result.distance?.toFixed(1)}km away • {result.source}
              </Text>
              <Text style={styles.resultScore}>
                Score: {(result as any).finalScore?.toFixed(1)}/100
              </Text>
            </View>
          ))}
        </View>
      )}
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
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    backgroundColor: 'white',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
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
    marginTop: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  resultAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  resultDistance: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 3,
  },
  resultScore: {
    fontSize: 12,
    color: '#28a745',
  },
});
