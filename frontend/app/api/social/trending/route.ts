// API route for fetching trending deals
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const dealType = searchParams.get('dealType'); // Optional filter by type

    const client = await pool.connect();

    try {
      let query = `
        SELECT * FROM deal_social_stats
        WHERE hotness_score > 0
      `;

      const values: any[] = [];
      
      if (dealType) {
        query += ' AND deal_type = $1';
        values.push(dealType);
      }

      query += ` ORDER BY hotness_score DESC, last_updated DESC LIMIT $${values.length + 1}`;
      values.push(limit);

      const result = await client.query(query, values);

      return NextResponse.json({
        trending: result.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching trending deals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending deals' },
      { status: 500 }
    );
  }
}

