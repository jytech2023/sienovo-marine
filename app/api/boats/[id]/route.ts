import { NextResponse } from 'next/server';
import { deleteBoatRecord } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteBoatRecord(id);
  if (!ok) {
    return NextResponse.json({ error: '船只不存在' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
