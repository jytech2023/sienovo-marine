'use client';

import { type RefObject } from 'react';
import type { BoatState, ConnectionStatus } from '@/lib/types';
import { CameraCanvas } from './CameraCanvas';

type Props = {
  state: BoatState;
  status: ConnectionStatus;
  isConnected: boolean;
  boatId: string;
  waypointCount: number;
  onBoatIdChange: (id: string) => void;
  onToggleConnection: () => void;
  onToggleIR: () => void;
  onToggleLight: () => void;
  onClearWaypoints: () => void;
  cameraCanvasRef: RefObject<HTMLCanvasElement | null>;
  stateRef: RefObject<BoatState>;
};

export function SidePanel({
  state,
  isConnected,
  boatId,
  waypointCount,
  onBoatIdChange,
  onToggleConnection,
  onToggleIR,
  onToggleLight,
  onClearWaypoints,
  cameraCanvasRef,
  stateRef,
}: Props) {
  const batteryClass =
    state.battery > 50 ? 'green' : state.battery > 20 ? 'orange' : 'red';
  const tempClass =
    state.waterTemp < 12 ? 'blue' : state.waterTemp > 24 ? 'orange' : 'green';

  return (
    <aside className="side-panel">
      <section className="panel-section">
        <h3>船载摄像头</h3>
        <div className="camera-view">
          <CameraCanvas ref={cameraCanvasRef} stateRef={stateRef} />
          <div className="camera-label">
            <span className="dot" /> REC
          </div>
        </div>
        <div className="toggle-row">
          <button
            type="button"
            className={`toggle-btn ${state.ir ? 'on' : ''}`}
            onClick={onToggleIR}
            aria-pressed={state.ir}
          >
            <span className="toggle-icon">◉</span> 红外线
          </button>
          <button
            type="button"
            className={`toggle-btn ${state.light ? 'on' : ''}`}
            onClick={onToggleLight}
            aria-pressed={state.light}
          >
            <span className="toggle-icon">☀</span> 补光
          </button>
        </div>
      </section>

      <section className="panel-section">
        <h3>设备配对</h3>
        <input
          type="text"
          className="boat-id-input"
          value={boatId}
          onChange={(e) => onBoatIdChange(e.target.value)}
          placeholder="船只 ID"
        />
        <button
          type="button"
          className={`btn ${isConnected ? 'btn-danger' : 'btn-primary'}`}
          onClick={onToggleConnection}
        >
          {isConnected ? '关闭船只' : '启动船只'}
        </button>
      </section>

      <section className="panel-section">
        <h3>船只状态</h3>
        <div className="stat-grid">
          <div className="stat-item">
            <div className="stat-label">速度</div>
            <div className="stat-value blue">{(state.speed * 3.6).toFixed(1)} km/h</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">航向</div>
            <div className="stat-value green">{state.heading.toFixed(0)}°</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">距离</div>
            <div className="stat-value orange">{state.distance.toFixed(0)}m</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">电量</div>
            <div className={`stat-value ${batteryClass}`}>{state.battery.toFixed(0)}%</div>
          </div>
        </div>
      </section>

      <section className="panel-section">
        <h3>水下传感</h3>
        <div className="stat-grid">
          <div className="stat-item">
            <div className="stat-label">水深</div>
            <div className="stat-value blue">{state.depth.toFixed(1)}m</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">水温</div>
            <div className={`stat-value ${tempClass}`}>{state.waterTemp.toFixed(1)}°C</div>
          </div>
        </div>
      </section>

      <section className="panel-section">
        <h3>饵料仓</h3>
        <div className="bait-bar">
          <div className="bait-bar-fill" style={{ width: `${state.baitLevel}%` }} />
        </div>
        <div className="bait-meta">
          剩余: <span>{state.baitLevel.toFixed(0)}</span>%
        </div>
      </section>

      <section className="panel-section">
        <h3>船点</h3>
        <div className="waypoint-meta">
          已设置: <span>{waypointCount}</span> 个
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClearWaypoints}
          disabled={waypointCount === 0}
        >
          清空船点
        </button>
      </section>

      <section className="panel-section">
        <h3>GPS 坐标</h3>
        <div className="gps">
          <div>
            纬度: <span>{state.lat.toFixed(6)}</span>
          </div>
          <div>
            经度: <span>{state.lng.toFixed(6)}</span>
          </div>
        </div>
      </section>
    </aside>
  );
}
