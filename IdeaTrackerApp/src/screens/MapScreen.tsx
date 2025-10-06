import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useApp } from '../context/AppContext';
import { Idea, Location } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import locationService from '../services/locationService';

const { width, height } = Dimensions.get('window');

const MapScreen: React.FC = () => {
  const navigation = useNavigation();
  const { state } = useApp();
  const mapRef = useRef<MapView>(null);
  
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Get location-based ideas
  const locationIdeas = state.ideas.filter(idea => idea.location);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
      
      // Center map on current location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      Alert.alert(
        'Location Error',
        'Could not get your current location. Please check your location permissions.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkerPress = (idea: Idea) => {
    setSelectedIdea(idea);
  };

  const handleIdeaPress = (idea: Idea) => {
    navigation.navigate('IdeaDetail', { ideaId: idea.id });
  };

  const getMarkerColor = (priority: string): string => {
    switch (priority) {
      case 'urgent':
        return '#FF3B30';
      case 'high':
        return '#FF9500';
      case 'medium':
        return '#007AFF';
      case 'low':
        return '#8E8E93';
      default:
        return '#007AFF';
    }
  };

  const renderMarker = (idea: Idea) => {
    if (!idea.location) return null;

    return (
      <Marker
        key={idea.id}
        coordinate={{
          latitude: idea.location.latitude,
          longitude: idea.location.longitude,
        }}
        onPress={() => handleMarkerPress(idea)}
      >
        <View style={[
          styles.marker,
          { backgroundColor: getMarkerColor(idea.priority) }
        ]}>
          <Icon name="place" size={20} color="#FFFFFF" />
        </View>
      </Marker>
    );
  };

  const renderSelectedIdea = () => {
    if (!selectedIdea) return null;

    return (
      <View style={styles.selectedIdeaContainer}>
        <Card style={styles.selectedIdeaCard}>
          <View style={styles.selectedIdeaHeader}>
            <View style={styles.selectedIdeaTitleContainer}>
              <Icon
                name="place"
                size={20}
                color={getMarkerColor(selectedIdea.priority)}
                style={styles.selectedIdeaIcon}
              />
              <Text style={styles.selectedIdeaTitle} numberOfLines={1}>
                {selectedIdea.title}
              </Text>
            </View>
            
            <TouchableOpacity
              onPress={() => setSelectedIdea(null)}
              style={styles.closeButton}
            >
              <Icon name="close" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.selectedIdeaDescription} numberOfLines={2}>
            {selectedIdea.description}
          </Text>
          
          <View style={styles.selectedIdeaFooter}>
            <View style={styles.tagsContainer}>
              {selectedIdea.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
            
            <Button
              title="View Details"
              onPress={() => handleIdeaPress(selectedIdea)}
              size="small"
            />
          </View>
        </Card>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="map" size={64} color="#8E8E93" />
      <Text style={styles.emptyTitle}>No location-based ideas</Text>
      <Text style={styles.emptyMessage}>
        Add ideas with locations to see them on the map!
      </Text>
      <Button
        title="Add Idea with Location"
        onPress={() => navigation.navigate('Capture')}
        style={styles.emptyButton}
      />
    </View>
  );

  if (isLoading) {
    return <LoadingSpinner message="Getting your location..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Map</Text>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={getCurrentLocation}
        >
          <Icon name="my-location" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {locationIdeas.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            showsUserLocation
            showsMyLocationButton={false}
            onMapReady={() => setMapReady(true)}
            initialRegion={{
              latitude: currentLocation?.latitude || 37.78825,
              longitude: currentLocation?.longitude || -122.4324,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            {locationIdeas.map(renderMarker)}
          </MapView>

          {renderSelectedIdea()}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  
  locationButton: {
    padding: 8,
  },
  
  map: {
    flex: 1,
  },
  
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  
  selectedIdeaContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  
  selectedIdeaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  selectedIdeaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  selectedIdeaTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  selectedIdeaIcon: {
    marginRight: 8,
  },
  
  selectedIdeaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  
  closeButton: {
    padding: 4,
  },
  
  selectedIdeaDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 12,
  },
  
  selectedIdeaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  tagsContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  
  tag: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  
  tagText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  
  emptyMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  
  emptyButton: {
    paddingHorizontal: 24,
  },
});

export default MapScreen;