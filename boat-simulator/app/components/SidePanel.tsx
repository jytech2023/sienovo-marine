'use client';

import { type RefObject } from 'react';
import type { BoatState, ConnectionStatus } from '@/lib/types';
import { CameraCanvas } from './CameraCanvas';

type Props = {
  state: BoatState;
  status: ConnectionStatus;
  isConnected: boolean;
  boatId: string;
  onBoatIdChange: (id: string) => void;
  onToggleConnection: () => void;
  cameraCanvasRef: RefObject<HTMLCanvasElement | null>;
  stateRef: RefObject<BoatState>;
};

export function SidePanel({
  state,
  isConnected,
  boatId,
  onBoatIdChange,
  onToggleConnection,
  cameraCanvasRef,
  stateRef,
}: Props) {
  const batteryClass =
    state.battery > 50 ? 'green' : state.battery > 20 ? 'orange' : 'red';

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
        <h3>饵料仓</h3>
        <div className="bait-bar">
          <div className="bait-bar-fill" style={{ width: `${state.baitLevel}%` }} />
        </div>
        <div className="bait-meta">
          剩余: <span>{state.baitLevel.toFixed(0)}</span>%
        </div>
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
