import Link from 'next/link';
import { LogoLockup } from './_components/Logo';

const apps = [
  {
    href: '/boats',
    title: 'Boat Management',
    titleZh: '船队管理',
    description:
      '集中管理船队：在线状态、电量信号、归属分组、航迹回放与告警记录。点击单艘船进入"状态仪表盘"或"操作仪表盘"。',
    status: 'live' as const,
    phase: 'v1',
  },
  {
    href: '/boat-simulator',
    title: 'Browser Simulator (Legacy)',
    titleZh: '浏览器内置模拟器（旧版，待迁移）',
    description:
      'v0 时期内置在浏览器的模拟船 + 中控台。新架构下已被 Node 模拟船 (simulator/boat.mjs) + AWS IoT Core 取代，保留此入口仅作回归对比。',
    status: 'live' as const,
    phase: 'v1',
  },
  {
    href: '#mobile-app',
    title: 'Mobile Controller',
    titleZh: '移动 App（与中控台同源）',
    description:
      'iOS / Android 客户端，与 Web 中控台共享同一套 API，外勤遥控、查看视频与告警，随手即用。',
    status: 'pending' as const,
    phase: 'v1',
  },
  {
    href: '/cloud-backend',
    title: 'Cloud Backend',
    titleZh: '云端控制服务（AWS IoT Core）',
    description:
      'AWS IoT Core 托管 MQTT broker（ap-east-1，香港）；船端 X.509 证书直连，浏览器经 Cognito 临时凭证签 SigV4 走 WSS。点击查看实时连通性 / 船队心跳。',
    status: 'live' as const,
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
  {
    icon: '📶',
    title: '无蜂窝信号区域作业',
    desc: '深山水库 / 偏远湖泊 4G 不稳，依赖本地遥控盒子（ESP32 + BLE + 433MHz），手机直连 300m 内可控；规划中。',
    audience: '水库 / 山区 / 应急（v2 Coming Soon）',
  },
];

const capabilities = [
  {
    group: '感知传感',
    items: [
      { icon: '📡', name: 'GPS 定位', desc: '高精度卫星定位，支持航迹回放与电子围栏。' },
      { icon: '📏', name: '水深探测', desc: '实时回传所在点位水深，配合声呐识别水下地形。' },
      { icon: '🌡️', name: '水温监测', desc: '随船记录水面与浅层水温，洞察鱼群活动规律。' },
    ],
  },
  {
    group: '视觉摄像',
    items: [
      { icon: '🎥', name: '摄像头控制', desc: '云台远程调节俯仰与航向，对准目标随时抓拍。' },
      { icon: '🌙', name: '红外夜视', desc: '红外感光模式，无光环境也能看清水面与岸边。' },
      { icon: '💡', name: 'LED 补光', desc: '可调亮度补光灯，弱光场景下补足画面与作业照明。' },
    ],
  },
  {
    group: '作业控制',
    items: [
      { icon: '🎯', name: '定点打窝', desc: '在地图上选点，船自动巡航至窝点投放饵料并返航。' },
      { icon: '📍', name: '钓点 / 船点收藏', desc: '记录鱼窝、地形、好钓位，多次出钓持续复用。' },
      { icon: '⚙️', name: '电机控制与状态', desc: '正反转、油门、转速实时显示，过流过热自动保护。' },
    ],
  },
];

const channels = [
  {
    name: '主链路（v1 第一期）',
    purpose: '一条 4G 链路统一承载控制 + 遥测 + 视频',
    accent: 'blue' as const,
    badge: '第一期',
    nodes: [
      { label: 'App + 中控台', sub: '移动端 + Web 端' },
      { label: '云端服务', sub: 'MQTT + RTMP' },
      { label: '无人船', sub: '4G + 摄像头' },
    ],
    links: [
      { tech: '4G / WiFi', range: '任意有网处' },
      { tech: '4G 蜂窝', range: '任意有信号处' },
    ],
  },
];

export default function HomePage() {
  return (
    <main className="home">
      <header className="home-hero">
        <div className="home-hero-inner">
          <LogoLockup size={36} className="home-eyebrow" />
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
          <h2>船端能力</h2>
          <span className="home-section-meta">
            {capabilities.reduce((n, g) => n + g.items.length, 0)} 项功能 · 全在第一期
          </span>
        </div>
        <div className="capability-stack">
          {capabilities.map((group) => (
            <div key={group.group} className="capability-group">
              <h3 className="capability-group-name">{group.group}</h3>
              <div className="capability-grid">
                {group.items.map((item) => (
                  <div key={item.name} className="capability-item">
                    <span className="capability-icon" aria-hidden>{item.icon}</span>
                    <div className="capability-body">
                      <div className="capability-name">{item.name}</div>
                      <div className="capability-desc">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                  {app.status === 'live' ? '在线' : '规划中'}
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
        <span>WebSocket 信令服务运行于 :5001</span>
      </footer>
    </main>
  );
}
