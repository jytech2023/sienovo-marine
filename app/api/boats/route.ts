import { NextResponse } from 'next/server';
import {
  createBoatRecord,
  getBoat,
  listBoats,
  normalizeConfig,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

const ID_PATTERN = /^[A-Za-z0-9_-]{2,32}$/;

export async function GET() {
  const records = await listBoats();
  const list = records.map((r) => ({
    id: r.id,
    name: r.name,
    group: r.group,
    notes: r.notes,
    config: r.config ?? [],
    createdAt: r.created_at,
    lat: 0,
    lng: 0,
    battery: 0,
    signal: 0,
    baitLevel: 0,
    distance: 0,
    isOnline: false,
  }));
  return NextResponse.json({ boats: list, count: list.length });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const id = String(body.id ?? '').trim();
  const name = String(body.name ?? '').trim();

  if (!ID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: 'id 须为 2-32 位字母/数字/下划线/连字符' },
      { status: 400 },
    );
  }
  if (!name) {
    return NextResponse.json({ error: 'name 不能为空' }, { status: 400 });
  }

  const existing = await getBoat(id);
  if (existing) {
    return NextResponse.json(
      { error: `船只 ID "${id}" 已存在` },
      { status: 409 },
    );
  }

  const config = normalizeConfig(body.config);
  const record = await createBoatRecord({
    id,
    name,
    group: String(body.group ?? '').trim(),
    notes: String(body.notes ?? '').trim(),
    config: config.length > 0 ? config : null,
  });

  return NextResponse.json(
    {
      boat: {
        id: record.id,
        name: record.name,
        group: record.group,
        notes: record.notes,
        config: record.config,
        createdAt: record.created_at,
      },
    },
    { status: 201 },
  );
}
