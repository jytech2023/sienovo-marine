import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, PanResponder, Animated } from 'react-native';

interface JoystickProps {
  size?: number;
  onMove: (x: number, y: number) => void; // x: -1..1 (left-right), y: -1..1 (down-up)
  onRelease: () => void;
}

export function Joystick({ size = 150, onMove, onRelease }: JoystickProps) {
  const knobSize = size * 0.4;
  const maxDist = (size - knobSize) / 2;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const currentPos = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gestureState) => {
        let dx = gestureState.dx;
        let dy = gestureState.dy;

        // Clamp to circle
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDist) {
          dx = (dx / dist) * maxDist;
          dy = (dy / dist) * maxDist;
        }

        pan.setValue({ x: dx, y: dy });
        currentPos.current = { x: dx / maxDist, y: -dy / maxDist };
        onMove(currentPos.current.x, currentPos.current.y);
      },
      onPanResponderRelease: () => {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          friction: 5,
        }).start();
        currentPos.current = { x: 0, y: 0 };
        onRelease();
      },
    })
  ).current;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      {/* Cross lines */}
      <View style={[styles.crossH, { width: size * 0.6, top: size / 2 - 0.5, left: size * 0.2 }]} />
      <View style={[styles.crossV, { height: size * 0.6, left: size / 2 - 0.5, top: size * 0.2 }]} />

      {/* Knob */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.knob,
          {
            width: knobSize,
            height: knobSize,
            borderRadius: knobSize / 2,
            transform: [
              { translateX: Animated.subtract(pan.x, new Animated.Value(0)) },
              { translateY: Animated.subtract(pan.y, new Animated.Value(0)) },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(26, 42, 64, 0.8)',
    borderWidth: 2,
    borderColor: 'rgba(78, 205, 196, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crossH: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
  },
  crossV: {
    position: 'absolute',
    width: 1,
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
  },
  knob: {
    backgroundColor: 'rgba(78, 205, 196, 0.6)',
    borderWidth: 2,
    borderColor: '#4ecdc4',
    shadowColor: '#4ecdc4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
});
