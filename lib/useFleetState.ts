'use client';

import { useEffect, useRef, useState } from 'react';
import type { MqttClient } from 'mqtt';
import type { BoatState } from './types';
import { connectIotMqtt } from './iotMqtt';

const STALE_MS = 5000;
const RECONNECT_AFTER_MS = 50 * 60_000; // 50 min, well before 1h SigV4 URL expiry

export type LiveBoatState = BoatState & { lastSeen: number };

/**
 * Subscribes to all boats' state topics via MQTT-over-WSS and maintains a live
 * map of boatId → state. Used by /boats fleet list to show real-time status.
 */
export function useFleetState() {
  const [stateById, setStateById] = useState<Record<string, LiveBoatState>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const clientRef = useRef<MqttClient | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const client = await connectIotMqtt({
          clientId: `viewer-fleet-${Math.random().toString(36).slice(2, 10)}`,
        });
        if (cancelled) {
          client.end();
          return;
        }
        clientRef.current = client;

        client.on('connect', () => {
          client.subscribe('sienovo/boats/+/state', { qos: 0 }, (err) => {
            if (err) setErrorMessage(`subscribe failed: ${err.message}`);
          });
        });

        client.on('message', (topic, payload) => {
          const parts = topic.split('/');
          if (parts.length !== 4 || parts[3] !== 'state') return;
          const id = parts[2];
          try {
            const incoming = JSON.parse(payload.toString()) as BoatState;
            setStateById((prev) => ({
              ...prev,
              [id]: { ...incoming, id, lastSeen: Date.now() },
            }));
          } catch {
            // ignore malformed
          }
        });

        client.on('error', (err) => setErrorMessage(err.message));
      } catch (e) {
        if (!cancelled) {
          setErrorMessage(e instanceof Error ? e.message : 'connect failed');
        }
      }
    })();

    // Sweep stale entries: mark offline if last state older than STALE_MS.
    const sweep = setInterval(() => {
      setStateById((prev) => {
        const now = Date.now();
        let changed = false;
        const next: Record<string, LiveBoatState> = {};
        for (const [id, s] of Object.entries(prev)) {
          if (s.isOnline && now - s.lastSeen > STALE_MS) {
            next[id] = { ...s, isOnline: false };
            changed = true;
          } else {
            next[id] = s;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(sweep);
      clientRef.current?.end();
      clientRef.current = null;
    };
  }, []);

  return { stateById, errorMessage };
}
