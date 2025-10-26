// API route for tracking deal shares
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { REPUTATION_POINTS } from '@/lib/social-types';
import { calculateHotnessScore } from '@/lib/social-helpers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dealId, dealType, userWallet, platform } = body;

    // Validation
    if (!dealId || !dealType || !userWallet || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const validPlatforms = ['twitter', 'facebook', 'whatsapp', 'copy'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Record share
      await client.query(
        'INSERT INTO deal_shares (deal_id, deal_type, user_wallet, platform) VALUES ($1, $2, $3, $4)',
        [dealId, dealType, userWallet, platform]
      );

      // Award reputation points
      await client.query(
        `INSERT INTO user_social_profiles (user_wallet, reputation_points)
         VALUES ($1, $2)
         ON CONFLICT (user_wallet) 
         DO UPDATE SET 
           reputation_points = user_social_profiles.reputation_points + $2,
           reputation_level = CASE
             WHEN user_social_profiles.reputation_points + $2 >= 251 THEN 'Legend'
             WHEN user_social_profiles.reputation_points + $2 >= 101 THEN 'Expert'
             WHEN user_social_profiles.reputation_points + $2 >= 51 THEN 'Contributor'
             WHEN user_social_profiles.reputation_points + $2 >= 11 THEN 'Explorer'
             ELSE 'Newbie'
           END,
           updated_at = CURRENT_TIMESTAMP`,
        [userWallet, REPUTATION_POINTS.SHARE_DEAL]
      );

      // Create activity
      await client.query(
        `INSERT INTO social_activities (user_wallet, activity_type, deal_id, deal_type, metadata)
         VALUES ($1, 'shared_deal', $2, $3, $4)`,
        [userWallet, dealId, dealType, JSON.stringify({ platform })]
      );

      // Update share count
      const shareCount = await client.query(
        'SELECT COUNT(*)::INTEGER as count FROM deal_shares WHERE deal_id = $1',
        [dealId]
      );

      // Get existing stats for hotness calculation
      const existingStats = await client.query(
        'SELECT * FROM deal_social_stats WHERE deal_id = $1',
        [dealId]
      );

      let stats = {
        avg_rating: 0,
        rating_count: 0,
        comment_count: 0,
        upvote_count: 0,
        downvote_count: 0,
        share_count: shareCount.rows[0].count,
        hotness_score: 0
      };

      if (existingStats.rows.length > 0) {
        stats = { ...existingStats.rows[0], share_count: shareCount.rows[0].count };
      }

      const hotnessScore = calculateHotnessScore(
        {
          ...stats,
          deal_id: dealId,
          deal_type: dealType,
          last_updated: new Date().toISOString()
        },
        new Date()
      );

      await client.query(
        `INSERT INTO deal_social_stats (deal_id, deal_type, share_count, hotness_score)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (deal_id) 
         DO UPDATE SET 
           share_count = $3,
           hotness_score = $4,
           last_updated = CURRENT_TIMESTAMP`,
        [dealId, dealType, shareCount.rows[0].count, hotnessScore]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        share_count: shareCount.rows[0].count
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error tracking share:', error);
    return NextResponse.json(
      { error: 'Failed to track share' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dealId = searchParams.get('dealId');

    if (!dealId) {
      return NextResponse.json(
        { error: 'dealId is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT COUNT(*)::INTEGER as share_count FROM deal_shares WHERE deal_id = $1',
        [dealId]
      );

      return NextResponse.json({
        share_count: result.rows[0].share_count
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching share count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch share count' },
      { status: 500 }
    );
  }
}

