// API route for comments
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { REPUTATION_POINTS } from '@/lib/social-types';
import { sanitizeCommentText, validateCommentText, calculateHotnessScore } from '@/lib/social-helpers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dealId = searchParams.get('dealId');
    const userWallet = searchParams.get('userWallet');
    const sortBy = searchParams.get('sortBy') || 'newest';

    if (!dealId) {
      return NextResponse.json(
        { error: 'dealId is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Determine sort order
      let orderClause = 'c.created_at DESC';
      if (sortBy === 'oldest') {
        orderClause = 'c.created_at ASC';
      } else if (sortBy === 'top') {
        orderClause = '(c.upvotes - c.downvotes) DESC';
      }

      // Get top-level comments
      const commentsQuery = `
        SELECT 
          c.*,
          p.display_name,
          p.avatar_url,
          p.reputation_level,
          ${userWallet ? `(SELECT vote_type FROM comment_votes WHERE comment_id = c.id AND user_wallet = $2) as user_vote` : 'NULL as user_vote'}
        FROM deal_comments c
        LEFT JOIN user_social_profiles p ON c.user_wallet = p.user_wallet
        WHERE c.deal_id = $1 AND c.parent_comment_id IS NULL AND c.deleted = FALSE
        ORDER BY ${orderClause}
      `;

      const values = userWallet ? [dealId, userWallet] : [dealId];
      const commentsResult = await client.query(commentsQuery, values);

      // Get replies for each comment
      const commentsWithReplies = await Promise.all(
        commentsResult.rows.map(async (comment) => {
          const repliesQuery = `
            SELECT 
              c.*,
              p.display_name,
              p.avatar_url,
              p.reputation_level,
              ${userWallet ? `(SELECT vote_type FROM comment_votes WHERE comment_id = c.id AND user_wallet = $2) as user_vote` : 'NULL as user_vote'}
            FROM deal_comments c
            LEFT JOIN user_social_profiles p ON c.user_wallet = p.user_wallet
            WHERE c.parent_comment_id = $1 AND c.deleted = FALSE
            ORDER BY c.created_at ASC
          `;

          const repliesValues = userWallet ? [comment.id, userWallet] : [comment.id];
          const repliesResult = await client.query(repliesQuery, repliesValues);

          return {
            ...comment,
            replies: repliesResult.rows
          };
        })
      );

      return NextResponse.json({
        comments: commentsWithReplies
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dealId, dealType, userWallet, commentText, parentCommentId } = body;

    // Validation
    if (!dealId || !dealType || !userWallet || !commentText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const validation = validateCommentText(commentText);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Check nesting level
    if (parentCommentId) {
      const client = await pool.connect();
      try {
        const parentCheck = await client.query(
          'SELECT parent_comment_id FROM deal_comments WHERE id = $1',
          [parentCommentId]
        );

        if (parentCheck.rows.length === 0) {
          return NextResponse.json(
            { error: 'Parent comment not found' },
            { status: 404 }
          );
        }

        // Only allow 2 levels (no replies to replies)
        if (parentCheck.rows[0].parent_comment_id !== null) {
          return NextResponse.json(
            { error: 'Maximum nesting level reached' },
            { status: 400 }
          );
        }
      } finally {
        client.release();
      }
    }

    const sanitizedText = sanitizeCommentText(commentText);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Insert comment
      const commentResult = await client.query(
        `INSERT INTO deal_comments (deal_id, deal_type, user_wallet, parent_comment_id, comment_text)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [dealId, dealType, userWallet, parentCommentId || null, sanitizedText]
      );

      const comment = commentResult.rows[0];

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
        [userWallet, REPUTATION_POINTS.COMMENT]
      );

      // Create activity
      const activityType = parentCommentId ? 'replied' : 'commented';
      await client.query(
        `INSERT INTO social_activities (user_wallet, activity_type, deal_id, deal_type, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [userWallet, activityType, dealId, dealType, JSON.stringify({ commentId: comment.id })]
      );

      // Update comment count in social stats
      const commentCount = await client.query(
        'SELECT COUNT(*)::INTEGER as count FROM deal_comments WHERE deal_id = $1 AND deleted = FALSE',
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
        comment_count: commentCount.rows[0].count,
        upvote_count: 0,
        downvote_count: 0,
        share_count: 0,
        hotness_score: 0
      };

      if (existingStats.rows.length > 0) {
        stats = { ...existingStats.rows[0], comment_count: commentCount.rows[0].count };
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
        `INSERT INTO deal_social_stats (deal_id, deal_type, comment_count, hotness_score)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (deal_id) 
         DO UPDATE SET 
           comment_count = $3,
           hotness_score = $4,
           last_updated = CURRENT_TIMESTAMP`,
        [dealId, dealType, commentCount.rows[0].count, hotnessScore]
      );

      // Create notification if reply
      if (parentCommentId) {
        const parentComment = await client.query(
          'SELECT user_wallet FROM deal_comments WHERE id = $1',
          [parentCommentId]
        );

        if (parentComment.rows.length > 0 && parentComment.rows[0].user_wallet !== userWallet) {
          await client.query(
            `INSERT INTO user_notifications (user_wallet, notification_type, title, message, link)
             VALUES ($1, 'comment_reply', 'New Reply', 'Someone replied to your comment', $2)`,
            [
              parentComment.rows[0].user_wallet,
              `/deal/${dealId}?type=${dealType}#comment-${comment.id}`
            ]
          );
        }
      }

      await client.query('COMMIT');

      // Fetch comment with profile info
      const fullCommentResult = await client.query(
        `SELECT c.*, p.display_name, p.avatar_url, p.reputation_level
         FROM deal_comments c
         LEFT JOIN user_social_profiles p ON c.user_wallet = p.user_wallet
         WHERE c.id = $1`,
        [comment.id]
      );

      return NextResponse.json({
        success: true,
        comment: fullCommentResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

