import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  PermissionsAndroid,
  Linking,
  Animated,
  Dimensions,
  TextInput,
  PanResponder,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { getLocationIdeas, updateIdeaCompletion, FirebaseIdea } from '../config/firebase';
import Geolocation from '@react-native-community/geolocation';
import { setUserLocation, findLocation, GeocodedLocation } from '../services/locationService';
import { useMapContext } from '../context/MapContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.4;
const BOTTOM_SHEET_MIN_HEIGHT = 60;

// Default to user's location or New York City
const DEFAULT_REGION = {
  latitude: 40.7128,
  longitude: -74.0060,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Custom map style for better visuals
const mapStyle = [
  {
    featureType: 'poi.business',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#a5d6a7' }],
  },
];

export default function MapScreenWithContext() {
  const {
    mapState,
    updateUserLocation,
    updateCurrentRegion,
    updateLocationPermission,
    updateGeocodedMarkers,
    updateLocationIdeas,
    setMapReady,
    geocodedMarkersRef,
  } = useMapContext();

  const [loading, setLoading] = useState(true);
  const [selectedIdea, setSelectedIdea] = useState<FirebaseIdea | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodedLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const mapRef = useRef<MapView>(null);
  const bottomSheetAnimation = useRef(new Animated.Value(BOTTOM_SHEET_MIN_HEIGHT)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const dragHandleScale = useRef(new Animated.Value(1)).current;
  const lastGestureState = useRef({ dy: 0, vy: 0 });
  const userLocationPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    console.log('🗺️ MapScreenWithContext mounted');
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

  // Debug effect to track component lifecycle
  useEffect(() => {
    console.log('🗺️ MapScreenWithContext state updated:', {
      userLocation: mapState.userLocation,
      currentRegion: mapState.currentRegion,
      hasLocationPermission: mapState.hasLocationPermission,
      geocodedMarkersCount: mapState.geocodedMarkers.size,
      locationIdeasCount: mapState.locationIdeas.length,
      mapReady: mapState.mapReady
    });
  }, [mapState]);

  useEffect(() => {
    // Geocode addresses when ideas are loaded
    if (mapState.locationIdeas.length > 0) {
      geocodeAllLocations();
    }
  }, [mapState.locationIdeas]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🗺️ MapScreenWithContext focused');
      console.log('🗺️ Current context state:', mapState);
      
      const refreshData = async () => {
        // Always reload location ideas to get latest data
        await loadLocationIdeas();
        
        // Restore geocoded coordinates from context
        if (mapState.geocodedMarkers.size > 0) {
          console.log(`🗺️ Restored ${mapState.geocodedMarkers.size} geocoded markers from context`);
          geocodedMarkersRef.current = new Map(mapState.geocodedMarkers);
        } else {
          console.log('🗺️ No geocoded markers in context, will geocode if needed');
        }
      };
      refreshData();
    }, [mapState])
  );

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
        
        // Update location service with user's current location
        setUserLocation({ latitude, longitude });
        
        // Start pulsing animation for user location marker
        startUserLocationPulse();
      },
      (error) => {
        console.error('Location error:', error);
        let errorMessage = 'Could not get your location.';
        
        if (error.code === 3) {
          errorMessage = 'Location request timed out. Using default location.';
        } else if (error.code === 1) {
          errorMessage = 'Location permission denied. Please enable location services.';
        } else if (error.code === 2) {
          errorMessage = 'Location unavailable. Using default location.';
        }
        
        Alert.alert('Location Notice', errorMessage);
        
        // Use default location (NYC) if location fails
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
      
      // Only update if the ideas have actually changed
      const currentIds = mapState.locationIdeas.map(idea => idea.id).sort().join(',');
      const newIds = ideas.map(idea => idea.id).sort().join(',');
      
      if (currentIds !== newIds) {
        updateLocationIdeas(ideas);
        console.log(`🗺️ Loaded ${ideas.length} location ideas:`, ideas.map(idea => ({
          id: idea.id,
          title: idea.title,
          hasLocation: !!idea.location,
          hasCoords: !!(idea.location?.latitude && idea.location?.longitude),
          location: idea.location
        })));
        
        // If we have ideas with coordinates, center map on them
        if (ideas.length > 0) {
          const ideasWithCoords = ideas.filter(idea => 
            idea.location?.latitude && idea.location?.longitude
          );
          
          console.log(`📍 Found ${ideasWithCoords.length} ideas with coordinates`);
          
          if (ideasWithCoords.length > 0) {
            fitMapToMarkers(ideasWithCoords);
          }
        }
      } else {
        console.log('🗺️ Location ideas unchanged, skipping update');
      }
    } catch (error) {
      console.error('Error loading location ideas:', error);
      Alert.alert('Error', 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const geocodeAllLocations = async () => {
    const ideasToGeocode = mapState.locationIdeas.filter(idea => {
      const hasNoCoords = !idea.location?.latitude || !idea.location?.longitude;
      const hasGeocodableText = !!(
        idea.location?.searchQuery || 
        idea.location?.placeName || 
        idea.location?.address ||
        idea.originalText ||
        idea.title
      );
      return hasNoCoords && hasGeocodableText;
    });

    console.log(`🗺️ Geocoding ${ideasToGeocode.length} locations...`);

    for (const idea of ideasToGeocode) {
      const query = idea.location?.searchQuery || 
                   idea.location?.placeName || 
                   idea.location?.address || 
                   idea.title ||
                   idea.originalText;
      
      console.log(`🔍 Geocoding "${query}" for idea ${idea.id}`);
      const coords = await geocodeAddress(query);
      if (coords) {
        console.log(`✅ Got coordinates for ${idea.id}:`, coords);
        const newMarkers = new Map(mapState.geocodedMarkers);
        newMarkers.set(idea.id, coords);
        updateGeocodedMarkers(newMarkers);
      } else {
        console.log(`❌ Failed to geocode ${idea.id}`);
      }
    }
  };

  const geocodeAddress = async (address: string): Promise<{latitude: number; longitude: number} | null> => {
    try {
      const result = await findLocation(address, {
        maxResults: 1,
        searchRadius: 50,
        userLat: mapState.userLocation?.latitude,
        userLon: mapState.userLocation?.longitude
      });
      
      if (result.bestMatch) {
        return {
          latitude: result.bestMatch.latitude,
          longitude: result.bestMatch.longitude
        };
      }
      
      return getDemoCoordinates(address);
    } catch (error) {
      console.error('Geocoding error:', error);
      return getDemoCoordinates(address);
    }
  };

  const getDemoCoordinates = (address: string): {latitude: number; longitude: number} | null => {
    const lower = address.toLowerCase();
    
    if (lower.includes('pizza') || lower.includes('italian')) {
      return { latitude: 40.7614, longitude: -73.9776 };
    }
    if (lower.includes('chinese') || lower.includes('asian')) {
      return { latitude: 40.7150, longitude: -73.9975 };
    }
    if (lower.includes('coffee') || lower.includes('cafe')) {
      return { latitude: 40.7489, longitude: -73.9680 };
    }
    if (lower.includes('park')) {
      return { latitude: 40.7829, longitude: -73.9654 };
    }
    
    return {
      latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
      longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
    };
  };

  const fitMapToMarkers = (ideas: FirebaseIdea[]) => {
    const coordinates = ideas
      .map(idea => {
        if (idea.location?.latitude && idea.location?.longitude) {
          return {
            latitude: idea.location.latitude,
            longitude: idea.location.longitude,
          };
        }
        const geocoded = mapState.geocodedMarkers.get(idea.id);
        return geocoded || null;
      })
      .filter(coord => coord !== null) as {latitude: number; longitude: number}[];

    if (coordinates.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
        animated: true,
      });
    }
  };

  const handleMapReady = () => {
    setMapReady(true);
    console.log('🗺️ Map is ready!');
    console.log('🗺️ Current region:', mapState.currentRegion);
    console.log('🗺️ User location:', mapState.userLocation);
    console.log('🗺️ Geocoding markers count:', mapState.geocodedMarkers.size);
    
    // If we have a user location and the map is ready, ensure we're centered on it
    if (mapState.userLocation && mapRef.current) {
      console.log('🗺️ Centering map on user location after map ready');
      const newRegion = {
        ...mapState.userLocation,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      updateCurrentRegion(newRegion);
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const result = await findLocation(searchQuery, {
        maxResults: 10,
        searchRadius: 25,
        userLat: mapState.userLocation?.latitude,
        userLon: mapState.userLocation?.longitude
      });
      
      setSearchResults(result.locations);
      setShowSearchResults(true);
      
      // Center map on best match
      if (result.bestMatch && mapRef.current) {
        const newRegion = {
          latitude: result.bestMatch.latitude,
          longitude: result.bestMatch.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        updateCurrentRegion(newRegion);
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'Could not search for locations');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const toggleBottomSheet = () => {
    const toValue = isBottomSheetExpanded ? BOTTOM_SHEET_MIN_HEIGHT : BOTTOM_SHEET_MAX_HEIGHT;
    setIsBottomSheetExpanded(!isBottomSheetExpanded);
    
    Animated.spring(bottomSheetAnimation, {
      toValue,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const isVerticalDrag = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        const hasMinimumMovement = Math.abs(gestureState.dy) > 5;
        return isVerticalDrag && hasMinimumMovement;
      },
      onPanResponderGrant: () => {
        setIsDragging(true);
        bottomSheetAnimation.stopAnimation();
        dragY.stopAnimation();
        
        const currentHeight = isBottomSheetExpanded ? BOTTOM_SHEET_MAX_HEIGHT : BOTTOM_SHEET_MIN_HEIGHT;
        dragY.setOffset(currentHeight);
        dragY.setValue(0);
        
        Animated.spring(dragHandleScale, {
          toValue: 1.15,
          tension: 400,
          friction: 8,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (evt, gestureState) => {
        lastGestureState.current = { dy: gestureState.dy, vy: gestureState.vy };
        
        const currentHeight = isBottomSheetExpanded ? BOTTOM_SHEET_MAX_HEIGHT : BOTTOM_SHEET_MIN_HEIGHT;
        const newHeight = currentHeight - gestureState.dy;
        
        const constrainedHeight = Math.max(
          BOTTOM_SHEET_MIN_HEIGHT - 20,
          Math.min(BOTTOM_SHEET_MAX_HEIGHT + 20, newHeight)
        );
        
        dragY.setValue(constrainedHeight - currentHeight);
      },
      onPanResponderRelease: (evt, gestureState) => {
        setIsDragging(false);
        dragY.flattenOffset();
        
        const { dy, vy } = gestureState;
        const currentHeight = isBottomSheetExpanded ? BOTTOM_SHEET_MAX_HEIGHT : BOTTOM_SHEET_MIN_HEIGHT;
        
        const dragThreshold = 30;
        const velocityThreshold = 0.5;
        const shouldCollapse = dy > dragThreshold || vy > velocityThreshold;
        const shouldExpand = dy < -dragThreshold || vy < -velocityThreshold;
        
        let targetExpanded = isBottomSheetExpanded;
        let targetHeight = currentHeight;
        
        if (shouldCollapse) {
          targetExpanded = false;
          targetHeight = BOTTOM_SHEET_MIN_HEIGHT;
        } else if (shouldExpand) {
          targetExpanded = true;
          targetHeight = BOTTOM_SHEET_MAX_HEIGHT;
        }
        
        setIsBottomSheetExpanded(targetExpanded);
        
        Animated.parallel([
          Animated.spring(bottomSheetAnimation, {
            toValue: targetHeight,
            tension: 100,
            friction: 8,
            useNativeDriver: false,
          }),
          Animated.spring(dragY, {
            toValue: 0,
            tension: 120,
            friction: 7,
            useNativeDriver: false,
          }),
          Animated.spring(dragHandleScale, {
            toValue: 1,
            tension: 400,
            friction: 8,
            useNativeDriver: true,
          })
        ]).start();
      },
    })
  ).current;

  const toggleIdeaCompletion = async (idea: FirebaseIdea) => {
    try {
      await updateIdeaCompletion(idea.id, !idea.completed);
      loadLocationIdeas();
    } catch (error) {
      Alert.alert('Error', 'Could not update idea');
    }
  };

  const openInMaps = (idea: FirebaseIdea) => {
    const query = idea.location?.searchQuery || 
                 idea.location?.placeName || 
                 idea.location?.address ||
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

  // Memoized idea list to prevent unnecessary re-renders during drag
  const memoizedIdeaList = useMemo(() => {
    if (mapState.locationIdeas.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyText}>
            No locations saved yet!
          </Text>
        </View>
      );
    }

    return mapState.locationIdeas.map((idea) => (
      <TouchableOpacity 
        key={idea.id} 
        style={[
          styles.ideaCard,
          selectedIdea?.id === idea.id && styles.selectedCard,
          idea.completed && styles.completedCard
        ]}
        onPress={() => selectIdea(idea)}
        activeOpacity={0.7}
      >
        <View style={styles.ideaHeader}>
          <Text style={[styles.placeIcon, { color: getMarkerColor(idea) }]}>
            {idea.location?.placeType === 'restaurant' ? '🍽️' :
             idea.location?.placeType === 'park' ? '🌳' :
             idea.location?.placeType === 'museum' ? '🏛️' :
             idea.location?.placeType === 'shopping' ? '🛍️' : '📍'}
          </Text>
          <View style={styles.ideaInfo}>
            <Text style={[
              styles.ideaTitle,
              idea.completed && styles.completedText
            ]} numberOfLines={1}>
              {idea.title || idea.location?.placeName || 'Untitled Place'}
            </Text>
            {idea.location?.city && (
              <Text style={styles.ideaLocation} numberOfLines={1}>
                {idea.location.city}
              </Text>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.checkButton}
            onPress={() => toggleIdeaCompletion(idea)}
          >
            <Text style={styles.checkIcon}>
              {idea.completed ? '✅' : '⭕'}
            </Text>
          </TouchableOpacity>
        </View>

        {selectedIdea?.id === idea.id && (
          <View style={styles.ideaExpanded}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => openInMaps(idea)}
            >
              <Text style={styles.actionButtonText}>🗺️ Open in Maps</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    ));
  }, [mapState.locationIdeas, selectedIdea]);

  const startUserLocationPulse = () => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(userLocationPulse, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(userLocationPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
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

  const selectIdea = async (idea: FirebaseIdea) => {
    console.log(`📍 Selecting idea: ${idea.id}`);

    setSelectedIdea(idea);

    let coords = idea.location?.latitude && idea.location?.longitude
      ? { latitude: idea.location.latitude, longitude: idea.location.longitude }
      : mapState.geocodedMarkers.get(idea.id);

    if (!coords) {
      const query = idea.location?.searchQuery || 
                   idea.location?.placeName || 
                   idea.location?.address || 
                   idea.title ||
                   idea.originalText;
      
      if (query) {
        console.log(`🔍 Geocoding on-demand: "${query}"`);
        const geocodedCoords = await geocodeAddress(query);
        if (geocodedCoords) {
          coords = geocodedCoords;
          const newMarkers = new Map(mapState.geocodedMarkers);
          newMarkers.set(idea.id, geocodedCoords);
          updateGeocodedMarkers(newMarkers);
        }
      }
    }

    if (coords && mapRef.current) {
      console.log(`🎯 Animating to coordinates:`, coords);
      const newRegion = {
        ...coords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      updateCurrentRegion(newRegion);
      mapRef.current.animateToRegion(newRegion, 1000);
    } else {
      console.log(`❌ Cannot animate - no coordinates or map ref`);
    }
  };

  const getMarkerColor = (idea: FirebaseIdea) => {
    if (idea.completed) return '#4CAF50';
    if (idea.metadata?.priority === 'high') return '#FF5252';
    if (idea.location?.placeType === 'restaurant') return '#FF9800';
    return '#2196F3';
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
        key="main-map"
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapState.currentRegion}
        onMapReady={handleMapReady}
        showsUserLocation={mapState.hasLocationPermission}
        showsMyLocationButton={false}
        showsCompass={true}
        zoomEnabled={true}
        zoomControlEnabled={true}
        customMapStyle={mapStyle}
      >
        {/* User Location Marker */}
        {mapState.mapReady && mapState.userLocation && (
          <Marker
            key="user-location"
            coordinate={mapState.userLocation}
            title="Your Location"
            description="You are here"
            pinColor="#007AFF"
          >
            <Animated.View 
              style={[
                styles.userLocationMarker,
                { transform: [{ scale: userLocationPulse }] }
              ]}
            >
              <View style={styles.userLocationInner}>
                <Text style={styles.userLocationIcon}>📍</Text>
              </View>
            </Animated.View>
          </Marker>
        )}

        {/* Location Ideas Markers */}
        {mapState.mapReady && mapState.locationIdeas.map((idea) => {
          const coords = idea.location?.latitude && idea.location?.longitude
            ? { latitude: idea.location.latitude, longitude: idea.location.longitude }
            : mapState.geocodedMarkers.get(idea.id);

          if (!coords) {
            console.log(`❌ No coordinates for idea ${idea.id} - will try to geocode`);
            return null;
          }

          return (
            <Marker
              key={idea.id}
              coordinate={coords}
              title={idea.title || idea.location?.placeName}
              description={idea.location?.address || idea.processedText}
              pinColor={getMarkerColor(idea)}
              onPress={() => selectIdea(idea)}
            >
              <Callout onPress={() => {}}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>
                    {idea.title || idea.location?.placeName}
                  </Text>
                  <Text style={styles.calloutDescription}>
                    {idea.processedText}
                  </Text>
                  {idea.location?.placeType && (
                    <Text style={styles.calloutType}>
                      📍 {idea.location.placeType}
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Compact Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search places..."
          placeholderTextColor="rgba(0,0,0,0.5)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity 
          style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.searchButtonText}>🔍</Text>
          )}
        </TouchableOpacity>
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={clearSearch}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Compact Search Results */}
      {showSearchResults && searchResults.length > 0 && (
        <View style={styles.searchResultsContainer}>
          <ScrollView style={styles.searchResultsList} showsVerticalScrollIndicator={false}>
            {searchResults.slice(0, 3).map((result, index) => (
              <TouchableOpacity
                key={index}
                style={styles.searchResultItem}
                onPress={() => {
                  if (mapRef.current) {
                    const newRegion = {
                      latitude: result.latitude,
                      longitude: result.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    };
                    updateCurrentRegion(newRegion);
                    mapRef.current.animateToRegion(newRegion, 1000);
                    setShowSearchResults(false);
                  }
                }}
              >
                <Text style={styles.searchResultName}>{result.placeName}</Text>
                {result.distance && (
                  <Text style={styles.searchResultDistance}>
                    {result.distance.toFixed(1)}km
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Floating Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={centerOnUser}
        >
          <Text style={styles.controlIcon}>📍</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => fitMapToMarkers(mapState.locationIdeas)}
        >
          <Text style={styles.controlIcon}>🗺️</Text>
        </TouchableOpacity>
      </View>

      {/* Compact Stats */}
      <View style={styles.statsBadge}>
        <Text style={styles.statsText}>
          {mapState.locationIdeas.filter(i => !i.completed).length} places
        </Text>
      </View>

      {/* Optimized Bottom Sheet */}
      <Animated.View 
        style={[
          styles.bottomSheet,
          { 
            height: Animated.add(bottomSheetAnimation, dragY),
          }
        ]}
      >
          <View style={styles.bottomSheetHeader}>
            <Animated.View 
              style={[
                styles.dragHandle,
                { transform: [{ scale: dragHandleScale }] }
              ]}
              {...panResponder.panHandlers}
            >
              <View style={[
                styles.dragIndicator,
                isDragging && styles.dragIndicatorActive
              ]} />
            </Animated.View>
            <Text style={styles.bottomSheetTitle}>
              {mapState.locationIdeas.length} Places
            </Text>
          </View>

        <ScrollView 
          style={styles.ideaList}
          contentContainerStyle={[
            styles.ideaListContent,
            { minHeight: isBottomSheetExpanded ? BOTTOM_SHEET_MAX_HEIGHT - 60 : BOTTOM_SHEET_MIN_HEIGHT - 60 }
          ]}
          showsVerticalScrollIndicator={false}
          bounces={true}
          scrollEnabled={isBottomSheetExpanded}
          removeClippedSubviews={true}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
        >
          {memoizedIdeaList}
        </ScrollView>
      </Animated.View>
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
  callout: {
    width: 200,
    padding: 10,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  calloutDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  calloutType: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  userLocationMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  userLocationInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userLocationIcon: {
    fontSize: 12,
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  searchButton: {
    backgroundColor: 'rgba(0,122,255,0.8)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  searchButtonDisabled: {
    backgroundColor: 'rgba(204,204,204,0.8)',
  },
  searchButtonText: {
    fontSize: 14,
    color: 'white',
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 12,
    color: 'white',
  },
  searchResultsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    left: 15,
    right: 15,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    maxHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 999,
  },
  searchResultsList: {
    maxHeight: 120,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  searchResultDistance: {
    fontSize: 11,
    color: 'rgba(0,122,255,0.8)',
    fontWeight: '500',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  bottomSheetHeader: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  dragHandle: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  dragIndicator: {
    width: 50,
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 3,
    marginBottom: 4,
  },
  dragIndicatorActive: {
    backgroundColor: 'rgba(0,122,255,0.9)',
    width: 60,
    height: 6,
    borderRadius: 4,
  },
  bottomSheetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  ideaList: {
    flex: 1,
  },
  ideaListContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  ideaCard: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedCard: {
    backgroundColor: 'rgba(33,150,243,0.1)',
    borderColor: '#2196F3',
    borderWidth: 1,
  },
  completedCard: {
    opacity: 0.6,
  },
  ideaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  ideaInfo: {
    flex: 1,
  },
  ideaTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 1,
  },
  ideaLocation: {
    fontSize: 11,
    color: '#666',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  checkButton: {
    padding: 4,
  },
  checkIcon: {
    fontSize: 18,
  },
  ideaExpanded: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
});
