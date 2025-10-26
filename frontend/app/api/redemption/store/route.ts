// Store coupon redemption data
import { NextRequest, NextResponse } from 'next/server';
import { pool, initializeDatabase } from '@/lib/db';

// Initialize database on first request
let dbInitialized = false;

export async function POST(request: NextRequest) {
  try {
    // Initialize database if not already done
    if (!dbInitialized) {
      await initializeDatabase();
      dbInitialized = true;
    }

    const { nftMint, walletAddress, couponCode, txSignature, discountValue, merchantName } = await request.json();

    if (!nftMint || !walletAddress || !couponCode || !txSignature) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: nftMint, walletAddress, couponCode, txSignature'
        },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // Check if coupon code redemption table exists, create if not
      await client.query(`
        CREATE TABLE IF NOT EXISTS coupon_redemptions (
          id SERIAL PRIMARY KEY,
          nft_mint VARCHAR(255) UNIQUE NOT NULL,
          wallet_address VARCHAR(44) NOT NULL,
          coupon_code VARCHAR(50) NOT NULL,
          tx_signature VARCHAR(88) NOT NULL,
          discount_value INTEGER DEFAULT 0,
          merchant_name VARCHAR(255),
          redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert coupon redemption record
      const insertQuery = `
        INSERT INTO coupon_redemptions (nft_mint, wallet_address, coupon_code, tx_signature, discount_value, merchant_name)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        nftMint,
        walletAddress,
        couponCode,
        txSignature,
        discountValue || 0,
        merchantName || 'Unknown'
      ]);

      client.release();

      return NextResponse.json({
        success: true,
        redemption: result.rows[0],
        message: 'Coupon redemption stored successfully'
      });

    } catch (error: any) {
      client.release();
      
      // If it's a duplicate key error, return existing record
      if (error.code === '23505') { // Unique violation
        const existingResult = await pool.query(
          'SELECT * FROM coupon_redemptions WHERE nft_mint = $1',
          [nftMint]
        );
        
        if (existingResult.rows.length > 0) {
          return NextResponse.json({
            success: true,
            redemption: existingResult.rows[0],
            message: 'Coupon redemption already exists',
            isExisting: true
          });
        }
      }
      
      throw error;
    }

  } catch (error) {
    console.error('Error storing coupon redemption:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to store coupon redemption'
      },
      { status: 500 }
    );
  }
}
