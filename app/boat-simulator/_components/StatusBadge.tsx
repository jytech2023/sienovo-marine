'use client';

import type { ConnectionStatus } from '@/lib/types';

const TEXT: Record<ConnectionStatus, string> = {
  offline: '● 未连接',
  online: '● 已上线 等待遥控器',
  connected: '● 遥控器已连接',
};

export function StatusBadge({ status }: { status: ConnectionStatus }) {
  return <span className={`status-badge ${status}`}>{TEXT[status]}</span>;
}
