'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Logo } from '../_components/Logo';
import { LakeCanvas } from './_components/LakeCanvas';
import { CameraCanvas } from './_components/CameraCanvas';
import { BoatList } from './_components/BoatList';
import { DEFAULT_BOAT_ID, MAX_TRAIL_POINTS, DEG_PER_METER } from '@/lib/constants';
import { useBoatViewer } from '@/lib/useBoatViewer';
import { useBoats } from '@/lib/useBoats';
import type { BoatState, TrailPoint, Waypoint } from '@/lib/types';

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
  const [boatId, setBoatId] = useState(initialBoatId);
  const { state, status, errorMessage, cameraFrame } = useBoatViewer(boatId);
  const { boats } = useBoats();

  // Keep internal refs that LakeCanvas needs, populated from MQTT state.
  const stateRef = useRef<BoatState>(emptyState(boatId));
  const trailRef = useRef<TrailPoint[]>([]);
  const waypointsRef = useRef<Waypoint[]>([]);
  const targetRef = useRef<{ lat: number; lng: number } | null>(null);
  const homeRef = useRef<{ lat: number; lng: number }>({ lat: 30.2741, lng: 120.1551 });
  const isReturningHomeRef = useRef(false);
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const homeInitedRef = useRef(false);

  // Whenever a new state arrives, update refs + extend trail.
  useEffect(() => {
    if (!state) return;
    stateRef.current = state;
    if (!homeInitedRef.current && state.lat && state.lng) {
      homeRef.current = { lat: state.lat, lng: state.lng };
      homeInitedRef.current = true;
    }
    const trail = trailRef.current;
    const last = trail[trail.length - 1];
    if (
      !last ||
      Math.abs(state.lat - last.lat) + Math.abs(state.lng - last.lng) > DEG_PER_METER * 0.5
    ) {
      trail.push({ lat: state.lat, lng: state.lng });
      if (trail.length > MAX_TRAIL_POINTS) trail.shift();
    }
  }, [state]);

  // Reset trail/home when switching boats
  useEffect(() => {
    trailRef.current = [];
    homeInitedRef.current = false;
    stateRef.current = emptyState(boatId);
  }, [boatId]);

  const battClass =
    state && state.battery > 50 ? 'green' : state && state.battery > 20 ? 'orange' : 'red';
  const tempClass =
    state && state.waterTemp < 12 ? 'blue' : state && state.waterTemp > 24 ? 'orange' : 'green';

  return (
    <div className="layout">
      <header className="header">
        <h1 className="header-title">
          <Logo size={22} className="header-logo" />
          Sienovo Marine <span>· Boat Visualizer</span>
        </h1>
        <span className={`status-badge ${statusClass(status)}`}>{statusLabel(status)}</span>
      </header>

      <div className="lake-view">
        <LakeCanvas
          stateRef={stateRef}
          trailRef={trailRef}
          waypointsRef={waypointsRef}
          targetRef={targetRef}
          homeRef={homeRef}
          isReturningHomeRef={isReturningHomeRef}
        />
      </div>

      <aside className="side-panel">
        <BoatList boats={boats} activeId={boatId} onSelect={setBoatId} />

        <section className="panel-section">
          <h3>船载摄像头</h3>
          <div className="camera-view">
            {cameraFrame ? (
              <img
                src={cameraFrame.dataUrl}
                alt="camera"
                style={{ width: '100%', display: 'block' }}
              />
            ) : (
              <CameraCanvas ref={cameraCanvasRef} stateRef={stateRef} />
            )}
            <div className="camera-label">
              <span className="dot" /> {cameraFrame ? 'LIVE' : 'NO SIGNAL'}
            </div>
          </div>
        </section>

        <section className="panel-section">
          <h3>船只 · {boatId}</h3>
          <div className="stat-grid">
            <div className="stat-item">
              <div className="stat-label">速度</div>
              <div className="stat-value blue">
                {state ? `${(state.speed * 3.6).toFixed(1)}` : '—'} km/h
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">航向</div>
              <div className="stat-value green">{state ? `${state.heading.toFixed(0)}°` : '—'}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">距离</div>
              <div className="stat-value orange">
                {state ? `${state.distance.toFixed(0)}m` : '—'}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">电量</div>
              <div className={`stat-value ${state ? battClass : ''}`}>
                {state ? `${state.battery.toFixed(0)}%` : '—'}
              </div>
            </div>
          </div>
        </section>

        <section className="panel-section">
          <h3>水下传感</h3>
          <div className="stat-grid">
            <div className="stat-item">
              <div className="stat-label">水深</div>
              <div className="stat-value blue">
                {state ? `${state.depth.toFixed(1)}m` : '—'}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">水温</div>
              <div className={`stat-value ${state ? tempClass : ''}`}>
                {state ? `${state.waterTemp.toFixed(1)}°C` : '—'}
              </div>
            </div>
          </div>
        </section>

        <section className="panel-section">
          <h3>饵料仓</h3>
          <div className="bait-bar">
            <div
              className="bait-bar-fill"
              style={{ width: `${state ? state.baitLevel : 0}%` }}
            />
          </div>
          <div className="bait-meta">
            剩余: <span>{state ? state.baitLevel.toFixed(0) : '—'}</span>%
          </div>
        </section>

        <section className="panel-section">
          <h3>GPS 坐标</h3>
          <div className="gps">
            <div>纬度: <span>{state ? state.lat.toFixed(6) : '—'}</span></div>
            <div>经度: <span>{state ? state.lng.toFixed(6) : '—'}</span></div>
          </div>
        </section>

        <section className="panel-section">
          <h3>仪表盘入口</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link href={`/boats/${encodeURIComponent(boatId)}/status`} className="btn btn-secondary">
              状态仪表盘 →
            </Link>
            <Link href={`/boats/${encodeURIComponent(boatId)}/control`} className="btn btn-primary">
              操作仪表盘 →
            </Link>
          </div>
          {errorMessage && (
            <p style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{errorMessage}</p>
          )}
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            本页只读：实时订阅 IoT Core 上的船端数据。要驾驶请进操作仪表盘；要让船上线，本机跑 <code>npm run sim</code>。
          </p>
        </section>
      </aside>
    </div>
  );
}

function emptyState(id: string): BoatState {
  return {
    id,
    lat: 30.2741,
    lng: 120.1551,
    heading: 0,
    speed: 0,
    battery: 0,
    signal: 0,
    baitLevel: 0,
    distance: 0,
    depth: 0,
    waterTemp: 0,
    ir: false,
    light: false,
    isOnline: false,
    components: {
      motor: 'offline',
      battery: 'offline',
      gps: 'offline',
      camera: 'offline',
      light: 'offline',
      baitDispenser: 'offline',
      rudder: 'offline',
      link: 'offline',
    },
  };
}

function statusLabel(s: string) {
  switch (s) {
    case 'connecting':
      return '连接中…';
    case 'waiting':
      return '已连接，等待船上线';
    case 'live':
      return '在线';
    case 'offline':
      return '船离线';
    case 'error':
      return '连接异常';
    default:
      return s;
  }
}

function statusClass(s: string) {
  if (s === 'live') return 'online';
  if (s === 'connecting' || s === 'waiting') return 'connecting';
  return 'offline';
}
