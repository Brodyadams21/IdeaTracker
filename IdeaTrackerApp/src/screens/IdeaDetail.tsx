import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform, Alert } from 'react-native';

export default function IdeaDetail({ route, navigation }: any) {
  const { idea } = route.params;

  const openInMaps = () => {
    if (!idea.location) return;
    
    const query = idea.location.searchQuery || 
                 idea.location.placeName || 
                 idea.location.address ||
                 idea.originalText;
    
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(query)}`,
      android: `geo:0,0?q=${encodeURIComponent(query)}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Could not open maps');
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>{idea.title}</Text>
      <Text style={styles.category}>{idea.category}</Text>
      <Text style={styles.description}>{idea.text}</Text>
      
      {idea.estimatedTime && (
        <Text style={styles.detail}>⏱️ Time: {idea.estimatedTime}</Text>
      )}
      
      {idea.location && (
        <View style={styles.locationSection}>
          <Text style={styles.sectionTitle}>📍 Location Details</Text>
          <Text style={styles.detail}>
            <Text style={styles.detailLabel}>Place: </Text>
            {idea.location.placeName || idea.location.name || 'Unknown'}
          </Text>
          {idea.location.address && (
            <Text style={styles.detail}>
              <Text style={styles.detailLabel}>Address: </Text>
              {idea.location.address}
            </Text>
          )}
          {idea.location.city && (
            <Text style={styles.detail}>
              <Text style={styles.detailLabel}>City: </Text>
              {idea.location.city}
              {idea.location.country && `, ${idea.location.country}`}
            </Text>
          )}
          {idea.location.placeType && (
            <Text style={styles.detail}>
              <Text style={styles.detailLabel}>Type: </Text>
              {idea.location.placeType}
            </Text>
          )}
          {idea.location.latitude && idea.location.longitude && (
            <Text style={styles.detail}>
              <Text style={styles.detailLabel}>Coordinates: </Text>
              {idea.location.latitude.toFixed(6)}, {idea.location.longitude.toFixed(6)}
            </Text>
          )}
          <TouchableOpacity style={styles.mapButton} onPress={openInMaps}>
            <Text style={styles.mapButtonText}>🗺️ Open in Maps</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {idea.frequency && (
        <Text style={styles.detail}>🔄 Frequency: {idea.frequency}</Text>
      )}
      
      {idea.tags && idea.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {idea.tags.map((tag: string, index: number) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  category: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 15,
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 20,
  },
  detail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
  locationSection: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#555',
  },
  mapButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  mapButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});