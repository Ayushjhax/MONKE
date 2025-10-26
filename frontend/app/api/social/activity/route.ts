// API route for fetching activity feed
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const activityType = searchParams.get('activityType');
    const userWallet = searchParams.get('userWallet');

    const client = await pool.connect();

    try {
      let query = `
        SELECT 
          a.*,
          p.display_name,
          p.avatar_url,
          p.reputation_level
        FROM social_activities a
        LEFT JOIN user_social_profiles p ON a.user_wallet = p.user_wallet
      `;

      const values: any[] = [];
      const conditions: string[] = [];

      if (activityType) {
        conditions.push(`a.activity_type = $${values.length + 1}`);
        values.push(activityType);
      }

      if (userWallet) {
        conditions.push(`a.user_wallet = $${values.length + 1}`);
        values.push(userWallet);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ` ORDER BY a.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(limit, offset);

      const result = await client.query(query, values);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*)::INTEGER as total FROM social_activities';
      if (conditions.length > 0) {
        countQuery += ' WHERE ' + conditions.join(' AND ').replace(/a\./g, '');
      }

      const countResult = await client.query(
        countQuery,
        values.slice(0, conditions.length)
      );

      return NextResponse.json({
        activities: result.rows,
        total: countResult.rows[0].total,
        limit,
        offset
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 }
    );
  }
}

