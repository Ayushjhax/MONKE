import { NextRequest, NextResponse } from 'next/server';
import { fetchUserMetrics, scoreFromMetrics } from '@/lib/reputation';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest, ctx: { params: Promise<{ wallet: string }> }) {
  const { wallet } = await ctx.params;
  try {
    const metrics = await fetchUserMetrics(wallet);
    const { points, level, badges } = scoreFromMetrics(metrics);

    // Upsert into user_social_profiles keyed by wallet address
    const client = await pool.connect();
    try {
      await client.query(
        `
        INSERT INTO user_social_profiles (user_wallet, reputation_points, reputation_level, badges, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, NOW())
        ON CONFLICT (user_wallet) 
        DO UPDATE SET reputation_points = $2, reputation_level = $3, badges = $4::jsonb, updated_at = NOW()
      `,
        [wallet, points, level, JSON.stringify(badges)]
      );
    } finally {
      client.release();
    }

    return NextResponse.json({ wallet, points, level, badges, metrics });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'failed' }, { status: 500 });
  }
}


