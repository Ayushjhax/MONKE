import { NextResponse } from 'next/server';
import { getGroupStatus, lockGroup, cancelOrExpireGroup } from '../../../../../../lib/group-deal-service';
import { initializeDatabase } from '../../../../../../lib/db';
import { MOCK_DEALS } from '../../../../../../lib/group-deals-mock';

export async function GET(_req: Request, ctx: { params: Promise<{ dealId: string; groupId: string }> }) {
  try {
    const { dealId, groupId } = await ctx.params;
    const idNum = Number(dealId);
    const grpNum = Number(groupId);
    if (idNum >= 1000 && idNum <= 2000) {
      const deal = MOCK_DEALS.find(d => d.id === idNum);
      const now = Date.now();
      const expiresAt = new Date(now + 1000 * 60 * 30).toISOString();
      return NextResponse.json({
        group: {
          id: grpNum,
          status: 'open',
          expires_at: expiresAt,
          created_at: new Date(now - 1000 * 60 * 5).toISOString(),
          current_tier_rank: 1,
          current_discount_percent: (deal?.tiers?.[0]?.discount_percent || 5),
          participants_count: 4,
          total_pledged: 4,
          deal
        },
        tiers: deal?.tiers || [],
        members: [
          { user_wallet: 'demo_user_1', pledge_units: 1, status: 'pledged', joined_at: new Date(now - 1000 * 60 * 4).toISOString() },
          { user_wallet: 'demo_user_2', pledge_units: 1, status: 'pledged', joined_at: new Date(now - 1000 * 60 * 3).toISOString() },
          { user_wallet: 'demo_user_3', pledge_units: 1, status: 'pledged', joined_at: new Date(now - 1000 * 60 * 2).toISOString() },
          { user_wallet: 'demo_user_4', pledge_units: 1, status: 'pledged', joined_at: new Date(now - 1000 * 60 * 1).toISOString() }
        ],
        progress: {
          participants_count: 4,
          total_pledged: 4,
          current_tier_rank: 1,
          current_discount_percent: (deal?.tiers?.[0]?.discount_percent || 5),
          next_threshold: deal?.tiers?.[1]?.threshold,
          time_left_seconds: 60 * 30
        }
      });
    }
    await initializeDatabase();
    const result = await getGroupStatus(grpNum);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch group' }, { status: 400 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ dealId: string; groupId: string }> }) {
  const path = new URL(req.url).pathname;
  try {
    await initializeDatabase();
    const { groupId } = await ctx.params;
    if (path.endsWith('/lock')) {
      const result = await lockGroup(Number(groupId));
      return NextResponse.json(result);
    }
    if (path.endsWith('/cancel')) {
      const result = await cancelOrExpireGroup(Number(groupId));
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: 'Unsupported action' }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to process' }, { status: 400 });
  }
}


