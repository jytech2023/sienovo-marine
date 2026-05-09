'use client';

import { useEffect, useRef, useState } from 'react';
import type { MqttClient } from 'mqtt';
import type { BoatState, ComponentMap } from './types';
import { connectIotMqtt } from './iotMqtt';

export type ViewerStatus = 'connecting' | 'waiting' | 'live' | 'offline' | 'error';

const offlineComponents = (): ComponentMap => ({
  motor: 'offline',
  battery: 'offline',
  gps: 'offline',
  camera: 'offline',
  light: 'offline',
  baitDispenser: 'offline',
  rudder: 'offline',
  link: 'offline',
});

const ensureBoatState = (state: Partial<BoatState> | undefined): BoatState => ({
  id: state?.id ?? '',
  lat: state?.lat ?? 0,
  lng: state?.lng ?? 0,
  heading: state?.heading ?? 0,
  speed: state?.speed ?? 0,
  battery: state?.battery ?? 0,
  signal: state?.signal ?? 0,
  baitLevel: state?.baitLevel ?? 0,
  distance: state?.distance ?? 0,
  depth: state?.depth ?? 0,
  waterTemp: state?.waterTemp ?? 0,
  ir: state?.ir ?? false,
  light: state?.light ?? false,
  isOnline: state?.isOnline ?? false,
  components: state?.components ?? offlineComponents(),
});

type CameraFrame = { dataUrl: string; receivedAt: number } | null;

type ViewerHandle = {
  publish: (topic: string, payload: unknown) => void;
  status: ViewerStatus;
  state: BoatState | null;
  cameraFrame: CameraFrame;
  errorMessage: string | null;
};

const STATE_STALE_MS = 5000;

export function useBoatViewer(boatId: string): ViewerHandle {
  const [status, setStatus] = useState<ViewerStatus>('connecting');
  const [state, setState] = useState<BoatState | null>(null);
  const [cameraFrame, setCameraFrame] = useState<CameraFrame>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const clientRef = useRef<MqttClient | null>(null);
  const lastStateAtRef = useRef<number>(0);

  const publish = (topic: string, payload: unknown) => {
    const c = clientRef.current;
    if (!c || !c.connected) return;
    c.publish(topic, JSON.stringify(payload), { qos: 0 });
  };

  useEffect(() => {
    if (!boatId) return;
    let cancelled = false;
    // AWS IoT iot:Subscribe requires literal topicfilter match — must subscribe
    // with the wildcard pattern that the IAM policy allows, then filter by boatId.
    const filters = [
      'sienovo/boats/+/state',
      'sienovo/boats/+/event',
      'sienovo/boats/+/camera',
    ];

    setStatus('connecting');

    (async () => {
      try {
        const client = await connectIotMqtt({
          clientId: `viewer-${Math.random().toString(36).slice(2, 10)}`,
        });
        if (cancelled) {
          client.end();
          return;
        }
        clientRef.current = client;

        client.on('connect', () => {
          setStatus('waiting');
          client.subscribe(filters, { qos: 0 }, (err) => {
            if (err) setErrorMessage(`subscribe failed: ${err.message}`);
          });
        });

        client.on('message', (topic, payload) => {
          // topic format: sienovo/boats/{boatId}/{kind}
          const parts = topic.split('/');
          if (parts.length !== 4 || parts[2] !== boatId) return;
          const kind = parts[3];
          if (kind === 'state') {
            try {
              const incoming = ensureBoatState(JSON.parse(payload.toString()));
              setState(incoming);
              lastStateAtRef.current = Date.now();
              setStatus('live');
            } catch {
              // ignore malformed
            }
          } else if (kind === 'camera') {
            const text = payload.toString();
            try {
              const obj = JSON.parse(text);
              if (typeof obj?.frame === 'string') {
                setCameraFrame({ dataUrl: obj.frame, receivedAt: Date.now() });
              }
            } catch {
              setCameraFrame({ dataUrl: text, receivedAt: Date.now() });
            }
          }
        });

        client.on('error', (err) => {
          setErrorMessage(err.message);
          setStatus('error');
        });

        client.on('close', () => {
          if (!cancelled) setStatus('error');
        });
      } catch (e) {
        if (!cancelled) {
          setErrorMessage(e instanceof Error ? e.message : 'connect failed');
          setStatus('error');
        }
      }
    })();

    const stalenessTimer = setInterval(() => {
      if (lastStateAtRef.current && Date.now() - lastStateAtRef.current > STATE_STALE_MS) {
        setStatus((s) => (s === 'live' ? 'offline' : s));
        setState((prev) =>
          prev && prev.isOnline
            ? { ...prev, isOnline: false, components: offlineComponents() }
            : prev,
        );
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(stalenessTimer);
      clientRef.current?.end();
      clientRef.current = null;
    };
  }, [boatId]);

  return { publish, status, state, cameraFrame, errorMessage };
}

export const controlTopic = (boatId: string) => `sienovo/boats/${boatId}/control`;
