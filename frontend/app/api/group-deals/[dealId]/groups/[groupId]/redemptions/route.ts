import { NextResponse } from 'next/server';
import { pool, initializeDatabase } from '../../../../../../../lib/db';

export async function GET(req: Request, ctx: { params: Promise<{ dealId: string; groupId: string }> }) {
  const url = new URL(req.url);
  const wallet = url.searchParams.get('wallet') || '';
  if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 });
  await initializeDatabase();
  const { groupId } = await ctx.params;
  const client = await pool.connect();
  try {
    const rows = await client.query(
      `SELECT redemption_code, qr_payload, status, issued_at, redeemed_at
       FROM group_deal_redemptions WHERE group_id = $1 AND user_wallet = $2`,
      [Number(groupId), wallet]
    );
    return NextResponse.json({ wallet, redemptions: rows.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch redemptions' }, { status: 400 });
  } finally {
    client.release();
  }
}


