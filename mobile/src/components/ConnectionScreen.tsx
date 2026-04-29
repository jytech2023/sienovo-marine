import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

type ConnectionMode = 'direct' | 'relay';

interface BoatInfo {
  id: string;
  lat: number;
  lng: number;
  battery: number;
  signal: number;
  isOnline: boolean;
}

interface ConnectionScreenProps {
  onConnect: (serverUrl: string, boatId: string) => void;
}

export function ConnectionScreen({ onConnect }: ConnectionScreenProps) {
  const [mode, setMode] = useState<ConnectionMode>('direct');
  const [directUrl, setDirectUrl] = useState('ws://192.168.4.1:5000');
  const [directBoatId, setDirectBoatId] = useState('BOAT-A3F8');
  const [relayUrl, setRelayUrl] = useState('ws://localhost:5000');
  const [boats, setBoats] = useState<BoatInfo[]>([]);
  const [loadingBoats, setLoadingBoats] = useState(false);
  const [relayError, setRelayError] = useState<string | null>(null);

  // Fetch boat list from relay server
  const fetchBoats = useCallback(() => {
    setLoadingBoats(true);
    setRelayError(null);

    const httpUrl = relayUrl.replace('ws://', 'http://').replace('wss://', 'https://');

    fetch(`${httpUrl}/api/boats`)
      .then(res => res.json())
      .then(data => {
        setBoats(data.boats || []);
        setLoadingBoats(false);
      })
      .catch(err => {
        setRelayError('无法连接中继站');
        setLoadingBoats(false);
      });
  }, [relayUrl]);

  // Auto-refresh boat list in relay mode
  useEffect(() => {
    if (mode === 'relay') {
      fetchBoats();
      const interval = setInterval(fetchBoats, 5000);
      return () => clearInterval(interval);
    }
  }, [mode, fetchBoats]);

  const handleDirectConnect = () => {
    onConnect(directUrl, directBoatId);
  };

  const handleRelayConnect = (boatId: string) => {
    onConnect(relayUrl, boatId);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <Text style={styles.logo}>🚢</Text>
        <Text style={styles.title}>Sienovo Marine</Text>
        <Text style={styles.subtitle}>Smart Boat Controller</Text>

        {/* Mode Tabs */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'direct' && styles.modeTabActive]}
            onPress={() => setMode('direct')}
          >
            <Text style={styles.modeIcon}>📶</Text>
            <Text style={[styles.modeTabText, mode === 'direct' && styles.modeTabTextActive]}>
              直连模式
            </Text>
            <Text style={styles.modeDesc}>WiFi / 局域网</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'relay' && styles.modeTabActive]}
            onPress={() => setMode('relay')}
          >
            <Text style={styles.modeIcon}>🌐</Text>
            <Text style={[styles.modeTabText, mode === 'relay' && styles.modeTabTextActive]}>
              中继模式
            </Text>
            <Text style={styles.modeDesc}>4G / 5G 远程</Text>
          </TouchableOpacity>
        </View>

        {/* Direct Mode */}
        {mode === 'direct' && (
          <View style={styles.form}>
            <View style={styles.modeInfo}>
              <Text style={styles.modeInfoText}>
                连接船只 WiFi 热点后，直接输入船只地址
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>船只地址</Text>
              <TextInput
                style={styles.input}
                value={directUrl}
                onChangeText={setDirectUrl}
                placeholder="ws://192.168.4.1:5000"
                placeholderTextColor="#3a5a7a"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>船只 ID</Text>
              <TextInput
                style={styles.input}
                value={directBoatId}
                onChangeText={setDirectBoatId}
                placeholder="BOAT-XXXX"
                placeholderTextColor="#3a5a7a"
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={styles.connectButton}
              onPress={handleDirectConnect}
              activeOpacity={0.8}
            >
              <Text style={styles.connectButtonText}>直接连接</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.scanButton} activeOpacity={0.8}>
              <Text style={styles.scanButtonText}>📷 扫码配对</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Relay Mode */}
        {mode === 'relay' && (
          <View style={styles.form}>
            <View style={styles.modeInfo}>
              <Text style={styles.modeInfoText}>
                通过中继站连接远程船只，需要 4G/5G 网络
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>中继站地址</Text>
              <View style={styles.relayInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={relayUrl}
                  onChangeText={setRelayUrl}
                  placeholder="ws://relay.example.com"
                  placeholderTextColor="#3a5a7a"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.refreshBtn} onPress={fetchBoats}>
                  <Text style={styles.refreshBtnText}>刷新</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Boat List */}
            <View style={styles.boatListSection}>
              <Text style={styles.label}>在线船只</Text>

              {loadingBoats && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#4ecdc4" />
                  <Text style={styles.loadingText}>搜索船只...</Text>
                </View>
              )}

              {relayError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{relayError}</Text>
                </View>
              )}

              {!loadingBoats && !relayError && boats.length === 0 && (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>暂无在线船只</Text>
                </View>
              )}

              {boats.map(boat => (
                <TouchableOpacity
                  key={boat.id}
                  style={styles.boatCard}
                  onPress={() => handleRelayConnect(boat.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.boatCardLeft}>
                    <View style={styles.boatCardHeader}>
                      <View style={[styles.onlineDot, { backgroundColor: boat.isOnline ? '#4ecdc4' : '#ff6b6b' }]} />
                      <Text style={styles.boatCardId}>{boat.id}</Text>
                    </View>
                    <Text style={styles.boatCardInfo}>
                      电量 {boat.battery.toFixed(0)}% · 信号 {boat.signal}%
                    </Text>
                    <Text style={styles.boatCardGps}>
                      {boat.lat.toFixed(4)}, {boat.lng.toFixed(4)}
                    </Text>
                  </View>
                  <View style={styles.boatCardRight}>
                    <Text style={styles.boatCardConnect}>连接</Text>
                    <Text style={styles.boatCardArrow}>→</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Manual input fallback */}
            <View style={styles.manualSection}>
              <Text style={styles.manualLabel}>或手动输入船只 ID</Text>
              <View style={styles.relayInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={directBoatId}
                  onChangeText={setDirectBoatId}
                  placeholder="BOAT-XXXX"
                  placeholderTextColor="#3a5a7a"
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.connectSmallBtn}
                  onPress={() => handleRelayConnect(directBoatId)}
                >
                  <Text style={styles.connectSmallBtnText}>连接</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logo: { fontSize: 50, textAlign: 'center', marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '700', color: '#e0e8f0', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#5a7a9a', textAlign: 'center', marginBottom: 24 },

  // Mode Tabs
  modeTabs: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  modeTab: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1a3a5c',
    backgroundColor: '#0d1b2a',
    alignItems: 'center',
  },
  modeTabActive: {
    borderColor: '#4ecdc4',
    backgroundColor: 'rgba(78, 205, 196, 0.08)',
  },
  modeIcon: { fontSize: 22, marginBottom: 4 },
  modeTabText: { fontSize: 14, fontWeight: '600', color: '#5a7a9a' },
  modeTabTextActive: { color: '#4ecdc4' },
  modeDesc: { fontSize: 10, color: '#3a5a7a', marginTop: 2 },

  // Form
  form: { gap: 12 },
  modeInfo: {
    backgroundColor: 'rgba(26, 58, 92, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 4,
  },
  modeInfoText: { fontSize: 12, color: '#5a7a9a', textAlign: 'center' },

  inputGroup: { marginBottom: 4 },
  label: {
    fontSize: 11, color: '#5a7a9a', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  input: {
    backgroundColor: '#1a2a40', borderWidth: 1, borderColor: '#1a3a5c',
    borderRadius: 10, padding: 12, color: '#e0e8f0', fontSize: 15,
    fontFamily: 'monospace',
  },
  relayInputRow: { flexDirection: 'row', gap: 8 },
  refreshBtn: {
    backgroundColor: '#1a3a5c', borderRadius: 10, paddingHorizontal: 16,
    justifyContent: 'center',
  },
  refreshBtnText: { color: '#74b9ff', fontSize: 13, fontWeight: '600' },

  connectButton: {
    backgroundColor: '#4ecdc4', borderRadius: 10, padding: 15,
    alignItems: 'center', marginTop: 4,
  },
  connectButtonText: { color: '#0a1628', fontSize: 16, fontWeight: '700' },
  scanButton: {
    backgroundColor: 'rgba(26, 58, 92, 0.5)', borderWidth: 1,
    borderColor: '#1a3a5c', borderRadius: 10, padding: 13, alignItems: 'center',
  },
  scanButtonText: { color: '#74b9ff', fontSize: 14, fontWeight: '600' },

  // Boat List
  boatListSection: { marginTop: 4 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  loadingText: { color: '#5a7a9a', fontSize: 13 },
  errorBox: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)', borderRadius: 8,
    padding: 12, borderWidth: 1, borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorText: { color: '#ff6b6b', fontSize: 13, textAlign: 'center' },
  emptyBox: {
    backgroundColor: 'rgba(26, 42, 64, 0.5)', borderRadius: 8,
    padding: 20, alignItems: 'center',
  },
  emptyText: { color: '#3a5a7a', fontSize: 13 },

  boatCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1a2a40', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#1a3a5c', marginTop: 8,
  },
  boatCardLeft: { flex: 1 },
  boatCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  boatCardId: { fontSize: 16, fontWeight: '700', color: '#e0e8f0', fontFamily: 'monospace' },
  boatCardInfo: { fontSize: 12, color: '#5a7a9a' },
  boatCardGps: { fontSize: 11, color: '#3a5a7a', fontFamily: 'monospace', marginTop: 2 },
  boatCardRight: { alignItems: 'center', paddingLeft: 12 },
  boatCardConnect: { fontSize: 12, color: '#4ecdc4', fontWeight: '600' },
  boatCardArrow: { fontSize: 18, color: '#4ecdc4' },

  // Manual input
  manualSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1a3a5c' },
  manualLabel: { fontSize: 11, color: '#3a5a7a', marginBottom: 8 },
  connectSmallBtn: {
    backgroundColor: '#4ecdc4', borderRadius: 10, paddingHorizontal: 20,
    justifyContent: 'center',
  },
  connectSmallBtnText: { color: '#0a1628', fontSize: 14, fontWeight: '700' },
});
