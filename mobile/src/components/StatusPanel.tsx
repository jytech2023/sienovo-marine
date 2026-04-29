import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { BoatState } from '../types/protocol';

interface StatusPanelProps {
  boatState: BoatState | null;
  connected: boolean;
  boatOnline: boolean;
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

export function StatusPanel({ boatState, connected, boatOnline }: StatusPanelProps) {
  const statusText = !connected ? '未连接' : !boatOnline ? '等待船只...' : '已连接';
  const statusColor = !connected ? '#ff6b6b' : !boatOnline ? '#ffa94d' : '#4ecdc4';

  const battery = boatState?.battery ?? 0;
  const batteryColor = battery > 50 ? '#4ecdc4' : battery > 20 ? '#ffa94d' : '#ff6b6b';

  return (
    <View style={styles.container}>
      {/* Connection Status */}
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        {boatState && (
          <Text style={styles.boatId}>{boatState.id}</Text>
        )}
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatItem
          label="速度"
          value={boatState ? `${(boatState.speed * 3.6).toFixed(1)} km/h` : '--'}
          color="#74b9ff"
        />
        <StatItem
          label="航向"
          value={boatState ? `${boatState.heading.toFixed(0)}°` : '--'}
          color="#4ecdc4"
        />
        <StatItem
          label="距离"
          value={boatState ? `${boatState.distance.toFixed(0)}m` : '--'}
          color="#ffa94d"
        />
        <StatItem
          label="电量"
          value={boatState ? `${boatState.battery.toFixed(0)}%` : '--'}
          color={batteryColor}
        />
      </View>

      {/* Bait Level */}
      <View style={styles.baitRow}>
        <Text style={styles.baitLabel}>饵料</Text>
        <View style={styles.baitBarBg}>
          <View
            style={[
              styles.baitBarFill,
              { width: `${boatState?.baitLevel ?? 0}%` },
            ]}
          />
        </View>
        <Text style={styles.baitPercent}>{boatState?.baitLevel.toFixed(0) ?? 0}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(13, 27, 42, 0.9)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 92, 0.6)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  boatId: {
    marginLeft: 'auto',
    fontSize: 11,
    color: '#5a7a9a',
    fontFamily: 'monospace',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  statItem: {
    backgroundColor: 'rgba(26, 42, 64, 0.6)',
    borderRadius: 8,
    padding: 8,
    width: '48%',
    flexGrow: 1,
  },
  statLabel: {
    fontSize: 10,
    color: '#5a7a9a',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  baitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  baitLabel: {
    fontSize: 11,
    color: '#5a7a9a',
    width: 30,
  },
  baitBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(26, 42, 64, 0.8)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  baitBarFill: {
    height: '100%',
    backgroundColor: '#4ecdc4',
    borderRadius: 3,
  },
  baitPercent: {
    fontSize: 11,
    color: '#5a7a9a',
    width: 30,
    textAlign: 'right',
    fontFamily: 'monospace',
  },
});
