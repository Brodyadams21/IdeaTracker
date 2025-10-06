import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useApp } from '../context/AppContext';
import Card from '../components/Card';
import Button from '../components/Button';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { state, dispatch } = useApp();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            // In a real app, you would sign out from Firebase here
            dispatch({ type: 'SET_USER', payload: null });
            dispatch({ type: 'RESET_STATE' });
          },
        },
      ]
    );
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleAbout = () => {
    navigation.navigate('About');
  };

  const renderStatItem = (label: string, value: string | number, icon: string) => (
    <View style={styles.statItem}>
      <Icon name={icon} size={24} color="#007AFF" />
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  const renderMenuItem = (
    title: string,
    icon: string,
    onPress: () => void,
    showArrow: boolean = true
  ) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Icon name={icon} size={24} color="#007AFF" />
        <Text style={styles.menuItemTitle}>{title}</Text>
      </View>
      {showArrow && (
        <Icon name="chevron-right" size={24} color="#8E8E93" />
      )}
    </TouchableOpacity>
  );

  const totalIdeas = state.ideas.length;
  const completedIdeas = state.ideas.filter(idea => idea.status === 'completed').length;
  const locationIdeas = state.ideas.filter(idea => idea.location).length;
  const habitIdeas = state.ideas.filter(idea => idea.category === 'habit').length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.profileInfo}>
          <View style={styles.avatar}>
            <Icon name="person" size={40} color="#FFFFFF" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {state.user?.displayName || 'Anonymous User'}
            </Text>
            <Text style={styles.userEmail}>
              {state.user?.email || 'No email provided'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          {renderStatItem('Total Ideas', totalIdeas, 'lightbulb')}
          {renderStatItem('Completed', completedIdeas, 'check-circle')}
          {renderStatItem('Locations', locationIdeas, 'place')}
          {renderStatItem('Habits', habitIdeas, 'repeat')}
        </View>
      </View>

      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <Card style={styles.menuCard}>
          {renderMenuItem('Settings', 'settings', handleSettings)}
          {renderMenuItem('About', 'info', handleAbout)}
          {renderMenuItem('Help & Support', 'help', () => {})}
          {renderMenuItem('Privacy Policy', 'privacy-tip', () => {})}
          {renderMenuItem('Terms of Service', 'description', () => {})}
        </Card>
      </View>

      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Card style={styles.menuCard}>
          {renderMenuItem('Export Data', 'download', () => {})}
          {renderMenuItem('Import Data', 'upload', () => {})}
          {renderMenuItem('Clear All Data', 'delete-forever', () => {}, false)}
        </Card>
      </View>

      <View style={styles.signOutContainer}>
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          icon="logout"
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>IdeaTracker v1.0.0</Text>
        <Text style={styles.footerText}>Made with ❤️ for productivity</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  
  userInfo: {
    flex: 1,
  },
  
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  
  userEmail: {
    fontSize: 16,
    color: '#8E8E93',
  },
  
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    minWidth: '45%',
  },
  
  statContent: {
    marginLeft: 12,
  },
  
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  
  menuContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  
  menuCard: {
    padding: 0,
  },
  
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  menuItemTitle: {
    fontSize: 16,
    color: '#000000',
    marginLeft: 12,
  },
  
  signOutContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  
  footerText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
});

export default ProfileScreen;