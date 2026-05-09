'use client';

import Link from 'next/link';
import { use } from 'react';
import { LogoLockup } from '../../../_components/Logo';
import { useBoatViewer, controlTopic } from '@/lib/useBoatViewer';
import type { ComponentKey, ComponentStatus } from '@/lib/types';

const COMPONENT_LABELS: Record<ComponentKey, string> = {
  motor: '电机',
  battery: '电池',
  gps: 'GPS',
  camera: '摄像头',
  light: '补光灯',
  baitDispenser: '投饵器',
  rudder: '舵机',
  link: '通讯链路',
};

const STATUS_LABEL: Record<ComponentStatus, string> = {
  normal: '正常',
  warning: '警告',
  damaged: '损坏',
  offline: '离线',
};

const STATUS_TONE: Record<ComponentStatus, string> = {
  normal: 'green',
  warning: 'orange',
  damaged: 'red',
  offline: 'muted',
};

export default function BoatStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { state, status, errorMessage, cameraFrame, publish } = useBoatViewer(id);

  const setFault = (component: ComponentKey, statusValue: ComponentStatus) => {
    publish(controlTopic(id), { type: 'set-fault', component, status: statusValue });
  };

  const battClass =
    state && state.battery > 50 ? 'green' : state && state.battery > 20 ? 'orange' : 'red';
  const tempClass =
    state && state.waterTemp < 12 ? 'blue' : state && state.waterTemp > 24 ? 'orange' : 'green';

  return (
    <main className="boats-page">
      <header className="boats-header">
        <Link href="/boats" className="boats-back">
          <LogoLockup size={20} />
        </Link>
        <h1 className="boats-title">{id} · 状态仪表盘</h1>
        <Link href={`/boats/${encodeURIComponent(id)}/control`} className="boats-link-btn">
          打开操作仪表盘 →
        </Link>
      </header>

      <div className="boats-banner">
        <span className="boats-banner-tag">v1</span>
        <span>
          实时订阅 <code>sienovo/boats/{id}/state</code>。当前连接状态：
          <b style={{ marginLeft: 6 }}>{statusLabel(status)}</b>
          {errorMessage && <span style={{ color: '#dc2626', marginLeft: 8 }}>· {errorMessage}</span>}
        </span>
      </div>

      <section className="boats-stats">
        <div className="stat-block">
          <div className="stat-block-label">速度</div>
          <div className="stat-block-value blue">
            {state ? `${(state.speed * 3.6).toFixed(1)}` : '—'}
          </div>
          <div className="stat-block-hint">km/h</div>
        </div>
        <div className="stat-block">
          <div className="stat-block-label">电量</div>
          <div className={`stat-block-value ${state ? battClass : ''}`}>
            {state ? `${state.battery.toFixed(0)}%` : '—'}
          </div>
          <div className="stat-block-hint">{state && state.battery < 20 ? '低电量' : '正常'}</div>
        </div>
        <div className="stat-block">
          <div className="stat-block-label">信号</div>
          <div className="stat-block-value blue">{state ? state.signal.toFixed(0) : '—'}</div>
          <div className="stat-block-hint">链路质量</div>
        </div>
        <div className="stat-block">
          <div className="stat-block-label">饵料</div>
          <div className="stat-block-value orange">
            {state ? `${state.baitLevel.toFixed(0)}%` : '—'}
          </div>
          <div className="stat-block-hint">剩余</div>
        </div>
        <div className="stat-block">
          <div className="stat-block-label">距离</div>
          <div className="stat-block-value">{state ? `${state.distance.toFixed(0)} m` : '—'}</div>
          <div className="stat-block-hint">距 home</div>
        </div>
        <div className="stat-block">
          <div className="stat-block-label">水温</div>
          <div className={`stat-block-value ${state ? tempClass : ''}`}>
            {state ? `${state.waterTemp.toFixed(1)}°C` : '—'}
          </div>
          <div className="stat-block-hint">水深 {state ? `${state.depth.toFixed(1)}m` : '—'}</div>
        </div>
      </section>

      <section style={{ marginBlock: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>配件状态</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 10,
          }}
        >
          {(Object.keys(COMPONENT_LABELS) as ComponentKey[]).map((key) => {
            const s = state?.components?.[key] ?? 'offline';
            const tone = STATUS_TONE[s];
            return (
              <div
                key={key}
                style={{
                  padding: '10px 12px',
                  border: '1px solid var(--border, #e5e7eb)',
                  borderRadius: 10,
                  background: 'var(--card, #fff)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontWeight: 600 }}>{COMPONENT_LABELS[key]}</span>
                  <span
                    style={{
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background:
                        tone === 'green'
                          ? '#10b98122'
                          : tone === 'orange'
                            ? '#f5970022'
                            : tone === 'red'
                              ? '#ef444422'
                              : '#9ca3af22',
                      color:
                        tone === 'green'
                          ? '#059669'
                          : tone === 'orange'
                            ? '#d97706'
                            : tone === 'red'
                              ? '#dc2626'
                              : '#6b7280',
                    }}
                  >
                    {STATUS_LABEL[s]}
                  </span>
                </div>
                <select
                  value={s}
                  onChange={(e) => setFault(key, e.target.value as ComponentStatus)}
                  disabled={status !== 'live'}
                  style={{
                    fontSize: 11,
                    padding: '3px 6px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    background: '#f9fafb',
                  }}
                  title="覆盖此配件状态（仅模拟器有效）"
                >
                  <option value="normal">→ 正常（清除）</option>
                  <option value="warning">→ 注入警告</option>
                  <option value="damaged">→ 注入损坏</option>
                </select>
              </div>
            );
          })}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          故障注入：通过 MQTT 发送 <code>set-fault</code> 命令到模拟船。真实船端固件需自行实现该 handler。
        </p>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginTop: 8,
        }}
      >
        <div className="panel-section" style={{ padding: 16 }}>
          <h3>GPS</h3>
          <div className="gps">
            <div>纬度：<span>{state ? state.lat.toFixed(6) : '—'}</span></div>
            <div>经度：<span>{state ? state.lng.toFixed(6) : '—'}</span></div>
            <div>航向：<span>{state ? `${state.heading.toFixed(0)}°` : '—'}</span></div>
          </div>
        </div>
        <div className="panel-section" style={{ padding: 16 }}>
          <h3>摄像头</h3>
          {cameraFrame ? (
            <img
              src={cameraFrame.dataUrl}
              alt="camera"
              style={{ width: '100%', borderRadius: 8 }}
            />
          ) : (
            <div className="muted" style={{ padding: 12 }}>
              尚未收到画面（船端需 publish 到 <code>sienovo/boats/{id}/camera</code>）
            </div>
          )}
        </div>
      </section>
    </main>
  );
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
