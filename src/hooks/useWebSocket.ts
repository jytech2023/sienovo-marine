import { useCallback, useEffect, useRef, useState } from 'react';
import type { BoatState, ControlCommand } from '../types/protocol';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [boatOnline, setBoatOnline] = useState(false);
  const [boatState, setBoatState] = useState<BoatState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraFrame, setCameraFrame] = useState<string | null>(null);
  const configRef = useRef({ serverUrl: '', boatId: '', controllerId: '' });
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const connectWs = useCallback((url: string, boatId: string, controllerId: string) => {
    // Close existing connection
    clearTimeout(reconnectTimer.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    configRef.current = { serverUrl: url, boatId, controllerId };

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        ws.send(JSON.stringify({
          type: 'connect-boat',
          boatId: configRef.current.boatId,
          controllerId: configRef.current.controllerId,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(typeof event.data === 'string' ? event.data : '');
          switch (msg.type) {
            case 'boat-found':
              setBoatOnline(true);
              setBoatState(msg.state);
              break;
            case 'state-update':
              setBoatState(msg.state);
              break;
            case 'boat-offline':
              setBoatOnline(false);
              setCameraFrame(null);
              break;
            case 'camera-frame':
              setCameraFrame(msg.frame);
              break;
            case 'bait-released':
              setBoatState(prev => prev ? { ...prev, baitLevel: msg.remaining } : null);
              break;
            case 'returning-home':
              break;
            case 'arrived-home':
              break;
            case 'error':
              setError(msg.message);
              break;
          }
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        setBoatOnline(false);
        // Auto reconnect with saved config
        const cfg = configRef.current;
        if (cfg.serverUrl) {
          reconnectTimer.current = setTimeout(() => {
            connectWs(cfg.serverUrl, cfg.boatId, cfg.controllerId);
          }, 3000);
        }
      };

      ws.onerror = () => {
        setError('Connection failed');
      };
    } catch (e) {
      setError('Failed to connect');
    }
  }, []);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimer.current);
    configRef.current = { serverUrl: '', boatId: '', controllerId: '' };
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    setBoatOnline(false);
  }, []);

  const sendControl = useCallback((command: ControlCommand) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'control', command }));
    }
  }, []);

  const releaseBait = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'release-bait' }));
    }
  }, []);

  const returnHome = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'return-home' }));
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  return {
    connected,
    boatOnline,
    boatState,
    cameraFrame,
    error,
    connect: connectWs,
    disconnect,
    sendControl,
    releaseBait,
    returnHome,
  };
}
