import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { getLocationIdeas, FirebaseIdea } from '../config/firebase';
import Geolocation from '@react-native-community/geolocation';
import { useMapContext } from '../context/MapContext';

const DEFAULT_REGION = {
  latitude: 40.7128,
  longitude: -74.0060,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export default function MapScreenSimple() {
  const { mapState, updateUserLocation, updateCurrentRegion, updateLocationPermission, updateLocationIdeas } = useMapContext();
  
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    console.log('🗺️ MapScreenSimple mounted');
    console.log('🗺️ Context state:', mapState);
    
    // Only request location permission if we don't have it
    if (!mapState.hasLocationPermission) {
      console.log('🗺️ No location permission, requesting...');
      requestLocationPermission();
    } else {
      console.log('🗺️ Location permission already granted');
    }
    
    loadLocationIdeas();
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'IdeaTracker Location Permission',
            message: 'IdeaTracker needs access to your location to show you on the map',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Location permission granted');
          updateLocationPermission(true);
          getCurrentLocation();
        } else {
          console.log('Location permission denied');
          updateLocationPermission(false);
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      // iOS permission handling
      updateLocationPermission(true);
      getCurrentLocation();
    }
  };

  const getCurrentLocation = () => {
    console.log('Getting current location...');
    
    Geolocation.getCurrentPosition(
      (position) => {
        console.log('Location obtained:', position);
        const { latitude, longitude } = position.coords;
        
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        
        updateUserLocation({ latitude, longitude });
        updateCurrentRegion(newRegion);
      },
      (error) => {
        console.error('Location error:', error);
        Alert.alert('Location Notice', 'Could not get your location. Using default location.');
        updateCurrentRegion(DEFAULT_REGION);
      },
      { 
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  const loadLocationIdeas = async () => {
    try {
      const ideas = await getLocationIdeas();
      updateLocationIdeas(ideas);
      console.log(`🗺️ Loaded ${ideas.length} location ideas`);
    } catch (error) {
      console.error('Error loading location ideas:', error);
      Alert.alert('Error', 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const centerOnUser = () => {
    if (mapState.userLocation && mapRef.current) {
      const newRegion = {
        ...mapState.userLocation,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      updateCurrentRegion(newRegion);
      mapRef.current.animateToRegion(newRegion, 1000);
    } else {
      requestLocationPermission();
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your places...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapState.currentRegion}
        showsUserLocation={mapState.hasLocationPermission}
        showsMyLocationButton={false}
        showsCompass={true}
        zoomEnabled={true}
        zoomControlEnabled={true}
      >
        {/* User Location Marker */}
        {mapState.userLocation && (
          <Marker
            key="user-location"
            coordinate={mapState.userLocation}
            title="Your Location"
            description="You are here"
            pinColor="#007AFF"
          />
        )}

        {/* Location Ideas Markers */}
        {mapState.locationIdeas.map((idea) => {
          if (idea.location?.latitude && idea.location?.longitude) {
            return (
              <Marker
                key={idea.id}
                coordinate={{
                  latitude: idea.location.latitude,
                  longitude: idea.location.longitude,
                }}
                title={idea.title || idea.location?.placeName}
                description={idea.location?.address || idea.processedText}
                pinColor={idea.completed ? '#4CAF50' : '#2196F3'}
              />
            );
          }
          return null;
        })}
      </MapView>

      {/* Floating Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={centerOnUser}
        >
          <Text style={styles.controlIcon}>📍</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsBadge}>
        <Text style={styles.statsText}>
          {mapState.locationIdeas.filter(i => !i.completed).length} places
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  map: {
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  mapControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    right: 15,
    gap: 10,
  },
  controlButton: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  controlIcon: {
    fontSize: 18,
    color: '#333',
  },
  statsBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    left: 15,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
