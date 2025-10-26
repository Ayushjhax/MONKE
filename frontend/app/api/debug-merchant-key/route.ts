// Debug endpoint to check merchant secret key format
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { merchantId } = await request.json();

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'Missing merchantId parameter' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, username, public_key, secret_key
        FROM merchants 
        WHERE username = $1
        LIMIT 1
      `;
      
      const result = await client.query(query, [merchantId]);
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: `Merchant not found: ${merchantId}` },
          { status: 404 }
        );
      }
      
      const merchant = result.rows[0];
      
      // Detailed analysis of secret key
      const secretKeyAnalysis = {
        type: typeof merchant.secret_key,
        isArray: Array.isArray(merchant.secret_key),
        length: merchant.secret_key?.length,
        first10: merchant.secret_key?.slice(0, 10),
        last10: merchant.secret_key?.slice(-10),
        allValues: merchant.secret_key,
        isValidLength: merchant.secret_key?.length === 64,
        isUint8Array: merchant.secret_key instanceof Uint8Array,
        constructor: merchant.secret_key?.constructor?.name
      };
      
      return NextResponse.json({
        success: true,
        merchant: {
          id: merchant.id,
          username: merchant.username,
          publicKey: merchant.public_key
        },
        secretKeyAnalysis
      });
      
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Debug failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Debug failed', 
        details: error.message || 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
