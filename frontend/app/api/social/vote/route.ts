// API route for voting on deals
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { calculateHotnessScore } from '@/lib/social-helpers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dealId, dealType, userWallet, voteType } = body;

    // Validation
    if (!dealId || !dealType || !userWallet || !voteType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (voteType !== 'up' && voteType !== 'down') {
      return NextResponse.json(
        { error: 'voteType must be "up" or "down"' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if user already voted
      const existingVote = await client.query(
        'SELECT vote_type FROM deal_votes WHERE deal_id = $1 AND user_wallet = $2',
        [dealId, userWallet]
      );

      let action: 'new' | 'updated' | 'removed' = 'new';

      if (existingVote.rows.length > 0) {
        const currentVote = existingVote.rows[0].vote_type;
        
        if (currentVote === voteType) {
          // Remove vote if clicking same button
          await client.query(
            'DELETE FROM deal_votes WHERE deal_id = $1 AND user_wallet = $2',
            [dealId, userWallet]
          );
          action = 'removed';
        } else {
          // Update vote if changing
          await client.query(
            'UPDATE deal_votes SET vote_type = $1 WHERE deal_id = $2 AND user_wallet = $3',
            [voteType, dealId, userWallet]
          );
          action = 'updated';
        }
      } else {
        // Insert new vote
        await client.query(
          'INSERT INTO deal_votes (deal_id, deal_type, user_wallet, vote_type) VALUES ($1, $2, $3, $4)',
          [dealId, dealType, userWallet, voteType]
        );

        // Create activity for upvotes only
        if (voteType === 'up') {
          await client.query(
            `INSERT INTO social_activities (user_wallet, activity_type, deal_id, deal_type)
             VALUES ($1, 'upvoted_deal', $2, $3)`,
            [userWallet, dealId, dealType]
          );
        }
      }

      // Update social stats
      const voteCounts = await client.query(
        `SELECT 
           COUNT(*) FILTER (WHERE vote_type = 'up')::INTEGER as upvote_count,
           COUNT(*) FILTER (WHERE vote_type = 'down')::INTEGER as downvote_count
         FROM deal_votes 
         WHERE deal_id = $1`,
        [dealId]
      );

      const { upvote_count, downvote_count } = voteCounts.rows[0];

      // Get existing stats for hotness calculation
      const existingStats = await client.query(
        'SELECT * FROM deal_social_stats WHERE deal_id = $1',
        [dealId]
      );

      let stats = {
        avg_rating: 0,
        rating_count: 0,
        comment_count: 0,
        upvote_count,
        downvote_count,
        share_count: 0,
        hotness_score: 0
      };

      if (existingStats.rows.length > 0) {
        stats = { ...existingStats.rows[0], upvote_count, downvote_count };
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
        `INSERT INTO deal_social_stats (deal_id, deal_type, upvote_count, downvote_count, hotness_score)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (deal_id) 
         DO UPDATE SET 
           upvote_count = $3,
           downvote_count = $4,
           hotness_score = $5,
           last_updated = CURRENT_TIMESTAMP`,
        [dealId, dealType, upvote_count, downvote_count, hotnessScore]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        action,
        upvote_count,
        downvote_count,
        userVote: action === 'removed' ? null : voteType
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error voting on deal:', error);
    return NextResponse.json(
      { error: 'Failed to vote on deal' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dealId = searchParams.get('dealId');
    const userWallet = searchParams.get('userWallet');

    if (!dealId) {
      return NextResponse.json(
        { error: 'dealId is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Get vote counts
      const voteCounts = await client.query(
        `SELECT 
           COUNT(*) FILTER (WHERE vote_type = 'up')::INTEGER as upvote_count,
           COUNT(*) FILTER (WHERE vote_type = 'down')::INTEGER as downvote_count
         FROM deal_votes 
         WHERE deal_id = $1`,
        [dealId]
      );

      // Get user's vote if wallet provided
      let userVote = null;
      if (userWallet) {
        const userVoteResult = await client.query(
          'SELECT vote_type FROM deal_votes WHERE deal_id = $1 AND user_wallet = $2',
          [dealId, userWallet]
        );
        userVote = userVoteResult.rows[0]?.vote_type || null;
      }

      return NextResponse.json({
        ...voteCounts.rows[0],
        userVote
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching votes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch votes' },
      { status: 500 }
    );
  }
}

