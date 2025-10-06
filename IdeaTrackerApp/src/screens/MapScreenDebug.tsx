import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useMapContext } from '../context/MapContext';

export default function MapScreenDebug() {
  try {
    const { mapState } = useMapContext();
    
    return (
      <View style={styles.container}>
        <Text style={styles.text}>MapScreen Debug</Text>
        <Text style={styles.text}>Context loaded: {mapState ? 'Yes' : 'No'}</Text>
        <Text style={styles.text}>User Location: {mapState?.userLocation ? 'Available' : 'None'}</Text>
        <Text style={styles.text}>Location Ideas: {mapState?.locationIdeas?.length || 0}</Text>
        <Text style={styles.text}>Map Ready: {mapState?.mapReady ? 'Yes' : 'No'}</Text>
      </View>
    );
  } catch (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});
