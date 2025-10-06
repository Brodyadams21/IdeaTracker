import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { MapRegion } from '../types';

interface MapState {
  userLocation: { latitude: number; longitude: number } | null;
  currentRegion: MapRegion;
  hasLocationPermission: boolean;
  geocodedMarkers: Map<string, { latitude: number; longitude: number }>;
  locationIdeas: any[];
  mapReady: boolean;
}

interface MapContextType {
  mapState: MapState;
  updateUserLocation: (location: { latitude: number; longitude: number } | null) => void;
  updateCurrentRegion: (region: MapRegion) => void;
  updateLocationPermission: (hasPermission: boolean) => void;
  updateGeocodedMarkers: (markers: Map<string, { latitude: number; longitude: number }>) => void;
  updateLocationIdeas: (ideas: any[]) => void;
  setMapReady: (ready: boolean) => void;
  geocodedMarkersRef: React.MutableRefObject<Map<string, { latitude: number; longitude: number }>>;
}

const defaultRegion: MapRegion = {
  latitude: 40.7128,
  longitude: -74.0060,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const defaultMapState: MapState = {
  userLocation: null,
  currentRegion: defaultRegion,
  hasLocationPermission: false,
  geocodedMarkers: new Map(),
  locationIdeas: [],
  mapReady: false,
};

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mapState, setMapState] = useState<MapState>(defaultMapState);
  const geocodedMarkersRef = useRef<Map<string, { latitude: number; longitude: number }>>(new Map());

  const updateUserLocation = (location: { latitude: number; longitude: number } | null) => {
    setMapState(prev => ({ ...prev, userLocation: location }));
  };

  const updateCurrentRegion = (region: MapRegion) => {
    setMapState(prev => ({ ...prev, currentRegion: region }));
  };

  const updateLocationPermission = (hasPermission: boolean) => {
    setMapState(prev => ({ ...prev, hasLocationPermission: hasPermission }));
  };

  const updateGeocodedMarkers = (markers: Map<string, { latitude: number; longitude: number }>) => {
    setMapState(prev => ({ ...prev, geocodedMarkers: markers }));
    geocodedMarkersRef.current = markers;
  };

  const updateLocationIdeas = (ideas: any[]) => {
    setMapState(prev => ({ ...prev, locationIdeas: ideas }));
  };

  const setMapReady = (ready: boolean) => {
    setMapState(prev => ({ ...prev, mapReady: ready }));
  };

  const contextValue: MapContextType = {
    mapState,
    updateUserLocation,
    updateCurrentRegion,
    updateLocationPermission,
    updateGeocodedMarkers,
    updateLocationIdeas,
    setMapReady,
    geocodedMarkersRef,
  };

  return (
    <MapContext.Provider value={contextValue}>
      {children}
    </MapContext.Provider>
  );
};

export const useMapContext = (): MapContextType => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
};
