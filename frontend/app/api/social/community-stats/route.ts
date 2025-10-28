import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const client = await pool.connect();
    
    try {
      // Get community-wide statistics
      const statsResult = await client.query(`
        SELECT 
          (SELECT COUNT(*)::INTEGER FROM deal_ratings) as total_ratings,
          (SELECT COUNT(*)::INTEGER FROM deal_comments WHERE deleted = FALSE) as total_comments,
          (SELECT COUNT(DISTINCT user_wallet)::INTEGER FROM (
            SELECT user_wallet FROM deal_ratings
            UNION
            SELECT user_wallet FROM deal_comments WHERE deleted = FALSE
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
          ) AS active_users) as active_users,
          (SELECT COUNT(*)::INTEGER FROM user_social_profiles WHERE reputation_points > 0) as users_with_reputation
      `);

      const stats = statsResult.rows[0];

      // Get top 5 contributors for the preview
      const topContributorsResult = await client.query(`
        SELECT 
          user_wallet,
          display_name,
          avatar_url,
          reputation_points,
          reputation_level
        FROM user_social_profiles 
        WHERE reputation_points > 0
        ORDER BY reputation_points DESC 
        LIMIT 5
      `);

      const topContributors = topContributorsResult.rows.map((user, index) => ({
        ...user,
        rank: index + 1
      }));

      return NextResponse.json({
        stats: {
          totalRatings: stats.total_ratings || 0,
          totalComments: stats.total_comments || 0,
          activeUsers: stats.active_users || 0,
          usersWithReputation: stats.users_with_reputation || 0
        },
        topContributors
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching community stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch community stats' },
      { status: 500 }
    );
  }
}
