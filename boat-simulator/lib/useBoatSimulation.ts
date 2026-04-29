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
import type { BoatCommand, BoatState, LogLevel, TrailPoint } from './types';

type Options = {
  log: (level: LogLevel, message: string) => void;
  onBroadcast?: (state: BoatState) => void;
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
  isOnline: false,
});

export function useBoatSimulation({ log, onBroadcast }: Options) {
  const stateRef = useRef<BoatState>(initialState());
  const trailRef = useRef<TrailPoint[]>([]);
  const commandRef = useRef<BoatCommand>({ throttle: 0, rudder: 0 });
  const isReturningHomeRef = useRef(false);
  const homeRef = useRef({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const lastFrameRef = useRef(performance.now());

  const [snapshot, setSnapshot] = useState<BoatState>(stateRef.current);

  const step = useCallback(() => {
    const now = performance.now();
    const dt = (now - lastFrameRef.current) / 1000;
    lastFrameRef.current = now;
    if (dt > 0.1) return;

    const s = stateRef.current;
    const home = homeRef.current;

    if (isReturningHomeRef.current) {
      const dLatM = (home.lat - s.lat) * 111000;
      const dLngM = (home.lng - s.lng) * 111000 * Math.cos((s.lat * Math.PI) / 180);
      const distM = Math.sqrt(dLatM * dLatM + dLngM * dLngM);

      if (distM < 1) {
        isReturningHomeRef.current = false;
        s.speed = 0;
        s.lat = home.lat;
        s.lng = home.lng;
        log('success', 'Arrived at home position!');
        onBroadcast?.({ ...s, distance: 0 });
        return;
      }

      s.heading = ((Math.atan2(dLngM, dLatM) * 180) / Math.PI + 360) % 360;
      const cruiseSpeed = 0.83;
      const targetSpeed = distM < 10 ? cruiseSpeed * (distM / 10) : cruiseSpeed;
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

    s.battery = Math.max(0, s.battery - (s.speed / MAX_SPEED_MS) * 0.017 * dt);

    const trail = trailRef.current;
    const last = trail[trail.length - 1];
    if (
      !last ||
      Math.abs(s.lat - last.lat) + Math.abs(s.lng - last.lng) > DEG_PER_METER * 0.5
    ) {
      trail.push({ lat: s.lat, lng: s.lng });
      if (trail.length > MAX_TRAIL_POINTS) trail.shift();
    }
  }, [log, onBroadcast]);

  // UI snapshot at ~10fps — enough for stats panel without flooding React
  useEffect(() => {
    const id = setInterval(() => {
      setSnapshot({ ...stateRef.current });
    }, STATE_BROADCAST_RATE);
    return () => clearInterval(id);
  }, []);

  // State broadcast at fixed rate
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
      if (
        isReturningHomeRef.current &&
        (Math.abs(command.throttle) > 0.1 || Math.abs(command.rudder) > 0.1)
      ) {
        isReturningHomeRef.current = false;
        log('warn', 'Return home cancelled by manual control');
      }
    },
    [log],
  );

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

  const startReturnHome = useCallback(() => {
    isReturningHomeRef.current = true;
    log('info', 'Returning to home position...');
  }, [log]);

  return {
    snapshot,
    stateRef,
    trailRef,
    homeRef,
    isReturningHomeRef,
    step,
    setBoatId,
    setOnline,
    setCommand,
    releaseBait,
    startReturnHome,
  };
}
