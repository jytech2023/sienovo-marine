import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'App 下载 · 打窝船遥控',
  description:
    '下载 Sienovo Marine 打窝船遥控 App（Android）。支持 R2 高速 / GitHub / Expo 三个下载镜像，含安装说明。',
};

// ⚠️ 发版后只需改这两行:VERSION,以及 EAS_ARTIFACT(它是构建哈希,无法从版本号推导)。
// R2 与 GitHub 的下载地址都从 VERSION 派生 —— 以前是四处硬编码,漏改一处
// 用户就会下到旧版本的 APK。
const VERSION = 'v0.1.4';
const APK_NAME = `sienovo-marine-tencent-${VERSION}.apk`;
const APK_SIZE = '227 MB';

// EAS 构建产物地址(每次构建都是新哈希,取自 CI 日志 / expo.dev 构建页)
const EAS_ARTIFACT =
  'https://expo.dev/artifacts/eas/Rji8gH9M5NStx855--UTUEKbzyjrDKYuLDxolVSTD1M.apk';

const mirrors = [
  {
    label: 'R2 高速下载',
    sub: 'Cloudflare CDN · 推荐',
    href: `https://pub-048dcb96257f476697b113fcb5939cb9.r2.dev/mobile/${APK_NAME}`,
    primary: true,
  },
  {
    label: 'GitHub 下载',
    sub: 'GitHub Releases',
    href: `https://github.com/jytechllc/sienovo-marine-tencent-releases/releases/download/${VERSION}/${APK_NAME}`,
    primary: false,
  },
  {
    label: 'Expo 下载',
    sub: 'EAS 构建产物',
    href: EAS_ARTIFACT,
    primary: false,
  },
];

const steps = [
  '在 Android 手机上点击下方任一「下载」按钮，保存 APK 文件。',
  '首次安装需允许「安装未知来源应用」：打开文件时按系统提示允许即可。',
  '点击下载好的 APK 完成安装。',
  '打开 App → 输入设备号（默认 boat001）→ 点击「连接」。',
];

export default function DownloadPage() {
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
