import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'App 下载 · 打窝船遥控',
  description:
    '下载 Sienovo Marine 打窝船遥控 App（Android）。支持 R2 高速 / GitHub / Expo 三个下载镜像，含安装说明。',
};

// 发版不需要改这个文件。App 仓库的发布流水线(jytechllc/sienovo-marine-mobile-tencent)
// 在打完包后会把 mobile/latest.json 传到 R2,本页在请求时读它。这样新版本会自己
// 出现,不用改代码、不用重新部署。
//
// 尤其是 EAS 产物地址:它是构建哈希,无法从版本号推导 —— 只有云端构建跑完才存在。
// 以前它硬编码在这里,于是每次发版都悄悄指着上一版的 APK。
const R2_BASE = 'https://pub-048dcb96257f476697b113fcb5939cb9.r2.dev';
const MANIFEST_URL = `${R2_BASE}/mobile/latest.json`;

// R2 抓不到时的兜底 —— 页面宁可显示一个旧版本,也不能挂掉。
const FALLBACK: Release = {
  version: 'v0.1.4',
  apkName: 'sienovo-marine-tencent-v0.1.4.apk',
  apkSize: '227 MB',
  mirrors: {
    r2: `${R2_BASE}/mobile/sienovo-marine-tencent-v0.1.4.apk`,
    github:
      'https://github.com/jytechllc/sienovo-marine-tencent-releases/releases/download/v0.1.4/sienovo-marine-tencent-v0.1.4.apk',
    eas: 'https://expo.dev/artifacts/eas/3QUCqBzhdkmEueiFjGqI8JMDM-qfSu-oXxf1PJ6tIwQ.apk',
  },
};

interface Release {
  version: string;
  apkName: string;
  apkSize: string;
  mirrors: { r2: string; github: string; eas: string };
}

// 每 5 分钟回源一次:发版后下载页最多 5 分钟就切到新版本。
export const revalidate = 300;

async function getRelease(): Promise<Release> {
  try {
    const res = await fetch(MANIFEST_URL, { next: { revalidate } });
    if (!res.ok) return FALLBACK;
    const m = (await res.json()) as Partial<Release>;
    // 清单缺字段就整体退回兜底,别拼出一个半残的下载链接给用户。
    if (!m.version || !m.apkName || !m.mirrors?.r2) return FALLBACK;
    return { ...FALLBACK, ...m } as Release;
  } catch {
    return FALLBACK;
  }
}

const steps = [
  '在 Android 手机上点击下方任一「下载」按钮，保存 APK 文件。',
  '首次安装需允许「安装未知来源应用」：打开文件时按系统提示允许即可。',
  '点击下载好的 APK 完成安装。',
  '打开 App → 输入设备号（默认 boat001）→ 点击「连接」。',
];

export default async function DownloadPage() {
  const release = await getRelease();
  const { version: VERSION, apkName: APK_NAME, apkSize: APK_SIZE } = release;

  const mirrors = [
    {
      label: 'R2 高速下载',
      sub: 'Cloudflare CDN · 推荐',
      href: release.mirrors.r2,
      primary: true,
    },
    {
      label: 'GitHub 下载',
      sub: 'GitHub Releases',
      href: release.mirrors.github,
      primary: false,
    },
    {
      label: 'Expo 下载',
      sub: 'EAS 构建产物',
      href: release.mirrors.eas,
      primary: false,
    },
  ];

  return (
    <main className="dl">
      <header className="dl-hero">
        <Link href="/" className="dl-back">← 返回首页</Link>
        <p className="dl-eyebrow">Sienovo Marine · 移动端</p>
        <h1>打窝船遥控 App</h1>
        <p className="dl-tagline">
          手机遥控打窝船：MQTT 控制 + RTSP 实时视频。当前为 {VERSION} 内部测试版（Android）。
        </p>
        <div className="dl-meta">
          <span>Android 8.0+</span>
          <span className="dl-dot">·</span>
          <span>{APK_SIZE}</span>
          <span className="dl-dot">·</span>
          <span>{VERSION}</span>
          <span className="dl-dot">·</span>
          <span>未上架应用商店</span>
        </div>
      </header>

      <section className="dl-download">
        <h2>下载 · {APK_NAME}</h2>
        <p className="dl-download-hint">三个下载镜像，任选其一；R2 通常最快，慢时可换其他镜像。</p>
        <div className="dl-mirrors">
          {mirrors.map((m) => (
            <a
              key={m.href}
              className={`dl-btn${m.primary ? ' dl-btn-primary' : ''}`}
              href={m.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="dl-btn-label">⬇ {m.label}</span>
              <span className="dl-btn-sub">{m.sub}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="dl-shots">
        <figure>
          <img src="/mobile-app/device-picker.png" alt="设备选择界面" loading="lazy" />
          <figcaption>选择设备</figcaption>
        </figure>
        <figure>
          <img src="/mobile-app/controller.png" alt="遥控控制台界面" loading="lazy" />
          <figcaption>控制台</figcaption>
        </figure>
      </section>

      <section className="dl-guide">
        <div className="dl-guide-col">
          <h2>安装步骤</h2>
          <ol className="dl-steps">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
        <div className="dl-guide-col">
          <h2>功能一览</h2>
          <ul className="dl-features">
            <li>🕹 方向控制 + 急停，速度 30 / 60 / 100 档</li>
            <li>🎥 RTSP 实时视频，失败自动重连（3 次后手动刷新）</li>
            <li>🛰 在线 / 离线状态（心跳判定）</li>
            <li>📡 开启 / 停止推流</li>
            <li>🔁 MQTT 断线自动重连</li>
            <li>🎣 预留控件：投饵 / 灯光 / 自动返航 / 云台 / 收放线（未调试）</li>
          </ul>
        </div>
      </section>

      <footer className="dl-footer">
        <span>© Sienovo Marine</span>
        <span className="dl-dot">·</span>
        <span>内部测试版，行为与协议可能变动</span>
      </footer>
    </main>
  );
}
