import { neon } from '@neondatabase/serverless';
import type { ConfigItem, ConfigType } from './useBoats';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export const sql = neon(process.env.DATABASE_URL);

export type BoatRecord = {
  id: string;
  name: string;
  group: string;
  notes: string;
  config: ConfigItem[];
  created_at: string;
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

const VALID_TYPES = new Set<ConfigType>(['text', 'number', 'option', 'toggle']);

export function normalizeConfig(input: unknown): ConfigItem[] {
  if (!Array.isArray(input)) return [];
  const out: ConfigItem[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const key = String(r.key ?? '').trim();
    const label = String(r.label ?? '').trim();
    const type = String(r.type ?? '').trim() as ConfigType;
    if (!key || !label || !VALID_TYPES.has(type)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    const item: ConfigItem = { key, label, type, value: '' };
    if (typeof r.unit === 'string') item.unit = r.unit;
    if (typeof r.placeholder === 'string') item.placeholder = r.placeholder;
    if (type === 'option' && Array.isArray(r.options)) {
      item.options = (r.options as unknown[]).map((o) => String(o));
      item.value = String(r.value ?? item.options[0] ?? '');
    } else if (type === 'toggle') {
      item.value = Boolean(r.value);
    } else if (type === 'number') {
      item.value = Number(r.value) || 0;
    } else {
      item.value = String(r.value ?? '');
    }
    out.push(item);
  }
  return out;
}

let schemaReady: Promise<void> | null = null;
export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS boats (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          "group" TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        ALTER TABLE boats
        ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '[]'::jsonb
      `;
    })();
  }
  return schemaReady;
}

export async function listBoats(): Promise<BoatRecord[]> {
  await ensureSchema();
  const rows = await sql`
    SELECT id, name, "group", notes, config, created_at
    FROM boats
    ORDER BY created_at DESC
  ` as BoatRecord[];
  return rows;
}

export async function getBoat(id: string): Promise<BoatRecord | null> {
  await ensureSchema();
  const rows = await sql`
    SELECT id, name, "group", notes, config, created_at
    FROM boats
    WHERE id = ${id}
    LIMIT 1
  ` as BoatRecord[];
  return rows[0] ?? null;
}

export async function createBoatRecord(input: {
  id: string;
  name: string;
  group?: string;
  notes?: string;
  config?: ConfigItem[] | null;
}): Promise<BoatRecord> {
  await ensureSchema();
  const cfg = input.config && input.config.length > 0 ? input.config : DEFAULT_CONFIG_TEMPLATE;
  const rows = await sql`
    INSERT INTO boats (id, name, "group", notes, config)
    VALUES (
      ${input.id},
      ${input.name},
      ${input.group ?? ''},
      ${input.notes ?? ''},
      ${JSON.stringify(cfg)}::jsonb
    )
    RETURNING id, name, "group", notes, config, created_at
  ` as BoatRecord[];
  return rows[0];
}

export async function deleteBoatRecord(id: string): Promise<boolean> {
  await ensureSchema();
  const rows = await sql`
    DELETE FROM boats WHERE id = ${id}
    RETURNING id
  ` as { id: string }[];
  return rows.length > 0;
}
