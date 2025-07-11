import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import QuickCapture from '../screens/QuickCapture';

const Tab = createBottomTabNavigator();

// Placeholder screens for now
function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24 }}>🏠 Home</Text>
      <Text style={{ marginTop: 10 }}>Your ideas will show here</Text>
    </View>
  );
}

function ListsScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24 }}>📋 Lists</Text>
      <Text style={{ marginTop: 10 }}>Coming soon!</Text>
    </View>
  );
}

function MapScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24 }}>🗺️ Map</Text>
      <Text style={{ marginTop: 10 }}>Location ideas coming soon!</Text>
    </View>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
          },
          headerShown: false,
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>🏠</Text>
            ),
          }}
        />
        <Tab.Screen 
          name="Capture" 
          component={QuickCapture}
          options={{
            tabBarLabel: 'Capture',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size + 4, color }}>➕</Text>
            ),
          }}
        />
        <Tab.Screen 
          name="Lists" 
          component={ListsScreen}
          options={{
            tabBarLabel: 'Lists',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>📋</Text>
            ),
          }}
        />
        <Tab.Screen 
          name="Map" 
          component={MapScreen}
          options={{
            tabBarLabel: 'Map',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>🗺️</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}