'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { LogoLockup } from '../../../_components/Logo';
import { useBoatViewer, controlTopic } from '@/lib/useBoatViewer';

export default function BoatControlPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { state, status, errorMessage, publish } = useBoatViewer(id);

  const [throttle, setThrottle] = useState(0);
  const [rudder, setRudder] = useState(0);
  const [ir, setIr] = useState(false);
  const [light, setLight] = useState(false);

  // Sync UI toggles with incoming state when boat reports them.
  useEffect(() => {
    if (state) {
      setIr(state.ir);
      setLight(state.light);
    }
  }, [state?.ir, state?.light]);

  const sendControl = (t: number, r: number) => {
    publish(controlTopic(id), { type: 'control', command: { throttle: t, rudder: r } });
  };

  const onThrottleChange = (v: number) => {
    setThrottle(v);
    sendControl(v, rudder);
  };
  const onRudderChange = (v: number) => {
    setRudder(v);
    sendControl(throttle, v);
  };
  const emergencyStop = () => {
    setThrottle(0);
    setRudder(0);
    sendControl(0, 0);
  };
  const toggleIr = () => {
    const next = !ir;
    setIr(next);
    publish(controlTopic(id), { type: 'set-camera-mode', ir: next });
  };
  const toggleLight = () => {
    const next = !light;
    setLight(next);
    publish(controlTopic(id), { type: 'set-camera-mode', light: next });
  };
  const releaseBait = () => {
    publish(controlTopic(id), { type: 'release-bait' });
  };
  const returnHome = () => {
    publish(controlTopic(id), { type: 'return-home' });
  };

  const isLive = status === 'live';
  const battClass =
    state && state.battery > 50 ? 'green' : state && state.battery > 20 ? 'orange' : 'red';

  return (
    <main className="boats-page">
      <header className="boats-header">
        <Link href="/boats" className="boats-back">
          <LogoLockup size={20} />
        </Link>
        <h1 className="boats-title">{id} · 操作仪表盘</h1>
        <Link href={`/boats/${encodeURIComponent(id)}/status`} className="boats-link-btn">
          打开状态仪表盘 →
        </Link>
      </header>

      <div className="boats-banner">
        <span className="boats-banner-tag">v1</span>
        <span>
          发布到 <code>sienovo/boats/{id}/control</code>。当前连接状态：
          <b style={{ marginLeft: 6 }}>{statusLabel(status)}</b>
          {!isLive && (
            <span style={{ color: '#dc2626', marginLeft: 8 }}>· 控制指令仅在"在线"时生效</span>
          )}
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
          <div className="stat-block-label">航向</div>
          <div className="stat-block-value">{state ? `${state.heading.toFixed(0)}°` : '—'}</div>
          <div className="stat-block-hint">heading</div>
        </div>
        <div className="stat-block">
          <div className="stat-block-label">距离</div>
          <div className="stat-block-value">{state ? `${state.distance.toFixed(0)} m` : '—'}</div>
          <div className="stat-block-hint">距 home</div>
        </div>
        <div className="stat-block">
          <div className="stat-block-label">电量</div>
          <div className={`stat-block-value ${state ? battClass : ''}`}>
            {state ? `${state.battery.toFixed(0)}%` : '—'}
          </div>
          <div className="stat-block-hint">{state && state.battery < 20 ? '低电量' : '正常'}</div>
        </div>
      </section>

      <section
        className="panel-section"
        style={{ padding: 20, marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
      >
        <h3 style={{ alignSelf: 'flex-start' }}>方向控制 (按住生效，松开停止)</h3>
        <DPad
          isLive={isLive}
          onChange={(t, r) => {
            setThrottle(t);
            setRudder(r);
            sendControl(t, r);
          }}
        />
        <div className="muted" style={{ fontSize: 12 }}>
          当前 油门 <b>{Math.round(throttle * 100)}%</b> · 方向{' '}
          <b>{rudder === 0 ? '居中' : `${rudder > 0 ? '右' : '左'} ${Math.abs(Math.round(rudder * 100))}%`}</b>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginTop: 16,
        }}
      >
        <div className="panel-section" style={{ padding: 20 }}>
          <h3>油门微调 / Throttle</h3>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={throttle}
            onChange={(e) => onThrottleChange(Number(e.target.value))}
            disabled={!isLive}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span className="muted">后 -100%</span>
            <b>{Math.round(throttle * 100)}%</b>
            <span className="muted">前 +100%</span>
          </div>
        </div>

        <div className="panel-section" style={{ padding: 20 }}>
          <h3>方向微调 / Rudder</h3>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={rudder}
            onChange={(e) => onRudderChange(Number(e.target.value))}
            disabled={!isLive}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span className="muted">左 -100%</span>
            <b>
              {rudder === 0 ? '居中' : `${rudder > 0 ? '右 ' : '左 '}${Math.abs(Math.round(rudder * 100))}%`}
            </b>
            <span className="muted">右 +100%</span>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <div
          className="panel-section"
          style={{ padding: 20, display: 'flex', flexWrap: 'wrap', gap: 10 }}
        >
          <button
            type="button"
            className="btn btn-danger"
            onClick={emergencyStop}
            disabled={!isLive}
            style={{ flex: '1 1 200px' }}
          >
            🛑 紧急停船
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={returnHome}
            disabled={!isLive}
            style={{ flex: '1 1 200px' }}
          >
            🏠 一键返航
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={releaseBait}
            disabled={!isLive || (state ? state.baitLevel <= 0 : false)}
            style={{ flex: '1 1 200px' }}
          >
            🎣 投饵 {state ? `(${state.baitLevel.toFixed(0)}%)` : ''}
          </button>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginTop: 16,
        }}
      >
        <button
          type="button"
          className={`toggle-btn ${ir ? 'on' : ''}`}
          onClick={toggleIr}
          aria-pressed={ir}
          disabled={!isLive}
        >
          <span className="toggle-icon">◉</span> 红外线 {ir ? 'ON' : 'OFF'}
        </button>
        <button
          type="button"
          className={`toggle-btn ${light ? 'on' : ''}`}
          onClick={toggleLight}
          aria-pressed={light}
          disabled={!isLive}
        >
          <span className="toggle-icon">☀</span> 补光 {light ? 'ON' : 'OFF'}
        </button>
      </section>

      <p className="muted" style={{ marginTop: 24, fontSize: 12 }}>
        注：当前 Cognito unauth 角色允许任何访客操控，仅 v1 演示。生产前必须切到 Auth0 认证后的 Identity Pool。
      </p>
    </main>
  );
}

type DPadProps = {
  isLive: boolean;
  onChange: (throttle: number, rudder: number) => void;
};

function DPad({ isLive, onChange }: DPadProps) {
  const pressedRef = (typeof window !== 'undefined'
    ? (window as unknown as { __sienovoDpad?: Set<string> }).__sienovoDpad ??=
        new Set<string>()
    : new Set<string>()) as Set<string>;

  const update = () => {
    const t = pressedRef.has('up') ? 1 : pressedRef.has('down') ? -1 : 0;
    const r = pressedRef.has('right') ? 1 : pressedRef.has('left') ? -1 : 0;
    onChange(t, r);
  };

  const press =
    (key: 'up' | 'down' | 'left' | 'right' | 'stop') =>
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (key === 'stop') {
        pressedRef.clear();
        onChange(0, 0);
        return;
      }
      pressedRef.add(key);
      update();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    };

  const release =
    (key: 'up' | 'down' | 'left' | 'right' | 'stop') =>
    () => {
      if (key === 'stop') return;
      pressedRef.delete(key);
      update();
    };

  const btn = (
    label: string,
    key: 'up' | 'down' | 'left' | 'right' | 'stop',
    style?: React.CSSProperties,
  ) => (
    <button
      type="button"
      disabled={!isLive}
      onPointerDown={press(key)}
      onPointerUp={release(key)}
      onPointerCancel={release(key)}
      onPointerLeave={release(key)}
      style={{
        width: 72,
        height: 72,
        fontSize: 28,
        fontWeight: 700,
        borderRadius: 12,
        border: '1px solid #d1d5db',
        background: key === 'stop' ? '#fee2e2' : '#f3f4f6',
        color: key === 'stop' ? '#dc2626' : '#111827',
        cursor: isLive ? 'pointer' : 'not-allowed',
        opacity: isLive ? 1 : 0.4,
        userSelect: 'none',
        touchAction: 'none',
        ...style,
      }}
      aria-label={label}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 72px)',
        gridTemplateRows: 'repeat(3, 72px)',
        gap: 8,
        justifyContent: 'center',
      }}
    >
      <div />
      {btn('▲', 'up')}
      <div />
      {btn('◀', 'left')}
      {btn('⏹', 'stop')}
      {btn('▶', 'right')}
      <div />
      {btn('▼', 'down')}
      <div />
    </div>
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
