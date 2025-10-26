// List all coupon redemptions (for merchants)
import { NextRequest, NextResponse } from 'next/server';
import { pool, initializeDatabase } from '@/lib/db';

// Initialize database on first request
let dbInitialized = false;

export async function GET(request: NextRequest) {
  try {
    // Initialize database if not already done
    if (!dbInitialized) {
      await initializeDatabase();
      dbInitialized = true;
    }

    const { searchParams } = new URL(request.url);
    const merchantName = searchParams.get('merchant');
    const walletAddress = searchParams.get('wallet');

    const client = await pool.connect();
    
    try {
      let query = 'SELECT * FROM coupon_redemptions';
      const params: string[] = [];
      const conditions: string[] = [];

      if (merchantName) {
        conditions.push(`LOWER(merchant_name) = LOWER($${params.length + 1})`);
        params.push(merchantName);
      }

      if (walletAddress) {
        conditions.push(`wallet_address = $${params.length + 1}`);
        params.push(walletAddress);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY redeemed_at DESC LIMIT 100';

      const result = await client.query(query, params);
      client.release();

      return NextResponse.json({
        success: true,
        count: result.rows.length,
        redemptions: result.rows
      });

    } catch (error: any) {
      client.release();
      throw error;
    }

  } catch (error) {
    console.error('Error listing coupon redemptions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list coupon redemptions'
      },
      { status: 500 }
    );
  }
}
