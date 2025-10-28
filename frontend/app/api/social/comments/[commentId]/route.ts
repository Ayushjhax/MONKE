// API route for editing/deleting specific comments
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { sanitizeCommentText, validateCommentText } from '@/lib/social-helpers';

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await ctx.params;
    const body = await req.json();
    const { commentText, userWallet } = body;

    // Validation
    if (!commentText || !userWallet) {
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

    const client = await pool.connect();

    try {
      // Check ownership
      const ownershipCheck = await client.query(
        'SELECT user_wallet FROM deal_comments WHERE id = $1',
        [commentId]
      );

      if (ownershipCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Comment not found' },
          { status: 404 }
        );
      }

      if (ownershipCheck.rows[0].user_wallet !== userWallet) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      // Update comment
      const sanitizedText = sanitizeCommentText(commentText);
      const result = await client.query(
        `UPDATE deal_comments 
         SET comment_text = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [sanitizedText, commentId]
      );

      // Fetch comment with profile info
      const fullCommentResult = await client.query(
        `SELECT c.*, p.display_name, p.avatar_url, p.reputation_level
         FROM deal_comments c
         LEFT JOIN user_social_profiles p ON c.user_wallet = p.user_wallet
         WHERE c.id = $1`,
        [commentId]
      );

      return NextResponse.json({
        success: true,
        comment: fullCommentResult.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const userWallet = searchParams.get('userWallet');

    if (!userWallet) {
      return NextResponse.json(
        { error: 'userWallet is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check ownership
      const ownershipCheck = await client.query(
        'SELECT user_wallet, deal_id FROM deal_comments WHERE id = $1',
        [commentId]
      );

      if (ownershipCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Comment not found' },
          { status: 404 }
        );
      }

      if (ownershipCheck.rows[0].user_wallet !== userWallet) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      // Soft delete
      await client.query(
        'UPDATE deal_comments SET deleted = TRUE WHERE id = $1',
        [commentId]
      );

      // Update comment count
      const dealId = ownershipCheck.rows[0].deal_id;
      const commentCount = await client.query(
        'SELECT COUNT(*)::INTEGER as count FROM deal_comments WHERE deal_id = $1 AND deleted = FALSE',
        [dealId]
      );

      await client.query(
        `UPDATE deal_social_stats 
         SET comment_count = $1, last_updated = CURRENT_TIMESTAMP
         WHERE deal_id = $2`,
        [commentCount.rows[0].count, dealId]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}

