import { NextRequest, NextResponse } from 'next/server';
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
    const tiersRes = await client.query('SELECT * FROM group_deal_tiers WHERE group_deal_id = $1 ORDER BY rank ASC', [group.group_deal_id]);
    const tiers = tiersRes.rows;
    const membersRes = await client.query(
      `SELECT pledge_units FROM group_deal_members WHERE group_id = $1 AND status IN ('pledged','confirmed')`,
      [groupId]
    );
    const members = membersRes.rows;
    const participantsCount = members.length;
    let totalPledged = 0;
    for (const m of members) totalPledged += Number(m.pledge_units || 1);

    let currentRank = 0;
    let currentDiscount = 0;
    for (const t of tiers) {
      const ok = group.tier_type === 'by_volume' ? totalPledged >= t.threshold : participantsCount >= t.threshold;
      if (ok && t.rank > currentRank) { currentRank = t.rank; currentDiscount = t.discount_percent; }
    }
    await client.query(
      `UPDATE group_deal_groups SET current_tier_rank = $1, current_discount_percent = $2,
       participants_count = $3, total_pledged = $4 WHERE id = $5`,
      [currentRank, currentDiscount, participantsCount, totalPledged, groupId]
    );
    return { current_tier_rank: currentRank, current_discount_percent: currentDiscount, participants_count: participantsCount };
  } finally {
    client.release();
  }
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ dealId: string; groupId: string }> }) {
  try {
    await initializeDatabase();
    const { groupId } = await params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const grpRes = await client.query('SELECT * FROM group_deal_groups WHERE id = $1 FOR UPDATE', [Number(groupId)]);
      if (!grpRes.rows[0]) throw new Error('Group not found');
      const group = grpRes.rows[0];
      const { deal } = await getDealWithTiers(group.group_deal_id);
      const progress = await recomputeGroupProgress(Number(groupId));

      const minReached = progress.participants_count >= (deal.min_participants ?? 2);
      if (!minReached) throw new Error('Minimum participants not met');

      // Momentum bonus
      let finalDiscount = progress.current_discount_percent;
      const windowMs = new Date(deal.end_at).getTime() - new Date(deal.start_at).getTime();
      const elapsedMs = Date.now() - new Date(group.created_at).getTime();
      if (windowMs > 0 && elapsedMs / windowMs <= 0.25 && finalDiscount > 0) {
        finalDiscount += 2;
      }

      await client.query('UPDATE group_deal_groups SET status = $1 WHERE id = $2', ['locked', Number(groupId)]);
      await client.query(
        `INSERT INTO group_deal_settlements (group_id, final_tier_rank, final_discount_percent)
         VALUES ($1,$2,$3)`,
        [Number(groupId), progress.current_tier_rank, finalDiscount]
      );

      const members = await client.query(
        `SELECT user_wallet FROM group_deal_members WHERE group_id = $1 AND status IN ('pledged','confirmed')`,
        [Number(groupId)]
      );

      for (const m of members.rows) {
        const code = `GRP-${groupId}-${Buffer.from(m.user_wallet).toString('hex').slice(0,8)}`;
        const qrPayload = JSON.stringify({ redemptionCode: code, discountValue: finalDiscount, userWallet: m.user_wallet, merchantId: deal.merchant_id });
        await client.query(
          `INSERT INTO group_deal_redemptions (group_id, user_wallet, redemption_code, qr_payload)
           VALUES ($1,$2,$3,$4)`,
          [Number(groupId), m.user_wallet, code, qrPayload]
        );
        await client.query(
          `INSERT INTO user_notifications (user_wallet, notification_type, title, message, link)
           VALUES ($1,$2,$3,$4,$5)`,
          [
            m.user_wallet,
            'group_deal_locked',
            'Group Deal Locked',
            `Your group deal "${deal.deal_title}" locked at ${finalDiscount}% discount.`,
            `/group-deals/${deal.id}/groups/${groupId}`
          ]
        );
        await client.query(
          `INSERT INTO social_activities (user_wallet, activity_type, deal_id, deal_type, metadata)
           VALUES ($1,$2,$3,$4,$5)`,
          [m.user_wallet, 'group_deal_locked', String(deal.id), deal.deal_type, { groupId }]
        );
      }

      await client.query('COMMIT');
      return NextResponse.json({ final_discount_percent: finalDiscount, final_tier_rank: progress.current_tier_rank });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to lock group' }, { status: 400 });
  }
}


