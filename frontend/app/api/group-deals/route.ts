import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { pool, initializeDatabase } from '@/lib/db';

export async function GET() {
  try {
    await initializeDatabase();
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM group_deals WHERE status = 'active' AND end_at > NOW() ORDER BY created_at DESC`
      );
      return NextResponse.json({ deals: result.rows });
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to list group deals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    const body = await request.json();
    const { deal_title, deal_type, merchant_id, base_price, tier_type, end_at, tiers, min_participants } = body || {};
    if (!deal_title || !deal_type || !merchant_id || base_price == null || !tier_type || !end_at || !Array.isArray(tiers)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ins = await client.query(
        `INSERT INTO group_deals (deal_title, deal_type, merchant_id, base_price, min_participants, end_at, tier_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [deal_title, deal_type, merchant_id, Number(base_price), min_participants ?? 2, new Date(end_at), tier_type]
      );
      const dealId = ins.rows[0].id as number;
      for (const tier of tiers) {
        await client.query(
          `INSERT INTO group_deal_tiers (group_deal_id, threshold, discount_percent, rank) VALUES ($1,$2,$3,$4)`,
          [dealId, tier.threshold, tier.discount_percent, tier.rank]
        );
      }
      await client.query('COMMIT');
      return NextResponse.json({ id: dealId });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create group deal' }, { status: 400 });
  }
}

