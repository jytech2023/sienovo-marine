'use client';

import { useEffect, useState } from 'react';

export type ConfigType = 'text' | 'number' | 'option' | 'toggle';

export type ConfigItem = {
  key: string;
  label: string;
  type: ConfigType;
  value: string | number | boolean;
  unit?: string;
  options?: string[];
  placeholder?: string;
};

export const DEFAULT_CONFIG_TEMPLATE: ConfigItem[] = [
  { key: 'model', label: '型号', type: 'text', value: '', placeholder: '如 DW001' },
  { key: 'waterDepth', label: '水深', type: 'number', value: 20, unit: '米' },
  { key: 'waterTemp', label: '水温', type: 'number', value: 20, unit: '摄氏度' },
  { key: 'longitude', label: '经度', type: 'number', value: 112, unit: '度' },
  {
    key: 'baitStatus',
    label: '投料状态',
    type: 'option',
    value: '未开始',
    options: ['未开始', '进行中', '已完成'],
  },
  { key: 'ir', label: '红外线', type: 'toggle', value: false },
  { key: 'light', label: '补光', type: 'toggle', value: false },
  { key: 'autoBait', label: '定点打窝', type: 'toggle', value: false },
];

export type BoatSummary = {
  id: string;
  name: string;
  group: string;
  notes: string;
  config: ConfigItem[];
  createdAt: string | null;
  lat: number;
  lng: number;
  battery: number;
  signal: number;
  baitLevel: number;
  distance: number;
  isOnline: boolean;
};

export type CreateBoatInput = {
  id: string;
  name: string;
  group?: string;
  notes?: string;
  config?: ConfigItem[];
};

export async function createBoat(input: CreateBoatInput) {
  const res = await fetch('/api/boats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }
  return data.boat as BoatSummary;
}

export async function deleteBoat(id: string) {
  const res = await fetch(`/api/boats/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }
}

export function useBoats(intervalMs = 3000) {
  const [boats, setBoats] = useState<BoatSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;

    const fetchBoats = async () => {
      try {
        const res = await fetch('/api/boats');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { boats: BoatSummary[] };
        if (!cancelled) {
          setBoats(data.boats ?? []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'fetch failed');
      }
    };

    fetchBoats();
    const id = setInterval(fetchBoats, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs, refreshKey]);

  return { boats, error, refresh };
}
