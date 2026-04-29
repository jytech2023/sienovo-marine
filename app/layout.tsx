import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Sienovo Marine · 水面无人船一体化方案',
    template: '%s | Sienovo Marine',
  },
  description:
    '面向钓场、水务、环保、养殖、应急等行业的水面无人船一体化方案：手机 App + 长距遥控 + 船端控制，让水面作业更省人、更安全。',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
