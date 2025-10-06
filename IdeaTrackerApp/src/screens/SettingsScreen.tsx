import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useApp } from '../context/AppContext';
import Card from '../components/Card';

const SettingsScreen: React.FC = () => {
  const { state, dispatch } = useApp();

  const renderSettingItem = (title: string, icon: string, onPress: () => void, rightElement?: React.ReactNode) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Icon name={icon} size={24} color="#007AFF" />
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      {rightElement || <Icon name="chevron-right" size={24} color="#8E8E93" />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        {renderSettingItem('Theme', 'palette', () => {})}
        {renderSettingItem('Notifications', 'notifications', () => {}, 
          <Switch value={true} onValueChange={() => {}} />)}
        {renderSettingItem('AI Processing', 'psychology', () => {}, 
          <Switch value={state.user?.preferences.aiEnabled || false} onValueChange={() => {}} />)}
        {renderSettingItem('Maps', 'map', () => {}, 
          <Switch value={state.user?.preferences.mapsEnabled || false} onValueChange={() => {}} />)}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        {renderSettingItem('Export Data', 'download', () => {})}
        {renderSettingItem('Import Data', 'upload', () => {})}
        {renderSettingItem('Clear Cache', 'delete', () => {})}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        {renderSettingItem('Version', 'info', () => {}, <Text style={styles.versionText}>1.0.0</Text>)}
        {renderSettingItem('Privacy Policy', 'privacy-tip', () => {})}
        {renderSettingItem('Terms of Service', 'description', () => {})}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { padding: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  title: { fontSize: 28, fontWeight: '700', color: '#000000' },
  section: { margin: 16, padding: 0 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: 16, paddingHorizontal: 16, paddingTop: 16 },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingTitle: { fontSize: 16, color: '#000000', marginLeft: 12 },
  versionText: { fontSize: 16, color: '#8E8E93' },
});

export default SettingsScreen;