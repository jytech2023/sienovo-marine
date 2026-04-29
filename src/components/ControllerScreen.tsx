import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, Image, TouchableOpacity } from 'react-native';
import { StatusPanel } from './StatusPanel';
import { Joystick } from './Joystick';
import { ControlButtons } from './ControlButtons';
import type { BoatState, ControlCommand } from '../types/protocol';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ControllerScreenProps {
  boatState: BoatState | null;
  connected: boolean;
  boatOnline: boolean;
  cameraFrame: string | null;
  onControl: (command: ControlCommand) => void;
  onReleaseBait: () => void;
  onReturnHome: () => void;
  onSwitchDevice: () => void;
  onDisconnect: () => void;
}

export function ControllerScreen({
  boatState,
  connected,
  boatOnline,
  cameraFrame,
  onControl,
  onReleaseBait,
  onReturnHome,
  onSwitchDevice,
  onDisconnect,
}: ControllerScreenProps) {
  const controlInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCommand = useRef<ControlCommand>({ throttle: 0, rudder: 0 });

  const handleJoystickMove = useCallback((x: number, y: number) => {
    lastCommand.current = { throttle: y, rudder: x };

    // Send at 10Hz
    if (!controlInterval.current) {
      controlInterval.current = setInterval(() => {
        onControl(lastCommand.current);
      }, 100);
    }
  }, [onControl]);

  const handleJoystickRelease = useCallback(() => {
    if (controlInterval.current) {
      clearInterval(controlInterval.current);
      controlInterval.current = null;
    }
    lastCommand.current = { throttle: 0, rudder: 0 };
    onControl({ throttle: 0, rudder: 0 });
  }, [onControl]);

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerDot, { backgroundColor: boatOnline ? '#4ecdc4' : connected ? '#ffa94d' : '#ff6b6b' }]} />
          <Text style={styles.headerBoatId}>{boatState?.id ?? '---'}</Text>
          <Text style={styles.headerStatus}>
            {!connected ? '未连接' : !boatOnline ? '等待船只...' : `${boatState?.distance.toFixed(0)}m`}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.switchBtn} onPress={onSwitchDevice}>
            <Text style={styles.switchBtnText}>切换设备</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.disconnectBtn} onPress={onDisconnect}>
            <Text style={styles.disconnectBtnText}>断开</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Camera / Video Area */}
      <View style={styles.videoArea}>
        <View style={styles.videoPlaceholder}>
          {boatOnline ? (
            <>
              {/* Camera feed */}
              {cameraFrame ? (
                <Image
                  source={{ uri: cameraFrame }}
                  style={styles.cameraImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.waterView}>
                  <Text style={styles.waterEmoji}>📷</Text>
                  <Text style={styles.waterText}>等待摄像头...</Text>
                </View>
              )}
              {/* Overlays */}
              <View style={styles.cameraOverlay}>
                <View style={styles.recDot} />
                <Text style={styles.recText}>LIVE</Text>
              </View>
              <View style={styles.compassOverlay}>
                <Text style={styles.compassText}>
                  {getCompassDirection(boatState?.heading ?? 0)} {boatState?.heading.toFixed(0)}°
                </Text>
              </View>
              <View style={styles.distanceOverlay}>
                <Text style={styles.distanceText}>
                  {boatState?.distance.toFixed(0)}m
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.offlineView}>
              <Text style={styles.offlineEmoji}>📡</Text>
              <Text style={styles.offlineText}>
                {connected ? '等待船只上线...' : '未连接到服务器'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Status Panel */}
      <View style={styles.statusArea}>
        <StatusPanel
          boatState={boatState}
          connected={connected}
          boatOnline={boatOnline}
        />
      </View>

      {/* Control Area */}
      <View style={styles.controlArea}>
        {/* Buttons */}
        <ControlButtons
          onReleaseBait={onReleaseBait}
          onReturnHome={onReturnHome}
          boatOnline={boatOnline}
          baitLevel={boatState?.baitLevel ?? 0}
        />

        {/* Joystick */}
        <View style={styles.joystickRow}>
          <View style={styles.joystickContainer}>
            <Joystick
              size={SCREEN_WIDTH > 400 ? 160 : 130}
              onMove={handleJoystickMove}
              onRelease={handleJoystickRelease}
            />
            <Text style={styles.joystickLabel}>方向 / 油门</Text>
          </View>

          {/* Throttle Info */}
          <View style={styles.throttleInfo}>
            <Text style={styles.throttleLabel}>操控提示</Text>
            <Text style={styles.throttleTip}>↑ 前进</Text>
            <Text style={styles.throttleTip}>↓ 后退</Text>
            <Text style={styles.throttleTip}>← 左转</Text>
            <Text style={styles.throttleTip}>→ 右转</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function getCompassDirection(heading: number): string {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  return dirs[Math.round(heading / 45) % 8];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  // Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0d1b2a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a3a5c',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerBoatId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e0e8f0',
    fontFamily: 'monospace',
  },
  headerStatus: {
    fontSize: 12,
    color: '#5a7a9a',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  switchBtn: {
    backgroundColor: 'rgba(116, 185, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(116, 185, 255, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  switchBtnText: {
    color: '#74b9ff',
    fontSize: 12,
    fontWeight: '600',
  },
  disconnectBtn: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  disconnectBtnText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontWeight: '600',
  },
  videoArea: {
    flex: 3,
    padding: 8,
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: '#0d1b2a',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1a3a5c',
    position: 'relative',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  recDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff6b6b',
  },
  recText: {
    fontSize: 10,
    color: '#ff6b6b',
    fontWeight: '700',
  },
  cameraImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a1e35',
  },
  waterView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a1e35',
  },
  waterEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  waterText: {
    color: '#3a5a7a',
    fontSize: 14,
  },
  waterSubtext: {
    color: '#2a4a6a',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  compassOverlay: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  compassText: {
    fontSize: 12,
    color: '#4ecdc4',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  distanceOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  distanceText: {
    fontSize: 11,
    color: '#ffa94d',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  offlineView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  offlineText: {
    color: '#3a5a7a',
    fontSize: 14,
  },
  statusArea: {
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  controlArea: {
    flex: 4,
    padding: 8,
    gap: 12,
  },
  joystickRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
  },
  joystickContainer: {
    alignItems: 'center',
  },
  joystickLabel: {
    color: '#5a7a9a',
    fontSize: 11,
    marginTop: 8,
  },
  throttleInfo: {
    gap: 6,
  },
  throttleLabel: {
    color: '#5a7a9a',
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  throttleTip: {
    color: '#3a5a7a',
    fontSize: 13,
    fontFamily: 'monospace',
  },
});
