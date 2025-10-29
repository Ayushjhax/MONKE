import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { pool, initializeDatabase } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    await initializeDatabase();
    const { dealId } = await params;
    const client = await pool.connect();
    try {
      const dealRes = await client.query('SELECT * FROM group_deals WHERE id = $1', [Number(dealId)]);
      if (!dealRes.rows[0]) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
      const tiersRes = await client.query('SELECT * FROM group_deal_tiers WHERE group_deal_id = $1 ORDER BY rank ASC', [Number(dealId)]);
      const groupsRes = await client.query(
        `SELECT id, host_wallet, status, current_tier_rank, current_discount_percent, participants_count, total_pledged, expires_at, created_at
         FROM group_deal_groups WHERE group_deal_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [Number(dealId)]
      );
      return NextResponse.json({ deal: dealRes.rows[0], tiers: tiersRes.rows, recent_groups: groupsRes.rows });
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch deal' }, { status: 400 });
  }
}
