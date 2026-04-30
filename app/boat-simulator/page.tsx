'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Logo } from '../_components/Logo';
import { LakeCanvas } from './_components/LakeCanvas';
import { LogPanel } from './_components/LogPanel';
import { SidePanel } from './_components/SidePanel';
import { StatusBadge } from './_components/StatusBadge';
import { CAMERA_FRAME_RATE, DEFAULT_BOAT_ID } from '@/lib/constants';
import { useBoatSimulation } from '@/lib/useBoatSimulation';
import { useBoatSocket } from '@/lib/useBoatSocket';
import { useBoats } from '@/lib/useBoats';
import { useLog } from '@/lib/useLog';
import type { BoatState, IncomingMessage } from '@/lib/types';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageInner />
    </Suspense>
  );
}

function PageInner() {
  const searchParams = useSearchParams();
  const initialBoatId = searchParams.get('boatId') ?? DEFAULT_BOAT_ID;
  const { entries, log } = useLog();
  const [boatId, setBoatId] = useState(initialBoatId);
  const [waypointCount, setWaypointCount] = useState(0);
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const initLoggedRef = useRef(false);

  const sendRef = useRef<(msg: unknown) => void>(() => {});

  const broadcast = useCallback((state: BoatState) => {
    sendRef.current({ type: 'state-update', state });
  }, []);

  const onBaitReleasedAtTarget = useCallback(
    (target: { lat: number; lng: number; remaining: number }) => {
      sendRef.current({
        type: 'bait-released',
        remaining: target.remaining,
        lat: target.lat,
        lng: target.lng,
      });
    },
    [],
  );

  const sim = useBoatSimulation({
    log,
    onBroadcast: broadcast,
    onBaitReleasedAtTarget,
  });

  const refreshWaypointCount = useCallback(() => {
    setWaypointCount(sim.waypointsRef.current.length);
  }, [sim.waypointsRef]);

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
          sim.addWaypoint(msg.lat, msg.lng);
          refreshWaypointCount();
          break;
        case 'clear-waypoints':
          sim.clearWaypoints();
          refreshWaypointCount();
          break;
        case 'bait-at-waypoint':
          sim.baitAtWaypoint(msg.lat, msg.lng);
          sendRef.current({ type: 'going-to-waypoint', lat: msg.lat, lng: msg.lng });
          break;
        case 'set-camera-mode':
          sim.setCameraMode({ ir: msg.ir, light: msg.light });
          break;
      }
    },
    [sim, refreshWaypointCount],
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

  const { boats } = useBoats();

  useEffect(() => {
    sendRef.current = socket.send;
  }, [socket.send]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      sim.step();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sim]);

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

  useEffect(() => {
    if (initLoggedRef.current) return;
    initLoggedRef.current = true;
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ??
      `ws://${window.location.hostname}:5001`;
    log('info', 'Boat simulator initialized');
    log('info', `Server: ${wsUrl}`);

    if (searchParams.get('autoStart') === '1') {
      log('info', `Auto-starting as ${initialBoatId}...`);
      socket.connect(initialBoatId);
    } else {
      log('info', 'Click "启动船只" to connect');
    }
  }, [log, searchParams, initialBoatId, socket]);

  const onToggleConnection = () => {
    if (socket.isConnected) {
      socket.disconnect();
    } else {
      socket.connect(boatId || DEFAULT_BOAT_ID);
    }
  };

  const onToggleIR = () => {
    sim.setCameraMode({ ir: !sim.stateRef.current.ir });
  };

  const onToggleLight = () => {
    sim.setCameraMode({ light: !sim.stateRef.current.light });
  };

  const onClearWaypoints = () => {
    sim.clearWaypoints();
    refreshWaypointCount();
  };

  return (
    <div className="layout">
      <header className="header">
        <h1 className="header-title">
          <Logo size={22} className="header-logo" />
          Sienovo Marine <span>Boat Simulator</span>
        </h1>
        <StatusBadge status={socket.status} />
      </header>

      <div className="lake-view">
        <LakeCanvas
          stateRef={sim.stateRef}
          trailRef={sim.trailRef}
          waypointsRef={sim.waypointsRef}
          targetRef={sim.targetRef}
          homeRef={sim.homeRef}
          isReturningHomeRef={sim.isReturningHomeRef}
        />
      </div>

      <SidePanel
        state={sim.snapshot}
        status={socket.status}
        isConnected={socket.isConnected}
        boatId={boatId}
        waypointCount={waypointCount}
        boats={boats}
        onBoatIdChange={setBoatId}
        onToggleConnection={onToggleConnection}
        onToggleIR={onToggleIR}
        onToggleLight={onToggleLight}
        onClearWaypoints={onClearWaypoints}
        cameraCanvasRef={cameraCanvasRef}
        stateRef={sim.stateRef}
      />

      <LogPanel entries={entries} />
    </div>
  );
}
