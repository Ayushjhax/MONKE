import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const client = await pool.connect();
    const rows = (
      await client.query(
        `
        WITH wallets AS (
          SELECT user_wallet AS wallet FROM user_social_profiles
          UNION
          SELECT user_wallet FROM deal_ratings
          UNION
          SELECT user_wallet FROM deal_comments
          UNION
          SELECT user_wallet FROM deal_shares
          UNION
          SELECT user_wallet FROM deal_votes
          UNION
          SELECT user_wallet FROM comment_votes
          UNION
          SELECT user_wallet FROM social_activities
          UNION
          SELECT buyer_wallet FROM transactions
          UNION
          SELECT seller_wallet FROM transactions
          UNION
          SELECT buyer_wallet FROM user_claims
          UNION
          SELECT user_wallet FROM user_notifications
          UNION
          SELECT user_wallet FROM deal_bookings
          UNION
          SELECT buyer_wallet FROM offers
          UNION
          SELECT seller_wallet FROM offers
          UNION
          SELECT seller_wallet FROM resale_listings
          UNION
          SELECT buyer_wallet FROM resale_listings
          UNION
          SELECT wallet_address FROM coupon_redemptions
          UNION
          SELECT user_wallet FROM user_location_proofs
          UNION
          SELECT user_wallet FROM geo_deal_interactions
          UNION
          SELECT user_wallet FROM user_event_interests
        )
        SELECT 
          w.wallet AS user_wallet,
          COALESCE(p.display_name, NULL) AS display_name,
          COALESCE(p.avatar_url, NULL) AS avatar_url,
          COALESCE(p.reputation_points, 0) AS reputation_points,
          COALESCE(p.reputation_level, 'Newbie') AS reputation_level,
          COALESCE(p.badges, '[]'::jsonb) AS badges
        FROM wallets w
        LEFT JOIN user_social_profiles p ON p.user_wallet = w.wallet
        WHERE w.wallet IS NOT NULL 
          AND w.wallet <> ''
          AND char_length(w.wallet) BETWEEN 32 AND 64
        GROUP BY w.wallet, p.display_name, p.avatar_url, p.reputation_points, p.reputation_level, p.badges
        ORDER BY COALESCE(p.reputation_points, 0) DESC, w.wallet ASC
        LIMIT 200
      `
      )
    ).rows;
    client.release();
    return NextResponse.json({ leaderboard: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'failed' }, { status: 500 });
  }
}


