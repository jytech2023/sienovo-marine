import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ControlButtonsProps {
  onReleaseBait: () => void;
  onReturnHome: () => void;
  boatOnline: boolean;
  baitLevel: number;
}

export function ControlButtons({ onReleaseBait, onReturnHome, boatOnline, baitLevel }: ControlButtonsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.baitButton, !boatOnline && styles.disabled]}
        onPress={onReleaseBait}
        disabled={!boatOnline}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonIcon}>🎣</Text>
        <Text style={styles.buttonText}>投饵</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.homeButton, !boatOnline && styles.disabled]}
        onPress={onReturnHome}
        disabled={!boatOnline}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonIcon}>🏠</Text>
        <Text style={styles.buttonText}>返航</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.stopButton, !boatOnline && styles.disabled]}
        onPress={() => {}}
        disabled={!boatOnline}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonIcon}>⛔</Text>
        <Text style={styles.buttonText}>急停</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  baitButton: {
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    borderColor: 'rgba(78, 205, 196, 0.4)',
  },
  homeButton: {
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    borderColor: 'rgba(255, 169, 77, 0.4)',
  },
  stopButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  disabled: {
    opacity: 0.3,
  },
  buttonIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e0e8f0',
  },
});
