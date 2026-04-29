'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_BOAT_ID,
  DEFAULT_LAT,
  DEFAULT_LNG,
  DEG_PER_METER,
  MAX_SPEED_MS,
  MAX_TRAIL_POINTS,
  STATE_BROADCAST_RATE,
} from './constants';
import type { BoatCommand, BoatState, LogLevel, TrailPoint, Waypoint } from './types';

type Options = {
  log: (level: LogLevel, message: string) => void;
  onBroadcast?: (state: BoatState) => void;
  onBaitReleasedAtTarget?: (target: { lat: number; lng: number; remaining: number }) => void;
};

const initialState = (): BoatState => ({
  id: DEFAULT_BOAT_ID,
  lat: DEFAULT_LAT,
  lng: DEFAULT_LNG,
  heading: 0,
  speed: 0,
  battery: 100,
  signal: 95,
  baitLevel: 100,
  distance: 0,
  depth: 0,
  waterTemp: 0,
  ir: false,
  light: false,
  isOnline: false,
});

// Position-deterministic noise so the readings move smoothly with the boat
// without any state of their own.
const sampleDepth = (lat: number, lng: number): number => {
  const a = Math.sin(lat * 50000) * 2.0;
  const b = Math.cos(lng * 50000) * 1.6;
  const c = Math.sin((lat + lng) * 30000) * 1.0;
  return Math.max(0.4, 5 + a + b + c);
};

const sampleTemp = (lat: number, lng: number): number => {
  const a = Math.sin(lat * 3000) * 1.4;
  const b = Math.cos(lng * 3000) * 0.9;
  return 17 + a + b;
};

const ARRIVAL_THRESHOLD_M = 1;
const APPROACH_RANGE_M = 10;
const CRUISE_SPEED_MS = 0.83;

export function useBoatSimulation({ log, onBroadcast, onBaitReleasedAtTarget }: Options) {
  const stateRef = useRef<BoatState>(initialState());
  const trailRef = useRef<TrailPoint[]>([]);
  const waypointsRef = useRef<Waypoint[]>([]);
  const targetRef = useRef<{ lat: number; lng: number } | null>(null);
  const commandRef = useRef<BoatCommand>({ throttle: 0, rudder: 0 });
  const isReturningHomeRef = useRef(false);
  const homeRef = useRef({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const lastFrameRef = useRef(performance.now());
  const waypointIdRef = useRef(0);

  const [snapshot, setSnapshot] = useState<BoatState>(stateRef.current);

  const cancelAutopilot = useCallback((reason: string) => {
    let cancelled = false;
    if (isReturningHomeRef.current) {
      isReturningHomeRef.current = false;
      cancelled = true;
    }
    if (targetRef.current) {
      targetRef.current = null;
      cancelled = true;
    }
    if (cancelled) log('warn', `Autopilot cancelled: ${reason}`);
  }, [log]);

  const releaseBait = useCallback((): { remaining: number; ok: boolean } => {
    const s = stateRef.current;
    if (s.baitLevel > 0) {
      s.baitLevel = Math.max(0, s.baitLevel - 20);
      log('success', `Bait released! Remaining: ${s.baitLevel}%`);
      return { remaining: s.baitLevel, ok: true };
    }
    log('warn', 'Bait tank empty!');
    return { remaining: s.baitLevel, ok: false };
  }, [log]);

  const step = useCallback(() => {
    const now = performance.now();
    const dt = (now - lastFrameRef.current) / 1000;
    lastFrameRef.current = now;
    if (dt > 0.1) return;

    const s = stateRef.current;
    const home = homeRef.current;

    if (targetRef.current) {
      const tgt = targetRef.current;
      const dLatM = (tgt.lat - s.lat) * 111000;
      const dLngM = (tgt.lng - s.lng) * 111000 * Math.cos((s.lat * Math.PI) / 180);
      const distM = Math.sqrt(dLatM * dLatM + dLngM * dLngM);

      if (distM < ARRIVAL_THRESHOLD_M) {
        const arrivedAt = { ...tgt };
        targetRef.current = null;
        s.speed = 0;
        s.lat = tgt.lat;
        s.lng = tgt.lng;
        log('success', `Arrived at waypoint ${tgt.lat.toFixed(5)}, ${tgt.lng.toFixed(5)}`);
        const result = releaseBait();
        if (result.ok) {
          onBaitReleasedAtTarget?.({ ...arrivedAt, remaining: result.remaining });
        }
      } else {
        s.heading = ((Math.atan2(dLngM, dLatM) * 180) / Math.PI + 360) % 360;
        const targetSpeed =
          distM < APPROACH_RANGE_M ? CRUISE_SPEED_MS * (distM / APPROACH_RANGE_M) : CRUISE_SPEED_MS;
        s.speed += (targetSpeed - s.speed) * 2 * dt;
      }
    } else if (isReturningHomeRef.current) {
      const dLatM = (home.lat - s.lat) * 111000;
      const dLngM = (home.lng - s.lng) * 111000 * Math.cos((s.lat * Math.PI) / 180);
      const distM = Math.sqrt(dLatM * dLatM + dLngM * dLngM);

      if (distM < ARRIVAL_THRESHOLD_M) {
        isReturningHomeRef.current = false;
        s.speed = 0;
        s.lat = home.lat;
        s.lng = home.lng;
        log('success', 'Arrived at home position!');
        onBroadcast?.({ ...s, distance: 0 });
        return;
      }

      s.heading = ((Math.atan2(dLngM, dLatM) * 180) / Math.PI + 360) % 360;
      const targetSpeed = distM < APPROACH_RANGE_M ? CRUISE_SPEED_MS * (distM / APPROACH_RANGE_M) : CRUISE_SPEED_MS;
      s.speed += (targetSpeed - s.speed) * 2 * dt;
    } else {
      const cmd = commandRef.current;
      s.heading = (s.heading + cmd.rudder * 90 * dt) % 360;
      if (s.heading < 0) s.heading += 360;

      const targetSpeed = Math.max(0, cmd.throttle) * MAX_SPEED_MS;
      s.speed += (targetSpeed - s.speed) * 3 * dt;

      if (Math.abs(cmd.throttle) < 0.01 && Math.abs(cmd.rudder) < 0.01) {
        s.speed *= Math.pow(0.3, dt);
        if (s.speed < 0.01) s.speed = 0;
      }
    }

    if (s.speed > 0.001) {
      const rad = (s.heading * Math.PI) / 180;
      const moveMeters = s.speed * dt;
      s.lat += Math.cos(rad) * moveMeters * DEG_PER_METER;
      s.lng +=
        (Math.sin(rad) * moveMeters * DEG_PER_METER) /
        Math.cos((s.lat * Math.PI) / 180);
    }

    const dlat = (s.lat - home.lat) * 111000;
    const dlng = (s.lng - home.lng) * 111000 * Math.cos((s.lat * Math.PI) / 180);
    s.distance = Math.sqrt(dlat * dlat + dlng * dlng);

    s.depth = sampleDepth(s.lat, s.lng);
    s.waterTemp = sampleTemp(s.lat, s.lng);

    // Light + IR draw a small amount of extra current
    const sensorDrain = (s.ir ? 0.003 : 0) + (s.light ? 0.005 : 0);
    s.battery = Math.max(0, s.battery - ((s.speed / MAX_SPEED_MS) * 0.017 + sensorDrain) * dt);

    const trail = trailRef.current;
    const last = trail[trail.length - 1];
    if (
      !last ||
      Math.abs(s.lat - last.lat) + Math.abs(s.lng - last.lng) > DEG_PER_METER * 0.5
    ) {
      trail.push({ lat: s.lat, lng: s.lng });
      if (trail.length > MAX_TRAIL_POINTS) trail.shift();
    }
  }, [log, onBroadcast, onBaitReleasedAtTarget, releaseBait]);

  useEffect(() => {
    const id = setInterval(() => {
      setSnapshot({ ...stateRef.current });
    }, STATE_BROADCAST_RATE);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!onBroadcast) return;
    const id = setInterval(() => {
      onBroadcast({ ...stateRef.current });
    }, STATE_BROADCAST_RATE);
    return () => clearInterval(id);
  }, [onBroadcast]);

  const setBoatId = useCallback((id: string) => {
    stateRef.current.id = id;
    setSnapshot((prev) => ({ ...prev, id }));
  }, []);

  const setOnline = useCallback((online: boolean) => {
    stateRef.current.isOnline = online;
  }, []);

  const setCommand = useCallback(
    (command: BoatCommand) => {
      commandRef.current = command;
      if (Math.abs(command.throttle) > 0.1 || Math.abs(command.rudder) > 0.1) {
        cancelAutopilot('manual control');
      }
    },
    [cancelAutopilot],
  );

  const startReturnHome = useCallback(() => {
    targetRef.current = null;
    isReturningHomeRef.current = true;
    log('info', 'Returning to home position...');
  }, [log]);

  const addWaypoint = useCallback((lat: number, lng: number): Waypoint => {
    const wp: Waypoint = { id: ++waypointIdRef.current, lat, lng };
    waypointsRef.current.push(wp);
    log('info', `Waypoint #${wp.id} set: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    return wp;
  }, [log]);

  const clearWaypoints = useCallback(() => {
    const count = waypointsRef.current.length;
    waypointsRef.current = [];
    log('info', count ? `Cleared ${count} waypoint(s)` : 'No waypoints to clear');
  }, [log]);

  const baitAtWaypoint = useCallback((lat: number, lng: number) => {
    isReturningHomeRef.current = false;
    targetRef.current = { lat, lng };
    log('info', `Going to ${lat.toFixed(5)}, ${lng.toFixed(5)} for precision baiting...`);
  }, [log]);

  const setCameraMode = useCallback(
    ({ ir, light }: { ir?: boolean; light?: boolean }) => {
      const s = stateRef.current;
      if (typeof ir === 'boolean' && ir !== s.ir) {
        s.ir = ir;
        log('info', `IR mode ${ir ? 'on' : 'off'}`);
      }
      if (typeof light === 'boolean' && light !== s.light) {
        s.light = light;
        log('info', `Fill light ${light ? 'on' : 'off'}`);
      }
    },
    [log],
  );

  return {
    snapshot,
    stateRef,
    trailRef,
    waypointsRef,
    targetRef,
    homeRef,
    isReturningHomeRef,
    step,
    setBoatId,
    setOnline,
    setCommand,
    releaseBait,
    startReturnHome,
    addWaypoint,
    clearWaypoints,
    baitAtWaypoint,
    setCameraMode,
  };
}
