import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Card from '../components/Card';

const AboutScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="lightbulb" size={64} color="#007AFF" />
        <Text style={styles.title}>IdeaTracker</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>
          IdeaTracker is a powerful AI-powered idea management app that helps you capture, 
          organize, and track your ideas using intelligent categorization.
        </Text>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Icon name="psychology" size={20} color="#007AFF" />
            <Text style={styles.featureText}>AI-Powered Categorization</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="place" size={20} color="#007AFF" />
            <Text style={styles.featureText}>Location-Based Ideas</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="repeat" size={20} color="#007AFF" />
            <Text style={styles.featureText}>Habit Tracking</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="map" size={20} color="#007AFF" />
            <Text style={styles.featureText}>Interactive Maps</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.description}>
          For support, feedback, or questions, please contact us at support@ideatracker.com
        </Text>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { alignItems: 'center', padding: 40, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  title: { fontSize: 32, fontWeight: '700', color: '#000000', marginTop: 16, marginBottom: 8 },
  version: { fontSize: 16, color: '#8E8E93' },
  section: { margin: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: 12 },
  description: { fontSize: 16, color: '#8E8E93', lineHeight: 24 },
  featureList: { gap: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'center' },
  featureText: { fontSize: 16, color: '#000000', marginLeft: 12 },
});

export default AboutScreen;