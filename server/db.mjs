import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Run with `pnpm server` (which loads .env.local) or export it manually.',
  );
}

export const sql = neon(process.env.DATABASE_URL);

export const DEFAULT_CONFIG_TEMPLATE = [
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

const VALID_TYPES = new Set(['text', 'number', 'option', 'toggle']);

export function normalizeConfig(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const key = String(raw.key ?? '').trim();
    const label = String(raw.label ?? '').trim();
    const type = String(raw.type ?? '').trim();
    if (!key || !label || !VALID_TYPES.has(type)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    const item = { key, label, type, value: raw.value };
    if (raw.unit) item.unit = String(raw.unit);
    if (raw.placeholder) item.placeholder = String(raw.placeholder);
    if (type === 'option' && Array.isArray(raw.options)) {
      item.options = raw.options.map((o) => String(o));
    }
    if (type === 'toggle') item.value = Boolean(raw.value);
    if (type === 'number') item.value = Number(raw.value) || 0;
    if (type === 'text') item.value = String(raw.value ?? '');
    out.push(item);
  }
  return out;
}

export async function initSchema() {
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
}

export async function listBoats() {
  return await sql`
    SELECT id, name, "group", notes, config, created_at
    FROM boats
    ORDER BY created_at DESC
  `;
}

export async function getBoat(id) {
  const rows = await sql`
    SELECT id, name, "group", notes, config, created_at
    FROM boats
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createBoat({ id, name, group, notes, config }) {
  const cfg = config && config.length > 0 ? config : DEFAULT_CONFIG_TEMPLATE;
  const rows = await sql`
    INSERT INTO boats (id, name, "group", notes, config)
    VALUES (
      ${id},
      ${name},
      ${group ?? ''},
      ${notes ?? ''},
      ${JSON.stringify(cfg)}::jsonb
    )
    RETURNING id, name, "group", notes, config, created_at
  `;
  return rows[0];
}

export async function deleteBoat(id) {
  const rows = await sql`
    DELETE FROM boats WHERE id = ${id}
    RETURNING id
  `;
  return rows.length > 0;
}
