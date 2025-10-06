import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { InputProps } from '../types';

const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  multiline = false,
  numberOfLines = 1,
  secureTextEntry = false,
  keyboardType = 'default',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  const inputStyle = [
    styles.input,
    multiline && styles.multilineInput,
    isFocused && styles.focusedInput,
    error && styles.errorInput,
  ];

  const containerStyle = [
    styles.container,
    error && styles.errorContainer,
  ];

  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={inputStyle}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8E8E93"
          multiline={multiline}
          numberOfLines={numberOfLines}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setIsSecure(!isSecure)}
          >
            <Icon
              name={isSecure ? 'visibility-off' : 'visibility'}
              size={20}
              color="#8E8E93"
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  
  inputContainer: {
    position: 'relative',
  },
  
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    minHeight: 44,
  },
  
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  focusedInput: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  
  errorInput: {
    borderColor: '#FF3B30',
  },
  
  errorContainer: {
    marginBottom: 4,
  },
  
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
});

export default Input;