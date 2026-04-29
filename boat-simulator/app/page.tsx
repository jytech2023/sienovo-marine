'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LakeCanvas } from './components/LakeCanvas';
import { LogPanel } from './components/LogPanel';
import { SidePanel } from './components/SidePanel';
import { StatusBadge } from './components/StatusBadge';
import { CAMERA_FRAME_RATE, DEFAULT_BOAT_ID } from '@/lib/constants';
import { useBoatSimulation } from '@/lib/useBoatSimulation';
import { useBoatSocket } from '@/lib/useBoatSocket';
import { useLog } from '@/lib/useLog';
import type { BoatState, IncomingMessage } from '@/lib/types';

export default function Page() {
  const { entries, log } = useLog();
  const [boatId, setBoatId] = useState(DEFAULT_BOAT_ID);
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const initLoggedRef = useRef(false);

  const sendRef = useRef<(msg: unknown) => void>(() => {});

  const broadcast = useCallback((state: BoatState) => {
    sendRef.current({ type: 'state-update', state });
  }, []);

  const sim = useBoatSimulation({ log, onBroadcast: broadcast });

  const handleMessage = useCallback(
    (msg: IncomingMessage) => {
      switch (msg.type) {
        case 'control':
          sim.setCommand(msg.command);
          break;
        case 'release-bait': {
          const result = sim.releaseBait();
          if (result.ok) {
            sendRef.current({ type: 'bait-released', remaining: result.remaining });
          }
          break;
        }
        case 'return-home':
          sim.startReturnHome();
          sendRef.current({ type: 'returning-home' });
          break;
        case 'set-waypoint':
          log('info', `Waypoint set: ${msg.lat.toFixed(4)}, ${msg.lng.toFixed(4)}`);
          break;
      }
    },
    [sim, log],
  );

  const handleConnected = useCallback(
    (id: string) => {
      sim.setBoatId(id);
      sim.setOnline(true);
      const s = sim.stateRef.current;
      return { lat: s.lat, lng: s.lng };
    },
    [sim],
  );

  const handleDisconnected = useCallback(() => {
    sim.setOnline(false);
  }, [sim]);

  const socket = useBoatSocket({
    log,
    onMessage: handleMessage,
    onConnected: handleConnected,
    onDisconnected: handleDisconnected,
  });

  useEffect(() => {
    sendRef.current = socket.send;
  }, [socket.send]);

  // Single physics RAF — canvases run their own draw RAFs
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      sim.step();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sim]);

  // Camera frame broadcast at 5fps
  useEffect(() => {
    if (!socket.isConnected) return;
    const id = setInterval(() => {
      const canvas = cameraCanvasRef.current;
      if (!canvas) return;
      try {
        const frame = canvas.toDataURL('image/jpeg', 0.4);
        socket.send({ type: 'camera-frame', frame });
      } catch {
        // ignore
      }
    }, CAMERA_FRAME_RATE);
    return () => clearInterval(id);
  }, [socket.isConnected, socket.send]);

  // One-time init log
  useEffect(() => {
    if (initLoggedRef.current) return;
    initLoggedRef.current = true;
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ??
      `ws://${window.location.hostname}:3000`;
    log('info', 'Boat simulator initialized');
    log('info', `Server: ${wsUrl}`);
    log('info', 'Click "启动船只" to connect');
  }, [log]);

  const onToggleConnection = () => {
    if (socket.isConnected) {
      socket.disconnect();
    } else {
      socket.connect(boatId || DEFAULT_BOAT_ID);
    }
  };

  return (
    <div className="layout">
      <header className="header">
        <h1>
          🚢 Sienovo Marine <span>Boat Simulator</span>
        </h1>
        <StatusBadge status={socket.status} />
      </header>

      <div className="lake-view">
        <LakeCanvas
          stateRef={sim.stateRef}
          trailRef={sim.trailRef}
          homeRef={sim.homeRef}
          isReturningHomeRef={sim.isReturningHomeRef}
        />
      </div>

      <SidePanel
        state={sim.snapshot}
        status={socket.status}
        isConnected={socket.isConnected}
        boatId={boatId}
        onBoatIdChange={setBoatId}
        onToggleConnection={onToggleConnection}
        cameraCanvasRef={cameraCanvasRef}
        stateRef={sim.stateRef}
      />

      <LogPanel entries={entries} />
    </div>
  );
}
