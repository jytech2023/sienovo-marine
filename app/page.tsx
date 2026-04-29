import Link from 'next/link';

const apps = [
  {
    href: '/boat-simulator',
    title: 'Boat Simulator',
    titleZh: '船只模拟器',
    description: '基于 WebSocket 的虚拟船端，用于在没有实船时联调遥测、控制与航点逻辑。',
    status: 'live' as const,
    phase: 'v1',
  },
  {
    href: '#mobile-app',
    title: 'Mobile Controller',
    titleZh: '移动遥控 App',
    description:
      'iOS / Android 应用，通过 4G/WiFi 连接云端，下发航点与摇杆指令、查看实时画面与遥测。',
    status: 'pending' as const,
    phase: 'v1',
  },
  {
    href: '#cloud-backend',
    title: 'Cloud Backend',
    titleZh: '云端控制服务',
    description:
      'MQTT / WebSocket 信令 + RTMP / WebRTC 图传中转，统一管理设备接入、用户权限、轨迹与告警。',
    status: 'pending' as const,
    phase: 'v1',
  },
  {
    href: '#boat-firmware',
    title: 'Boat Firmware',
    titleZh: '船端固件',
    description:
      'MCU + 4G 模组 + GPS + 摄像头，接收云端指令、推送遥测与视频，链路丢失自动停船。',
    status: 'pending' as const,
    phase: 'v1',
  },
  {
    href: '#live-stream',
    title: 'Live Stream',
    titleZh: '云端图传服务',
    description:
      '船端 4G 直推 RTMP / WebRTC 至云服务器，App 拉流播放，支持多人观看与历史回放。',
    status: 'pending' as const,
    phase: 'v1',
  },
  {
    href: '#bridge-firmware',
    title: 'Bridge Firmware',
    titleZh: '遥控盒子固件',
    description:
      'Coming Soon · ESP32 + CC1101 + BLE，提供本地 300m 长距遥控通道，应对无蜂窝信号的水库山区。',
    status: 'planned' as const,
    phase: 'v2',
  },
];

const scenarios = [
  {
    icon: '🎣',
    title: '钓鱼定点投饵',
    desc: '在岸边或船上用手机选定坐标，无人船自动巡航至窝点投放饵料，回程归位。',
    audience: '休闲垂钓 / 钓场运营',
  },
  {
    icon: '🏞️',
    title: '水库 / 湖泊巡检',
    desc: '按预设航线自主巡航，实时回传水面影像与 GPS 轨迹，发现漂浮物或异常即推送告警。',
    audience: '水务 / 景区 / 园林',
  },
  {
    icon: '💧',
    title: '水质采样监测',
    desc: '搭载传感器在不同点位自动采样温度、溶氧、pH、浊度，数据回传云端生成报告。',
    audience: '环保 / 科研 / 环境评估',
  },
  {
    icon: '🐟',
    title: '水产养殖巡塘',
    desc: '替代人工划船巡塘，自动定时投饵、观察鱼群活动、记录水温溶氧，节省人力。',
    audience: '水产养殖场',
  },
  {
    icon: '🚨',
    title: '水面应急辅助',
    desc: '遥控前出至落水点抛投救生圈或绳索，争取救援黄金时间，减少救援人员入水风险。',
    audience: '应急 / 救援 / 景区安保',
  },
  {
    icon: '🛰️',
    title: '水文 / 测绘作业',
    desc: '替代有人作业船完成浅水测深、岸线测绘、航道勘察，进入大船无法靠近的浅滩与水草区。',
    audience: '水利 / 测绘 / 工勘',
  },
];

const channels = [
  {
    name: '主链路（v1 第一期）',
    purpose: '一条 4G 链路统一承载控制 + 遥测 + 视频',
    accent: 'blue' as const,
    badge: '第一期',
    nodes: [
      { label: '手机 App', sub: '操控 + 直播' },
      { label: '云端服务', sub: 'MQTT + RTMP' },
      { label: '无人船', sub: '4G + 摄像头' },
    ],
    links: [
      { tech: '4G / WiFi', range: '任意有网处' },
      { tech: '4G 蜂窝', range: '任意有信号处' },
    ],
  },
  {
    name: '增强链路（Coming Soon）',
    purpose: '本地低延迟通道，无蜂窝信号场景的兜底',
    accent: 'cyan' as const,
    badge: 'Coming Soon',
    nodes: [
      { label: '手机 App', sub: '本地摇杆' },
      { label: '遥控盒子', sub: '随身 / 岸边' },
      { label: '无人船', sub: '执行指令' },
    ],
    links: [
      { tech: 'BLE 蓝牙', range: '随身 ~30m' },
      { tech: '433MHz', range: '视距 300m+' },
    ],
  },
];

export default function HomePage() {
  return (
    <main className="home">
      <header className="home-hero">
        <div className="home-hero-inner">
          <span className="home-eyebrow">Sienovo Marine</span>
          <h1>让一台无人船，胜过三个人</h1>
          <p className="home-tagline">
            围绕饵料船、巡检船、采样船等水面无人作业场景，提供从手机遥控、远距通信到船端控制的一体化方案，
            让钓场、水务、环保、养殖、应急等行业更省人、更安全。
          </p>
        </div>
      </header>

      <section className="home-section">
        <div className="home-section-head">
          <h2>典型应用场景</h2>
          <span className="home-section-meta">{scenarios.length} 个行业场景</span>
        </div>
        <div className="scenario-grid">
          {scenarios.map((s) => (
            <article key={s.title} className="scenario-card">
              <div className="scenario-icon" aria-hidden>{s.icon}</div>
              <h3 className="scenario-title">{s.title}</h3>
              <p className="scenario-desc">{s.desc}</p>
              <div className="scenario-audience">{s.audience}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <h2>它是怎么工作的</h2>
          <span className="home-section-meta">第一期单链路 · 本地兜底 Coming Soon</span>
        </div>
        <div className="channel-stack">
          {channels.map((ch) => (
            <div key={ch.name} className={`channel channel-${ch.accent}`}>
              <div className="channel-head">
                <span className="channel-name">{ch.name}</span>
                <span className="channel-purpose">{ch.purpose}</span>
              </div>
              <div className="arch-diagram">
                {ch.nodes.map((node, i) => (
                  <div key={node.label} className="arch-step">
                    <div className="arch-node">
                      <div className="arch-node-label">{node.label}</div>
                      <div className="arch-node-sub">{node.sub}</div>
                    </div>
                    {i < ch.links.length && (
                      <div className="arch-link">
                        <span className="arch-link-tech">{ch.links[i].tech}</span>
                        <span className="arch-link-range">{ch.links[i].range}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="arch-note">
          第一期专注 4G 云端方案：一条链路打通控制、遥测和视频，硬件最简、量产最快、远程多人协作天然支持。
          BLE + 433MHz 的本地链路作为后续加强方案（Coming Soon），覆盖深山水库等无蜂窝信号场景，不影响第一期上线节奏。
        </p>
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <h2>模块入口</h2>
          <span className="home-section-meta">
            第一期 {apps.filter((a) => a.phase === 'v1').length} 个 · Coming Soon {apps.filter((a) => a.phase === 'v2').length} 个
          </span>
        </div>
        <div className="home-grid">
          {apps.map((app) => (
            <Link key={app.href} href={app.href} className="home-card">
              <div className="home-card-head">
                <h3>{app.title}</h3>
                <span className={`home-card-status ${app.status}`}>
                  {app.status === 'live'
                    ? '在线'
                    : app.status === 'planned'
                      ? 'Coming Soon'
                      : '规划中'}
                </span>
              </div>
              <p className="home-card-zh">
                {app.titleZh}
                <span className={`home-card-phase phase-${app.phase}`}>{app.phase}</span>
              </p>
              <p className="home-card-desc">{app.description}</p>
              <span className="home-card-cta">
                {app.status === 'live' ? '进入 →' : '查看设计 →'}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="home-footer">
        <span>© Sienovo Marine</span>
        <span className="home-footer-sep">·</span>
        <span>WebSocket 信令服务运行于 :5000</span>
      </footer>
    </main>
  );
}
