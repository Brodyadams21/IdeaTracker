import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View } from 'react-native';
import QuickCapture from '../screens/QuickCapture';
import HomeScreen from '../screens/HomeScreen';
import IdeaDetail from '../screens/IdeaDetail';
import MapScreen from '../screens/MapScreen';


const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Placeholder screens for now
function ListsScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24 }}>📋 Lists</Text>
      <Text style={{ marginTop: 10 }}>Coming soon!</Text>
    </View>
  );
}

// Home Stack Navigator
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="IdeaDetail" component={IdeaDetail} />
    </Stack.Navigator>
  );
}

// Main Tab Navigator
function TabNavigator() {
  return (
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
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🏠</Text>
          ),
          lazy: false, // Keep the component mounted
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
          lazy: false, // Keep the component mounted
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
          lazy: false, // Keep the component mounted
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
          lazy: false, // Keep the component mounted
        }}
      />

    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );
}