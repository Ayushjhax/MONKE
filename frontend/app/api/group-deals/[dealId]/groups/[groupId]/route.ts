import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { pool, initializeDatabase } from '@/lib/db';

async function getDealWithTiers(dealId: number) {
  const client = await pool.connect();
  try {
    const dealRes = await client.query('SELECT * FROM group_deals WHERE id = $1', [dealId]);
    if (!dealRes.rows[0]) throw new Error('Group deal not found');
    const tiersRes = await client.query('SELECT * FROM group_deal_tiers WHERE group_deal_id = $1 ORDER BY rank ASC', [dealId]);
    return { deal: dealRes.rows[0], tiers: tiersRes.rows };
  } finally {
    client.release();
  }
}

async function recomputeGroupProgress(groupId: number) {
  const client = await pool.connect();
  try {
    const grp = await client.query('SELECT * FROM group_deal_groups WHERE id = $1', [groupId]);
    if (!grp.rows[0]) throw new Error('Group not found');
    const group = grp.rows[0];
    const { deal, tiers } = await getDealWithTiers(group.group_deal_id);

    const membersRes = await client.query(
      `SELECT m.user_wallet, m.pledge_units
       FROM group_deal_members m
       WHERE m.group_id = $1 AND m.status IN ('pledged','confirmed')`,
      [groupId]
    );
    const members = membersRes.rows;

    const participantsCount = members.length;
    let totalPledged = 0;
    for (const mem of members) totalPledged += Number(mem.pledge_units || 1);

    let currentRank = 0;
    let currentDiscount = 0;
    if ((tiers?.length || 0) > 0) {
      for (const t of tiers) {
        const ok = deal.tier_type === 'by_volume' ? totalPledged >= t.threshold : participantsCount >= t.threshold;
        if (ok && t.rank > currentRank) {
          currentRank = t.rank;
          currentDiscount = t.discount_percent;
        }
      }
    }

    await client.query(
      `UPDATE group_deal_groups SET current_tier_rank = $1, current_discount_percent = $2,
       participants_count = $3, total_pledged = $4 WHERE id = $5`,
      [currentRank, currentDiscount, participantsCount, totalPledged, groupId]
    );

    return { current_tier_rank: currentRank, current_discount_percent: currentDiscount, participants_count: participantsCount, total_pledged: totalPledged };
  } finally {
    client.release();
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ dealId: string; groupId: string }> }
) {
  try {
    await initializeDatabase();
    const { groupId } = await params;
    const client = await pool.connect();
    try {
      const grp = await client.query('SELECT * FROM group_deal_groups WHERE id = $1', [Number(groupId)]);
      if (!grp.rows[0]) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      const group = grp.rows[0];
      const { deal, tiers } = await getDealWithTiers(group.group_deal_id);
      const memRes = await client.query(
        `SELECT user_wallet, pledge_units, status, joined_at FROM group_deal_members WHERE group_id = $1 ORDER BY joined_at ASC`,
        [Number(groupId)]
      );
      const progress = await recomputeGroupProgress(Number(groupId));
      let nextThreshold: number | undefined = undefined;
      const sortedTiers = [...tiers].sort((a: any, b: any) => a.rank - b.rank);
      for (const t of sortedTiers) {
        if (t.rank > progress.current_tier_rank) { nextThreshold = t.threshold; break; }
      }
      const timeLeft = Math.max(0, Math.floor((new Date(group.expires_at).getTime() - Date.now()) / 1000));
      const res = NextResponse.json({
        group: { ...group, deal },
        tiers: sortedTiers,
        members: memRes.rows,
        progress: { ...progress, next_threshold: nextThreshold, time_left_seconds: timeLeft }
      });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res;
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch group status' }, { status: 400 });
  }
}

