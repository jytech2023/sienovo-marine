'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectionStatus, IncomingMessage, LogLevel } from './types';

type Options = {
  log: (level: LogLevel, message: string) => void;
  onMessage: (msg: IncomingMessage) => void;
  onConnected: (boatId: string) => { lat: number; lng: number };
  onDisconnected: () => void;
};

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  (typeof window !== 'undefined'
    ? `ws://${window.location.hostname}:3000`
    : 'ws://localhost:3000');

export function useBoatSocket({ log, onMessage, onConnected, onDisconnected }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('offline');
  const [isConnected, setIsConnected] = useState(false);

  const handlersRef = useRef({ log, onMessage, onConnected, onDisconnected });
  useEffect(() => {
    handlersRef.current = { log, onMessage, onConnected, onDisconnected };
  }, [log, onMessage, onConnected, onDisconnected]);

  const send = useCallback((msg: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback((boatId: string) => {
    const h = handlersRef.current;
    h.log('info', `Connecting as ${boatId}...`);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      const { lat, lng } = h.onConnected(boatId);
      ws.send(
        JSON.stringify({ type: 'register-boat', id: boatId, lat, lng }),
      );
      setIsConnected(true);
      setStatus('online');
      h.log('success', `Boat ${boatId} registered successfully`);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as IncomingMessage;
        if (msg.type === 'controller-connected') {
          setStatus('connected');
          h.log('success', `Controller ${msg.controllerId} connected`);
        }
        h.onMessage(msg);
      } catch {
        // ignore malformed
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setStatus('offline');
      h.onDisconnected();
      h.log('warn', 'Disconnected from server');
    };

    ws.onerror = () => {
      h.log('error', 'WebSocket error - is the server running?');
    };
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return { status, isConnected, connect, disconnect, send };
}
