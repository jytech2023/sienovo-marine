import React, { useState, useCallback, useRef } from 'react';
import { SafeAreaView, StyleSheet, StatusBar } from 'react-native';
import { ConnectionScreen } from './src/components/ConnectionScreen';
import { ControllerScreen } from './src/components/ControllerScreen';
import { useWebSocket } from './src/hooks/useWebSocket';

export default function App() {
  const [screen, setScreen] = useState<'connect' | 'control'>('connect');
  const [lastServer, setLastServer] = useState('');
  const ws = useWebSocket();
  const controllerIdRef = useRef(`CTRL-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);

  const handleConnect = useCallback((serverUrl: string, boatId: string) => {
    setLastServer(serverUrl);
    setScreen('control');
    ws.connect(serverUrl, boatId, controllerIdRef.current);
  }, [ws]);

  const handleDisconnect = useCallback(() => {
    ws.disconnect();
    setScreen('connect');
  }, [ws]);

  const handleSwitchDevice = useCallback(() => {
    ws.disconnect();
    setScreen('connect');
  }, [ws]);

  if (screen === 'connect') {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#0a1628" />
        <ConnectionScreen onConnect={handleConnect} />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1628" />
      <ControllerScreen
        boatState={ws.boatState}
        connected={ws.connected}
        boatOnline={ws.boatOnline}
        cameraFrame={ws.cameraFrame}
        onControl={ws.sendControl}
        onReleaseBait={ws.releaseBait}
        onReturnHome={ws.returnHome}
        onSwitchDevice={handleSwitchDevice}
        onDisconnect={handleDisconnect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
});
