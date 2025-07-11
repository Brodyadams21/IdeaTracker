import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';

export default function QuickCapture() {
  const [ideaText, setIdeaText] = useState('');
  const [ideas, setIdeas] = useState<string[]>([]);

  const handleSaveIdea = () => {
    if (ideaText.trim()) {
      // For now, just save to local state
      setIdeas([...ideas, ideaText]);
      Alert.alert('Success!', 'Your idea has been captured!', [
        { text: 'OK', onPress: () => setIdeaText('') }
      ]);
    } else {
      Alert.alert('Oops!', 'Please enter an idea first');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>💡 Quick Capture</Text>
          <Text style={styles.subtitle}>What's your idea?</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your idea here..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            value={ideaText}
            onChangeText={setIdeaText}
            autoFocus
          />
          
          <TouchableOpacity 
            style={[styles.saveButton, !ideaText.trim() && styles.saveButtonDisabled]}
            onPress={handleSaveIdea}
            disabled={!ideaText.trim()}
          >
            <Text style={styles.saveButtonText}>Save Idea</Text>
          </TouchableOpacity>
        </View>

        {ideas.length > 0 && (
          <View style={styles.recentIdeas}>
            <Text style={styles.recentTitle}>Recent Ideas ({ideas.length})</Text>
            {ideas.slice(-3).reverse().map((idea, index) => (
              <View key={index} style={styles.ideaItem}>
                <Text style={styles.ideaText}>{idea}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  inputContainer: {
    padding: 20,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  recentIdeas: {
    padding: 20,
    paddingTop: 0,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  ideaItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  ideaText: {
    fontSize: 14,
    color: '#555',
  },
});