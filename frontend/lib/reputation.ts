import { pool } from './db';
import { calculateReputationLevel } from './social-helpers';
import { Badge, BADGE_DEFINITIONS, ReputationLevel } from './social-types';

type Metrics = {
  ratings: number;
  comments: { count: number; netUpvotes: number };
  shares: number;
  transactions: number;
  uniqueMerchantsClaimed: number;
  firstActivityAt: Date | null;
  activeDaysLast30: number;
  avgRatingGiven: number | null;
  ratingVariance: number | null;
};

const MAX_ACCOUNT_AGE_POINTS = 100;
const ACCOUNT_AGE_PER_7D = 1;
const SHARE_CAP = 50;

export async function fetchUserMetrics(wallet: string): Promise<Metrics> {
  const client = await pool.connect();
  try {
    const q = async <T = any>(sql: string, params: any[] = []) => (await client.query(sql, params)).rows as T[];

    const ratings = await q<{ created_at: string; rating: number }>(
      `SELECT created_at, rating FROM deal_ratings WHERE user_wallet = $1`,
      [wallet]
    );

    const comments = await q<{ id: number; created_at: string }>(
      `SELECT id, created_at FROM deal_comments WHERE user_wallet = $1`,
      [wallet]
    );

    const votesAgg = (
      await q<{ sum: string }>(
        `SELECT COALESCE(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE -1 END),0) AS sum 
         FROM comment_votes cv 
         JOIN deal_comments dc ON dc.id = cv.comment_id
         WHERE dc.user_wallet = $1`,
        [wallet]
      )
    )[0];

    const shares = await q(`SELECT created_at FROM deal_shares WHERE user_wallet = $1`, [wallet]);

    const transactions = await q(
      `SELECT created_at FROM transactions WHERE buyer_wallet = $1 OR seller_wallet = $1`,
      [wallet]
    );

    const uniqueMerchants = await q<{ merchant_id: string }>(
      `SELECT DISTINCT merchant_id FROM user_claims WHERE buyer_wallet = $1`,
      [wallet]
    );

    const firstActivityRow =
      (
        await q<{ created_at: string }>(
          `SELECT created_at FROM (
             SELECT created_at FROM deal_ratings WHERE user_wallet = $1
             UNION ALL
             SELECT created_at FROM deal_comments WHERE user_wallet = $1
             UNION ALL
             SELECT created_at FROM deal_shares WHERE user_wallet = $1
             UNION ALL
             SELECT created_at FROM transactions WHERE buyer_wallet = $1 OR seller_wallet = $1
           ) t ORDER BY created_at ASC LIMIT 1`,
          [wallet]
        )
      )[0] || null;

    const last30 = (
      await q<{ d: string }>(
        `SELECT DISTINCT CAST(created_at::date AS text) AS d FROM (
           SELECT created_at FROM deal_ratings WHERE user_wallet = $1 AND created_at > NOW() - INTERVAL '30 days'
           UNION ALL
           SELECT created_at FROM deal_comments WHERE user_wallet = $1 AND created_at > NOW() - INTERVAL '30 days'
           UNION ALL
           SELECT created_at FROM deal_shares WHERE user_wallet = $1 AND created_at > NOW() - INTERVAL '30 days'
           UNION ALL
           SELECT created_at FROM transactions WHERE (buyer_wallet = $1 OR seller_wallet = $1) AND created_at > NOW() - INTERVAL '30 days'
         ) t`,
        [wallet]
      )
    ).length;

    let avg: number | null = null;
    let variance: number | null = null;
    if (ratings.length > 0) {
      const vals = ratings.map(r => Number(r.rating));
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const varSum = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
      avg = Number(mean.toFixed(2));
      variance = Number(varSum.toFixed(2));
    }

    return {
      ratings: ratings.length,
      comments: { count: comments.length, netUpvotes: Number(votesAgg?.sum ?? 0) },
      shares: shares.length,
      transactions: transactions.length,
      uniqueMerchantsClaimed: uniqueMerchants.length,
      firstActivityAt: firstActivityRow ? new Date(firstActivityRow.created_at) : null,
      activeDaysLast30: last30,
      avgRatingGiven: avg,
      ratingVariance: variance
    };
  } finally {
    client.release();
  }
}

export function scoreFromMetrics(m: Metrics): { points: number; level: ReputationLevel; badges: Badge[] } {
  const now = new Date();
  const accountAgeWeeks = m.firstActivityAt
    ? Math.floor((now.getTime() - m.firstActivityAt.getTime()) / (1000 * 60 * 60 * 24 * 7))
    : 0;
  const agePoints = Math.min(accountAgeWeeks * ACCOUNT_AGE_PER_7D, MAX_ACCOUNT_AGE_POINTS);

  const ratingPoints = m.ratings * 2;
  const commentPoints = m.comments.count * 3 + Math.max(0, m.comments.netUpvotes);
  const sharePoints = Math.min(m.shares, SHARE_CAP) * 1;
  const txnPoints = m.transactions * 3;
  const claimPoints = m.uniqueMerchantsClaimed * 2;
  const qualityBonus =
    m.avgRatingGiven && m.avgRatingGiven >= 4.0 && m.avgRatingGiven <= 4.8 && (m.ratingVariance ?? 0) <= 1.2
      ? 10
      : 0;
  const streakBonus = m.activeDaysLast30 >= 7 ? 10 : 0;

  const points =
    agePoints +
    ratingPoints +
    commentPoints +
    sharePoints +
    txnPoints +
    claimPoints +
    qualityBonus +
    streakBonus;
  const level = calculateReputationLevel(points);

  const badges: Badge[] = [];
  const nowIso = new Date().toISOString();
  const push = (id: string) => badges.push({ ...BADGE_DEFINITIONS[id], earned_at: nowIso });

  if (m.ratings >= 1) push('first-rating');
  if (m.comments.count >= 10)
    badges.push({ id: 'active-commenter', name: 'Active Commenter', description: 'Posted 10 comments', icon: '🗨️', earned_at: nowIso });
  if (m.shares >= 10)
    badges.push({ id: 'social-sharer', name: 'Social Sharer', description: 'Shared 10 deals', icon: '🔗', earned_at: nowIso });
  if (m.transactions >= 5)
    badges.push({ id: 'power-trader', name: 'Power Trader', description: 'Completed 5 trades', icon: '💹', earned_at: nowIso });
  if (m.uniqueMerchantsClaimed >= 5)
    badges.push({ id: 'loyal-user', name: 'Loyal User', description: 'Claimed from 5 merchants', icon: '🛡️', earned_at: nowIso });
  if (m.activeDaysLast30 >= 7)
    badges.push({ id: 'streak-7', name: '7-Day Streak', description: 'Active 7 days in last 30', icon: '🔥', earned_at: nowIso });

  return { points, level, badges };
}


