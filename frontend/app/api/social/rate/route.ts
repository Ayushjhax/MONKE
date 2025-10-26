// API route for rating deals
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { DealRating, REPUTATION_POINTS } from '@/lib/social-types';
import { calculateHotnessScore } from '@/lib/social-helpers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dealId, dealType, userWallet, rating, reviewText } = body;

    // Validation
    if (!dealId || !dealType || !userWallet) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (reviewText && reviewText.length > 500) {
      return NextResponse.json(
        { error: 'Review text must be 500 characters or less' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if user already rated this deal
      const existingRating = await client.query(
        'SELECT id FROM deal_ratings WHERE deal_id = $1 AND user_wallet = $2',
        [dealId, userWallet]
      );

      let ratingResult;
      const isNewRating = existingRating.rows.length === 0;

      if (isNewRating) {
        // Insert new rating
        ratingResult = await client.query(
          `INSERT INTO deal_ratings (deal_id, deal_type, user_wallet, rating, review_text)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [dealId, dealType, userWallet, rating, reviewText || null]
        );

        // Award reputation points for new rating
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
          [userWallet, REPUTATION_POINTS.RATE_DEAL]
        );

        // Create activity
        await client.query(
          `INSERT INTO social_activities (user_wallet, activity_type, deal_id, deal_type, metadata)
           VALUES ($1, 'rated_deal', $2, $3, $4)`,
          [userWallet, dealId, dealType, JSON.stringify({ rating, reviewText })]
        );
      } else {
        // Update existing rating
        ratingResult = await client.query(
          `UPDATE deal_ratings 
           SET rating = $1, review_text = $2, updated_at = CURRENT_TIMESTAMP
           WHERE deal_id = $3 AND user_wallet = $4
           RETURNING *`,
          [rating, reviewText || null, dealId, userWallet]
        );
      }

      // Update social stats
      const statsQuery = await client.query(
        `SELECT AVG(rating)::DECIMAL(3,2) as avg_rating, COUNT(*)::INTEGER as rating_count
         FROM deal_ratings 
         WHERE deal_id = $1 AND deal_type = $2`,
        [dealId, dealType]
      );

      const { avg_rating, rating_count } = statsQuery.rows[0];

      // Get existing stats for hotness calculation
      const existingStats = await client.query(
        `SELECT * FROM deal_social_stats WHERE deal_id = $1`,
        [dealId]
      );

      let hotnessScore = 0;
      if (existingStats.rows.length > 0) {
        const stats = existingStats.rows[0];
        hotnessScore = calculateHotnessScore(
          {
            ...stats,
            avg_rating: parseFloat(avg_rating),
            rating_count
          },
          new Date() // Use current date as approximation
        );
      }

      await client.query(
        `INSERT INTO deal_social_stats (deal_id, deal_type, avg_rating, rating_count, hotness_score)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (deal_id) 
         DO UPDATE SET 
           avg_rating = $3,
           rating_count = $4,
           hotness_score = $5,
           last_updated = CURRENT_TIMESTAMP`,
        [dealId, dealType, avg_rating, rating_count, hotnessScore]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        rating: ratingResult.rows[0],
        isNewRating,
        stats: {
          avg_rating: parseFloat(avg_rating),
          rating_count
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error rating deal:', error);
    return NextResponse.json(
      { error: 'Failed to rate deal' },
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
      let query = `
        SELECT r.*, p.display_name, p.avatar_url, p.reputation_level
        FROM deal_ratings r
        LEFT JOIN user_social_profiles p ON r.user_wallet = p.user_wallet
        WHERE r.deal_id = $1
        ORDER BY r.created_at DESC
      `;

      const values = [dealId];
      const result = await client.query(query, values);

      // Get user's rating if wallet provided
      let userRating = null;
      if (userWallet) {
        const userRatingResult = await client.query(
          'SELECT * FROM deal_ratings WHERE deal_id = $1 AND user_wallet = $2',
          [dealId, userWallet]
        );
        userRating = userRatingResult.rows[0] || null;
      }

      return NextResponse.json({
        ratings: result.rows,
        userRating
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching ratings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ratings' },
      { status: 500 }
    );
  }
}

