// API route for user social profiles
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { checkBadgeEligibility } from '@/lib/social-helpers';
import { Badge } from '@/lib/social-types';

export async function GET(req: NextRequest) {
  try {
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
      // Get or create profile
      let profileResult = await client.query(
        'SELECT * FROM user_social_profiles WHERE user_wallet = $1',
        [userWallet]
      );

      let profile;

      if (profileResult.rows.length === 0) {
        // Create default profile
        const createResult = await client.query(
          `INSERT INTO user_social_profiles (user_wallet)
           VALUES ($1)
           RETURNING *`,
          [userWallet]
        );
        profile = createResult.rows[0];
      } else {
        profile = profileResult.rows[0];
      }

      // Get user stats for badge checking
      const statsResult = await client.query(
        `SELECT
          (SELECT COUNT(*)::INTEGER FROM deal_ratings WHERE user_wallet = $1) as rating_count,
          (SELECT COUNT(*)::INTEGER FROM deal_comments WHERE user_wallet = $1 AND deleted = FALSE) as comment_count,
          (SELECT COUNT(*)::INTEGER FROM deal_shares WHERE user_wallet = $1) as share_count,
          (SELECT COUNT(*)::INTEGER FROM deal_shares ds
           INNER JOIN deal_social_stats dss ON ds.deal_id = dss.deal_id
           WHERE ds.user_wallet = $1 AND dss.upvote_count >= 50) as viral_shares`,
        [userWallet]
      );

      const stats = statsResult.rows[0];

      // Check for new badges
      const newBadges = checkBadgeEligibility(profile, stats);

      // Award new badges if any
      if (newBadges.length > 0) {
        const allBadges = [...profile.badges, ...newBadges];

        await client.query(
          'UPDATE user_social_profiles SET badges = $1, updated_at = CURRENT_TIMESTAMP WHERE user_wallet = $2',
          [JSON.stringify(allBadges), userWallet]
        );

        // Create notifications for each badge
        for (const badge of newBadges) {
          await client.query(
            `INSERT INTO user_notifications (user_wallet, notification_type, title, message)
             VALUES ($1, 'badge_earned', $2, $3)`,
            [userWallet, `Badge Earned: ${badge.name}`, badge.description]
          );

          // Create activity
          await client.query(
            `INSERT INTO social_activities (user_wallet, activity_type, metadata)
             VALUES ($1, 'earned_badge', $2)`,
            [userWallet, JSON.stringify({ badge: badge.name })]
          );
        }

        profile.badges = allBadges;
      }

      return NextResponse.json({
        profile,
        stats
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userWallet, displayName, avatarUrl } = body;

    if (!userWallet) {
      return NextResponse.json(
        { error: 'userWallet is required' },
        { status: 400 }
      );
    }

    if (displayName && displayName.length > 100) {
      return NextResponse.json(
        { error: 'Display name must be 100 characters or less' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (displayName !== undefined) {
        updates.push(`display_name = $${paramIndex++}`);
        values.push(displayName);
      }

      if (avatarUrl !== undefined) {
        updates.push(`avatar_url = $${paramIndex++}`);
        values.push(avatarUrl);
      }

      if (updates.length === 0) {
        return NextResponse.json(
          { error: 'No updates provided' },
          { status: 400 }
        );
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(userWallet);

      const query = `
        INSERT INTO user_social_profiles (user_wallet, ${displayName !== undefined ? 'display_name,' : ''} ${avatarUrl !== undefined ? 'avatar_url,' : ''} updated_at)
        VALUES ($${values.length}, ${displayName !== undefined ? `$1,` : ''} ${avatarUrl !== undefined ? `$${displayName !== undefined ? 2 : 1},` : ''} CURRENT_TIMESTAMP)
        ON CONFLICT (user_wallet)
        DO UPDATE SET ${updates.join(', ')}
        RETURNING *
      `;

      const result = await client.query(query, values);

      return NextResponse.json({
        success: true,
        profile: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

