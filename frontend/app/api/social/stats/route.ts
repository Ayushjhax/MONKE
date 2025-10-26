// API route for fetching social stats
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dealId = searchParams.get('dealId');
    const dealIds = searchParams.get('dealIds');
    const userWallet = searchParams.get('userWallet');

    const client = await pool.connect();

    try {
      if (dealId) {
        // Get stats for single deal
        const statsResult = await client.query(
          'SELECT * FROM deal_social_stats WHERE deal_id = $1',
          [dealId]
        );

        let stats = statsResult.rows[0] || {
          deal_id: dealId,
          deal_type: 'unknown',
          avg_rating: 0,
          rating_count: 0,
          comment_count: 0,
          upvote_count: 0,
          downvote_count: 0,
          share_count: 0,
          hotness_score: 0,
          last_updated: new Date().toISOString()
        };

        // Get user-specific data if wallet provided
        if (userWallet) {
          const userRating = await client.query(
            'SELECT rating FROM deal_ratings WHERE deal_id = $1 AND user_wallet = $2',
            [dealId, userWallet]
          );

          const userVote = await client.query(
            'SELECT vote_type FROM deal_votes WHERE deal_id = $1 AND user_wallet = $2',
            [dealId, userWallet]
          );

          stats = {
            ...stats,
            user_rating: userRating.rows[0]?.rating,
            user_vote: userVote.rows[0]?.vote_type
          };
        }

        return NextResponse.json({ stats });
      } else if (dealIds) {
        // Get stats for multiple deals
        const ids = dealIds.split(',');
        
        const statsResult = await client.query(
          'SELECT * FROM deal_social_stats WHERE deal_id = ANY($1)',
          [ids]
        );

        // Create map of stats
        const statsMap: Record<string, any> = {};
        
        ids.forEach(id => {
          statsMap[id] = {
            deal_id: id,
            deal_type: 'unknown',
            avg_rating: 0,
            rating_count: 0,
            comment_count: 0,
            upvote_count: 0,
            downvote_count: 0,
            share_count: 0,
            hotness_score: 0,
            last_updated: new Date().toISOString()
          };
        });

        statsResult.rows.forEach(stat => {
          statsMap[stat.deal_id] = stat;
        });

        // Get user-specific data if wallet provided
        if (userWallet) {
          const userRatings = await client.query(
            'SELECT deal_id, rating FROM deal_ratings WHERE deal_id = ANY($1) AND user_wallet = $2',
            [ids, userWallet]
          );

          const userVotes = await client.query(
            'SELECT deal_id, vote_type FROM deal_votes WHERE deal_id = ANY($1) AND user_wallet = $2',
            [ids, userWallet]
          );

          userRatings.rows.forEach(rating => {
            if (statsMap[rating.deal_id]) {
              statsMap[rating.deal_id].user_rating = rating.rating;
            }
          });

          userVotes.rows.forEach(vote => {
            if (statsMap[vote.deal_id]) {
              statsMap[vote.deal_id].user_vote = vote.vote_type;
            }
          });
        }

        return NextResponse.json({ stats: statsMap });
      } else {
        return NextResponse.json(
          { error: 'dealId or dealIds is required' },
          { status: 400 }
        );
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching social stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social stats' },
      { status: 500 }
    );
  }
}

