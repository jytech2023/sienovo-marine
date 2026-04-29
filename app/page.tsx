import Link from 'next/link';

const apps = [
  {
    href: '/boat-simulator',
    title: 'Boat Simulator',
    titleZh: '船只模拟器',
    description: '实时遥测与控制模拟，与 WebSocket 信令服务器配合运行。',
    status: 'live' as const,
  },
];

export default function HomePage() {
  return (
    <main className="home">
      <header className="home-hero">
        <div className="home-hero-inner">
          <span className="home-eyebrow">Sienovo Marine</span>
          <h1>智能饵料船管理平台</h1>
          <p className="home-tagline">
            集成船端遥测、模拟测试、移动遥控与运维管理的一体化工作台。
          </p>
        </div>
      </header>

      <section className="home-section">
        <div className="home-section-head">
          <h2>应用入口</h2>
          <span className="home-section-meta">{apps.length} 个可用</span>
        </div>
        <div className="home-grid">
          {apps.map((app) => (
            <Link key={app.href} href={app.href} className="home-card">
              <div className="home-card-head">
                <h3>{app.title}</h3>
                <span className={`home-card-status ${app.status}`}>
                  {app.status === 'live' ? '在线' : '准备中'}
                </span>
              </div>
              <p className="home-card-zh">{app.titleZh}</p>
              <p className="home-card-desc">{app.description}</p>
              <span className="home-card-cta">进入 →</span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="home-footer">
        <span>© Sienovo Marine</span>
        <span className="home-footer-sep">·</span>
        <span>WebSocket 信令服务运行于 :3000</span>
      </footer>
    </main>
  );
}
