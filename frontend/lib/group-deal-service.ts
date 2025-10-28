import crypto from 'crypto';
import { pool } from './db';

type TierType = 'by_count' | 'by_volume';

function shortHash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 8);
}

function genInviteCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function reputationWeight(level?: string): number {
  switch (level) {
    case 'Explorer':
      return 1.02;
    case 'Contributor':
      return 1.05;
    case 'Expert':
      return 1.1;
    case 'Legend':
      return 1.2;
    case 'Newbie':
    default:
      return 1.0;
  }
}

async function getDealWithTiers(dealId: number) {
  const client = await pool.connect();
  try {
    const dealRes = await client.query('SELECT * FROM group_deals WHERE id = $1', [dealId]);
    if (!dealRes.rows[0]) throw new Error('Group deal not found');
    const tiersRes = await client.query(
      'SELECT * FROM group_deal_tiers WHERE group_deal_id = $1 ORDER BY rank ASC',
      [dealId]
    );
    return { deal: dealRes.rows[0], tiers: tiersRes.rows };
  } finally {
    client.release();
  }
}

export async function createGroupDeal(input: {
  deal_title: string; deal_type: string; merchant_id: string; base_price: number;
  tier_type: TierType; end_at: string;
  tiers: { threshold: number; discount_percent: number; rank: number }[];
  min_participants?: number;
}): Promise<{ id: number }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ins = await client.query(
      `INSERT INTO group_deals (deal_title, deal_type, merchant_id, base_price, min_participants, end_at, tier_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        input.deal_title,
        input.deal_type,
        input.merchant_id,
        input.base_price,
        input.min_participants ?? 2,
        new Date(input.end_at),
        input.tier_type
      ]
    );
    const dealId = ins.rows[0].id as number;
    for (const tier of input.tiers) {
      await client.query(
        `INSERT INTO group_deal_tiers (group_deal_id, threshold, discount_percent, rank) VALUES ($1,$2,$3,$4)`,
        [dealId, tier.threshold, tier.discount_percent, tier.rank]
      );
    }
    await client.query('COMMIT');
    return { id: dealId };
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function createGroupInstance(groupDealId: number, hostWallet: string, expiresAt: string): Promise<{ group_id: number; invite_code: string }>{
  const client = await pool.connect();
  try {
    const invite = genInviteCode();
    const res = await client.query(
      `INSERT INTO group_deal_groups (group_deal_id, host_wallet, invite_code, expires_at)
       VALUES ($1,$2,$3,$4) RETURNING id, invite_code`,
      [groupDealId, hostWallet, invite, new Date(expiresAt)]
    );
    return { group_id: res.rows[0].id, invite_code: res.rows[0].invite_code };
  } finally {
    client.release();
  }
}

export async function joinGroup(groupId: number, userWallet: string, pledgeUnits?: number): Promise<{ ok: true }>{
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const grpRes = await client.query('SELECT * FROM group_deal_groups WHERE id = $1', [groupId]);
    if (!grpRes.rows[0]) throw new Error('Group not found');
    if (grpRes.rows[0].status !== 'open') throw new Error('Group is not open');

    await client.query(
      `INSERT INTO group_deal_members (group_id, user_wallet, pledge_units)
       VALUES ($1,$2,$3)
       ON CONFLICT (group_id, user_wallet) DO UPDATE SET pledge_units = EXCLUDED.pledge_units, status = 'pledged'`,
      [groupId, userWallet, pledgeUnits ?? 1]
    );

    await client.query('COMMIT');
    await recomputeGroupProgress(groupId);
    return { ok: true };
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function recomputeGroupProgress(groupId: number): Promise<{
  current_tier_rank: number; current_discount_percent: number; participants_count: number; total_pledged: number;
}>{
  const client = await pool.connect();
  try {
    const grp = await client.query('SELECT * FROM group_deal_groups WHERE id = $1', [groupId]);
    if (!grp.rows[0]) throw new Error('Group not found');
    const group = grp.rows[0];
    const { deal, tiers } = await getDealWithTiers(group.group_deal_id);

    const membersRes = await client.query(
      `SELECT m.user_wallet, m.pledge_units, p.reputation_level
       FROM group_deal_members m
       LEFT JOIN user_social_profiles p ON p.user_wallet = m.user_wallet
       WHERE m.group_id = $1 AND m.status IN ('pledged','confirmed')`,
      [groupId]
    );
    const members = membersRes.rows;

    let participantsCount = members.length;
    let totalPledged = 0;
    let weightedCount = 0;
    for (const mem of members) {
      const weight = reputationWeight(mem.reputation_level);
      weightedCount += weight;
      totalPledged += Number(mem.pledge_units || 1);
    }

    let currentRank = 0;
    let currentDiscount = 0;
    if ((tiers?.length || 0) > 0) {
      for (const t of tiers) {
        const ok = deal.tier_type === 'by_volume' ? totalPledged >= t.threshold : weightedCount >= t.threshold;
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

    return {
      current_tier_rank: currentRank,
      current_discount_percent: currentDiscount,
      participants_count: participantsCount,
      total_pledged: totalPledged
    };
  } finally {
    client.release();
  }
}

export async function getGroupStatus(groupId: number): Promise<{
  group: any; tiers: any[]; members: any[]; progress: {
    participants_count: number; total_pledged: number;
    current_tier_rank: number; current_discount_percent: number;
    next_threshold?: number; time_left_seconds: number;
  }
}>{
  const client = await pool.connect();
  try {
    const grp = await client.query('SELECT * FROM group_deal_groups WHERE id = $1', [groupId]);
    if (!grp.rows[0]) throw new Error('Group not found');
    const group = grp.rows[0];
    const { deal, tiers } = await getDealWithTiers(group.group_deal_id);

    const memRes = await client.query(
      `SELECT user_wallet, pledge_units, status, joined_at FROM group_deal_members WHERE group_id = $1 ORDER BY joined_at ASC`,
      [groupId]
    );

    const progress = await recomputeGroupProgress(groupId);

    let nextThreshold: number | undefined = undefined;
    const sortedTiers = [...tiers].sort((a, b) => a.rank - b.rank);
    for (const t of sortedTiers) {
      if (t.rank > progress.current_tier_rank) {
        nextThreshold = t.threshold;
        break;
      }
    }

    const timeLeft = Math.max(0, Math.floor((new Date(group.expires_at).getTime() - Date.now()) / 1000));

    return {
      group: { ...group, deal },
      tiers: sortedTiers,
      members: memRes.rows,
      progress: {
        participants_count: progress.participants_count,
        total_pledged: progress.total_pledged,
        current_tier_rank: progress.current_tier_rank,
        current_discount_percent: progress.current_discount_percent,
        next_threshold: nextThreshold,
        time_left_seconds: timeLeft
      }
    };
  } finally {
    client.release();
  }
}

export async function lockGroup(groupId: number): Promise<{
  final_discount_percent: number; final_tier_rank: number; codes: { wallet: string; code: string }[];
}>{
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const grpRes = await client.query('SELECT * FROM group_deal_groups WHERE id = $1 FOR UPDATE', [groupId]);
    if (!grpRes.rows[0]) throw new Error('Group not found');
    const group = grpRes.rows[0];
    const { deal } = await getDealWithTiers(group.group_deal_id);

    const progress = await recomputeGroupProgress(groupId);

    const minReached = progress.participants_count >= (deal.min_participants ?? 2);
    if (!minReached) {
      throw new Error('Minimum participants not met');
    }

    let finalDiscount = progress.current_discount_percent;
    const windowMs = new Date(deal.end_at).getTime() - new Date(deal.start_at).getTime();
    const elapsedMs = Date.now() - new Date(group.created_at).getTime();
    if (windowMs > 0 && elapsedMs / windowMs <= 0.25 && finalDiscount > 0) {
      finalDiscount += 2;
    }

    await client.query('UPDATE group_deal_groups SET status = $1 WHERE id = $2', ['locked', groupId]);
    await client.query(
      `INSERT INTO group_deal_settlements (group_id, final_tier_rank, final_discount_percent)
       VALUES ($1,$2,$3)`,
      [groupId, progress.current_tier_rank, finalDiscount]
    );

    const members = await client.query(
      `SELECT user_wallet FROM group_deal_members WHERE group_id = $1 AND status IN ('pledged','confirmed')`,
      [groupId]
    );

    const codes: { wallet: string; code: string }[] = [];
    for (const m of members.rows) {
      const code = `GRP-${groupId}-${shortHash(m.user_wallet)}`;
      const qrPayload = JSON.stringify({
        redemptionCode: code,
        discountValue: finalDiscount,
        userWallet: m.user_wallet,
        merchantId: (deal as any).merchant_id
      });
      await client.query(
        `INSERT INTO group_deal_redemptions (group_id, user_wallet, redemption_code, qr_payload)
         VALUES ($1,$2,$3,$4)`,
        [groupId, m.user_wallet, code, qrPayload]
      );
      await client.query(
        `INSERT INTO user_notifications (user_wallet, notification_type, title, message, link)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          m.user_wallet,
          'group_deal_locked',
          'Group Deal Locked',
          `Your group deal "${(deal as any).deal_title}" locked at ${finalDiscount}% discount.`,
          `/group-deals/${(deal as any).id}/groups/${groupId}`
        ]
      );
      await client.query(
        `INSERT INTO social_activities (user_wallet, activity_type, deal_id, deal_type, metadata)
         VALUES ($1,$2,$3,$4,$5)`,
        [m.user_wallet, 'group_deal_locked', String((deal as any).id), (deal as any).deal_type, { groupId }]
      );
      codes.push({ wallet: m.user_wallet, code });
    }

    await client.query('COMMIT');
    return { final_discount_percent: finalDiscount, final_tier_rank: progress.current_tier_rank, codes };
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function cancelOrExpireGroup(groupId: number): Promise<{ status: 'cancelled' | 'expired' }>{
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const grp = await client.query('SELECT * FROM group_deal_groups WHERE id = $1 FOR UPDATE', [groupId]);
    if (!grp.rows[0]) throw new Error('Group not found');
    const group = grp.rows[0];
    const isExpired = new Date(group.expires_at).getTime() < Date.now();
    const newStatus = isExpired ? 'expired' : 'cancelled';
    await client.query('UPDATE group_deal_groups SET status = $1 WHERE id = $2', [newStatus, groupId]);
    await client.query(`UPDATE group_deal_members SET status = 'refunded' WHERE group_id = $1`, [groupId]);
    await client.query('COMMIT');
    return { status: newStatus };
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function listActiveDeals() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM group_deals WHERE status = 'active' AND end_at > NOW() ORDER BY created_at DESC`
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export async function getDealDetail(dealId: number) {
  const client = await pool.connect();
  try {
    const dealRes = await client.query('SELECT * FROM group_deals WHERE id = $1', [dealId]);
    if (!dealRes.rows[0]) throw new Error('Deal not found');
    const tiersRes = await client.query('SELECT * FROM group_deal_tiers WHERE group_deal_id = $1 ORDER BY rank ASC', [dealId]);
    const groupsRes = await client.query(
      `SELECT id, host_wallet, status, current_tier_rank, current_discount_percent, participants_count, total_pledged, expires_at, created_at
       FROM group_deal_groups WHERE group_deal_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [dealId]
    );
    return { deal: dealRes.rows[0], tiers: tiersRes.rows, recent_groups: groupsRes.rows };
  } finally {
    client.release();
  }
}

export async function cronProcess() {
  const client = await pool.connect();
  try {
    const expired = await client.query(
      `SELECT id FROM group_deal_groups WHERE status = 'open' AND expires_at < NOW()`
    );
    for (const row of expired.rows) {
      const progress = await recomputeGroupProgress(row.id);
      if (progress.current_tier_rank > 0) await lockGroup(row.id);
      else await cancelOrExpireGroup(row.id);
    }
    const open = await client.query(
      `SELECT id FROM group_deal_groups WHERE status = 'open' AND expires_at > NOW()`
    );
    for (const row of open.rows) {
      await recomputeGroupProgress(row.id);
    }
    return { ok: true };
  } finally {
    client.release();
  }
}


