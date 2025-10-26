// Verify coupon redemption
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
    const txSignature = searchParams.get('txSignature');
    const couponCode = searchParams.get('couponCode');

    if (!txSignature && !couponCode) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: txSignature or couponCode' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      let query = '';
      let params: string[] = [];

      if (txSignature) {
        query = 'SELECT * FROM coupon_redemptions WHERE tx_signature = $1';
        params = [txSignature];
      } else if (couponCode) {
        query = 'SELECT * FROM coupon_redemptions WHERE coupon_code = $1';
        params = [couponCode];
      }

      const result = await client.query(query, params);
      client.release();

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Coupon redemption not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        redemption: result.rows[0],
        isValid: true
      });

    } catch (error: any) {
      client.release();
      throw error;
    }

  } catch (error) {
    console.error('Error verifying coupon redemption:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify coupon redemption'
      },
      { status: 500 }
    );
  }
}
