import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { pool, initializeDatabase } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    await initializeDatabase();
    const { dealId } = await params;
    const { wallet, expires_at } = await request.json();
    const trimmedWallet = typeof wallet === 'string' ? wallet.trim() : '';
    if (!trimmedWallet) return NextResponse.json({ error: 'wallet is required' }, { status: 400 });

    const expiresAtDate = expires_at ? new Date(expires_at) : new Date(Date.now() + 30 * 60 * 1000);

    const client = await pool.connect();
    try {
      // Ensure deal exists and is active
      const dealRes = await client.query('SELECT id FROM group_deals WHERE id = $1 AND status = $2', [Number(dealId), 'active']);
      if (!dealRes.rows[0]) return NextResponse.json({ error: 'deal not found or inactive' }, { status: 404 });

      const invite = Math.random().toString(36).slice(2, 10).toUpperCase();
      const res = await client.query(
        `INSERT INTO group_deal_groups (group_deal_id, host_wallet, invite_code, expires_at)
         VALUES ($1,$2,$3,$4) RETURNING id, invite_code, status, current_tier_rank, current_discount_percent, participants_count, total_pledged, created_at`,
        [Number(dealId), trimmedWallet, invite, expiresAtDate]
      );
      return NextResponse.json({
        group_id: res.rows[0].id,
        invite_code: res.rows[0].invite_code,
        status: res.rows[0].status,
        current_tier_rank: res.rows[0].current_tier_rank,
        current_discount_percent: res.rows[0].current_discount_percent,
        participants_count: res.rows[0].participants_count,
        total_pledged: res.rows[0].total_pledged,
        created_at: res.rows[0].created_at,
        expires_at: expiresAtDate.toISOString()
      });
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create group instance' }, { status: 400 });
  }
}
