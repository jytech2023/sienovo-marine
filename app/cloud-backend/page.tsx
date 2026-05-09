'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { LogoLockup } from '../_components/Logo';
import { useFleetState } from '@/lib/useFleetState';
import { useBoats } from '@/lib/useBoats';

const ENDPOINT = process.env.NEXT_PUBLIC_IOT_ENDPOINT ?? '(NEXT_PUBLIC_IOT_ENDPOINT not set)';
const REGION = process.env.NEXT_PUBLIC_AWS_REGION ?? '(NEXT_PUBLIC_AWS_REGION not set)';

const REGION_INFO: Record<string, string> = {
  'ap-east-1': '香港 (Hong Kong)',
  'ap-northeast-1': '东京 (Tokyo)',
  'ap-southeast-1': '新加坡 (Singapore)',
  'us-east-1': '弗吉尼亚 (N. Virginia)',
  'us-west-2': '俄勒冈 (Oregon)',
  'cn-north-1': '北京 (Beijing) — AWS China',
  'cn-northwest-1': '宁夏 (Ningxia) — AWS China',
};
const REGION_CITY = REGION_INFO[REGION] ?? '';
const POOL_ID =
  process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID ??
  '(NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID not set)';

type Probe = {
  state: 'pending' | 'ok' | 'fail';
  message?: string;
  latencyMs?: number;
};

export default function CloudBackendPage() {
  const { boats, error: dbError } = useBoats(60_000);
  const { stateById, errorMessage: liveError } = useFleetState();
  const [probe, setProbe] = useState<Probe>({ state: 'pending' });

  const now = Date.now();
  const onlineBoats = useMemo(
    () =>
      Object.values(stateById).filter(
        (s) => s.isOnline && now - s.lastSeen < 5000,
      ),
    [stateById, now],
  );

  // Lightweight reachability probe: HTTPS HEAD on broker endpoint.
  useEffect(() => {
    let cancelled = false;
    const t0 = performance.now();
    fetch(`https://${ENDPOINT}/`, { method: 'GET', mode: 'no-cors' })
      .then(() => {
        if (cancelled) return;
        const ms = Math.round(performance.now() - t0);
        setProbe({ state: 'ok', latencyMs: ms });
      })
      .catch((e) => {
        if (cancelled) return;
        setProbe({
          state: 'fail',
          message: e instanceof Error ? e.message : 'unknown',
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const lastSeenById = Object.fromEntries(
    Object.entries(stateById).map(([id, s]) => [id, s.lastSeen]),
  );

  return (
    <main className="boats-page">
      <header className="boats-header">
        <Link href="/" className="boats-back">
          <LogoLockup size={20} />
        </Link>
        <h1 className="boats-title">Cloud Backend · 后台状态</h1>
      </header>

      <div className="boats-banner">
        <span className="boats-banner-tag">live</span>
        <span>
          AWS IoT Core 托管 MQTT broker — region <b>{REGION}</b>{REGION_CITY ? ` · ${REGION_CITY}` : ''}。本页通过浏览器连通性探测 + DB / MQTT 实际数据综合呈现。
        </span>
      </div>

      <section className="boats-stats">
        <Card
          label="MQTT broker"
          value={probeBadge(probe)}
          hint={probe.latencyMs != null ? `${probe.latencyMs}ms` : '—'}
        />
        <Card
          label="注册船只"
          value={dbError ? '?' : String(boats.length)}
          hint={dbError ? 'DB 错' : '来自 Postgres'}
        />
        <Card
          label="在线船只"
          value={liveError ? '?' : String(onlineBoats.length)}
          hint={liveError ? 'MQTT 错' : '5s 心跳窗口'}
          tone={onlineBoats.length > 0 ? 'green' : undefined}
        />
        <Card
          label="离线"
          value={String(Math.max(0, boats.length - onlineBoats.length))}
          hint="待恢复"
          tone={boats.length - onlineBoats.length > 0 ? 'orange' : undefined}
        />
      </section>

      <section
        className="panel-section"
        style={{ padding: 16, marginTop: 16 }}
      >
        <h3>云端配置</h3>
        <table style={{ width: '100%', fontSize: 14 }}>
          <tbody>
            <Row label="Region">
              <code>{REGION}</code>
              {REGION_CITY && <span style={{ marginLeft: 8, color: '#6b7280' }}>· {REGION_CITY}</span>}
              <span style={{ marginLeft: 8, color: '#6b7280', fontSize: 12 }}>
                到深圳 ~10-30ms · 到杭州 ~40-50ms
              </span>
            </Row>
            <Row label="MQTT broker">
              <code>{ENDPOINT}</code>
            </Row>
            <Row label="WSS port">
              <code>443</code> · 浏览器 SigV4 + Cognito unauth
            </Row>
            <Row label="MQTT/TLS port">
              <code>8883</code> · 船端 X.509 证书
            </Row>
            <Row label="Cognito Identity Pool">
              <code>{POOL_ID}</code>
            </Row>
            <Row label="Topic 命名">
              <code>sienovo/boats/{'{boatId}'}/{'{state|event|camera|control}'}</code>
            </Row>
          </tbody>
        </table>
      </section>

      <section
        className="panel-section"
        style={{ padding: 16, marginTop: 16 }}
      >
        <h3>船只健康</h3>
        {boats.length === 0 ? (
          <p className="muted">DB 中无注册船只。</p>
        ) : (
          <div className="boats-table-wrap">
            <table className="boats-table">
              <thead>
                <tr>
                  <th>船只</th>
                  <th>状态</th>
                  <th>电量</th>
                  <th>信号</th>
                  <th>最后心跳</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {boats.map((b) => {
                  const live = stateById[b.id];
                  const online = !!live && live.isOnline && now - live.lastSeen < 5000;
                  const battery = live?.battery ?? 0;
                  const signal = live?.signal ?? 0;
                  const lastSeen = lastSeenById[b.id];
                  return (
                    <tr key={b.id}>
                      <td>
                        <div className="boat-name-cell">{b.name}</div>
                        <div className="boat-id-sub">{b.id}</div>
                      </td>
                      <td>
                        <span
                          className={`boat-list-status ${online ? 'online' : 'offline'}`}
                        >
                          {online ? '在线' : '离线'}
                        </span>
                      </td>
                      <td className={online ? '' : 'muted'}>
                        {online ? `${battery.toFixed(0)}%` : '—'}
                      </td>
                      <td className={online ? '' : 'muted'}>
                        {online ? signal.toFixed(0) : '—'}
                      </td>
                      <td className="muted">
                        {lastSeen ? formatAgo(now - lastSeen) : '从未上线'}
                      </td>
                      <td>
                        <Link
                          href={`/boats/${encodeURIComponent(b.id)}/status`}
                          className="boat-action"
                        >
                          详情
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(dbError || liveError) && (
        <div className="boats-error" style={{ marginTop: 16 }}>
          {dbError && <div>DB 错误：{dbError}</div>}
          {liveError && <div>MQTT 错误：{liveError}</div>}
        </div>
      )}
    </main>
  );
}

function Card({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  tone?: 'green' | 'orange' | 'red';
}) {
  const valueClass = tone ?? '';
  return (
    <div className="stat-block">
      <div className="stat-block-label">{label}</div>
      <div className={`stat-block-value ${valueClass}`}>{value}</div>
      <div className="stat-block-hint">{hint}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <td
        style={{ padding: '6px 12px 6px 0', color: '#6b7280', whiteSpace: 'nowrap' }}
      >
        {label}
      </td>
      <td style={{ padding: '6px 0' }}>{children}</td>
    </tr>
  );
}

function probeBadge(p: Probe): React.ReactNode {
  if (p.state === 'ok') return '✓ OK';
  if (p.state === 'fail') return '✗ 失败';
  return '⌛ 探测中';
}

function formatAgo(ms: number): string {
  if (ms < 1500) return '刚刚';
  if (ms < 60_000) return `${Math.floor(ms / 1000)}秒前`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}分钟前`;
  return `${Math.floor(ms / 3_600_000)}小时前`;
}
