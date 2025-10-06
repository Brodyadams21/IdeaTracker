import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import CaptureScreen from '../screens/CaptureScreen';
import ListsScreen from '../screens/ListsScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import IdeaDetailScreen from '../screens/IdeaDetailScreen';
import EditIdeaScreen from '../screens/EditIdeaScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Import types
import { TabParamList, StackParamList } from '../types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<StackParamList>();

// Home Stack Navigator
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen 
        name="IdeaDetail" 
        component={IdeaDetailScreen}
        options={{
          headerShown: true,
          title: 'Idea Details',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="EditIdea" 
        component={EditIdeaScreen}
        options={{
          headerShown: true,
          title: 'Edit Idea',
          headerBackTitle: 'Cancel',
        }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          headerShown: true,
          title: 'Settings',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
}

// Main Tab Navigator
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Capture':
              iconName = 'add-circle';
              break;
            case 'Lists':
              iconName = 'list';
              break;
            case 'Map':
              iconName = 'map';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          paddingTop: 5,
          height: Platform.OS === 'ios' ? 85 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
        lazy: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="Capture" 
        component={CaptureScreen}
        options={{
          tabBarLabel: 'Capture',
        }}
      />
      <Tab.Screen 
        name="Lists" 
        component={ListsScreen}
        options={{
          tabBarLabel: 'Lists',
        }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{
          tabBarLabel: 'Map',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );
}