// API route for voting on comments
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { REPUTATION_POINTS } from '@/lib/social-types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { commentId, userWallet, voteType } = body;

    // Validation
    if (!commentId || !userWallet || !voteType) {
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

      // Get comment owner
      const commentResult = await client.query(
        'SELECT user_wallet FROM deal_comments WHERE id = $1',
        [commentId]
      );

      if (commentResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Comment not found' },
          { status: 404 }
        );
      }

      const commentOwner = commentResult.rows[0].user_wallet;

      // Check if user already voted
      const existingVote = await client.query(
        'SELECT vote_type FROM comment_votes WHERE comment_id = $1 AND user_wallet = $2',
        [commentId, userWallet]
      );

      let action: 'new' | 'updated' | 'removed' = 'new';
      let reputationChange = 0;

      if (existingVote.rows.length > 0) {
        const currentVote = existingVote.rows[0].vote_type;
        
        if (currentVote === voteType) {
          // Remove vote
          await client.query(
            'DELETE FROM comment_votes WHERE comment_id = $1 AND user_wallet = $2',
            [commentId, userWallet]
          );
          action = 'removed';
          
          // Remove reputation if was upvote
          if (voteType === 'up') {
            reputationChange = -REPUTATION_POINTS.COMMENT_UPVOTED;
          }
        } else {
          // Update vote
          await client.query(
            'UPDATE comment_votes SET vote_type = $1 WHERE comment_id = $2 AND user_wallet = $3',
            [voteType, commentId, userWallet]
          );
          action = 'updated';
          
          // Adjust reputation (remove old, add new if upvote)
          if (currentVote === 'up') {
            reputationChange = -REPUTATION_POINTS.COMMENT_UPVOTED;
          }
          if (voteType === 'up') {
            reputationChange += REPUTATION_POINTS.COMMENT_UPVOTED;
          }
        }
      } else {
        // Insert new vote
        await client.query(
          'INSERT INTO comment_votes (comment_id, user_wallet, vote_type) VALUES ($1, $2, $3)',
          [commentId, userWallet, voteType]
        );
        
        // Award reputation for upvote
        if (voteType === 'up') {
          reputationChange = REPUTATION_POINTS.COMMENT_UPVOTED;
        }
      }

      // Update reputation if changed
      if (reputationChange !== 0) {
        await client.query(
          `INSERT INTO user_social_profiles (user_wallet, reputation_points)
           VALUES ($1, $2)
           ON CONFLICT (user_wallet) 
           DO UPDATE SET 
             reputation_points = GREATEST(0, user_social_profiles.reputation_points + $2),
             reputation_level = CASE
               WHEN GREATEST(0, user_social_profiles.reputation_points + $2) >= 251 THEN 'Legend'
               WHEN GREATEST(0, user_social_profiles.reputation_points + $2) >= 101 THEN 'Expert'
               WHEN GREATEST(0, user_social_profiles.reputation_points + $2) >= 51 THEN 'Contributor'
               WHEN GREATEST(0, user_social_profiles.reputation_points + $2) >= 11 THEN 'Explorer'
               ELSE 'Newbie'
             END,
             updated_at = CURRENT_TIMESTAMP`,
          [commentOwner, reputationChange]
        );
      }

      // Update comment vote counts
      const voteCounts = await client.query(
        `SELECT 
           COUNT(*) FILTER (WHERE vote_type = 'up')::INTEGER as upvotes,
           COUNT(*) FILTER (WHERE vote_type = 'down')::INTEGER as downvotes
         FROM comment_votes 
         WHERE comment_id = $1`,
        [commentId]
      );

      const { upvotes, downvotes } = voteCounts.rows[0];

      await client.query(
        'UPDATE deal_comments SET upvotes = $1, downvotes = $2 WHERE id = $3',
        [upvotes, downvotes, commentId]
      );

      // Create notification if upvote threshold reached (5+)
      if (voteType === 'up' && upvotes >= 5 && action === 'new') {
        const notificationCheck = await client.query(
          `SELECT 1 FROM user_notifications 
           WHERE user_wallet = $1 
           AND notification_type = 'comment_upvoted'
           AND link LIKE $2
           LIMIT 1`,
          [commentOwner, `%comment-${commentId}%`]
        );

        if (notificationCheck.rows.length === 0) {
          await client.query(
            `INSERT INTO user_notifications (user_wallet, notification_type, title, message, link)
             VALUES ($1, 'comment_upvoted', 'Popular Comment', 'Your comment reached 5+ upvotes!', $2)`,
            [commentOwner, `#comment-${commentId}`]
          );
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        action,
        upvotes,
        downvotes,
        userVote: action === 'removed' ? null : voteType
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error voting on comment:', error);
    return NextResponse.json(
      { error: 'Failed to vote on comment' },
      { status: 500 }
    );
  }
}

