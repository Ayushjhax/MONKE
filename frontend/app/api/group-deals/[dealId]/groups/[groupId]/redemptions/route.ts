import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { pool, initializeDatabase } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ dealId: string; groupId: string }> }) {
  try {
    await initializeDatabase();
    const { groupId } = await params;
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    if (!wallet) return NextResponse.json({ error: 'wallet is required' }, { status: 400 });

    const client = await pool.connect();
    try {
      const rows = await client.query(
        `SELECT redemption_code, qr_payload, status, issued_at, redeemed_at
         FROM group_deal_redemptions WHERE group_id = $1 AND user_wallet = $2`,
        [Number(groupId), wallet]
      );
      return NextResponse.json({ wallet, redemptions: rows.rows });
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch redemptions' }, { status: 400 });
  }
}

