// User Coupons API Route
// Get all available (unused) coupons for a user wallet

import { NextRequest, NextResponse } from 'next/server';
import { pool, initializeDatabase } from '@/lib/db';

// Initialize database on first request
let dbInitialized = false;

/**
 * GET /api/redemption/user-coupons?wallet=WALLET_ADDRESS
 * Returns all available coupons for a user (not yet used for bookings)
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize database if not already done
    if (!dbInitialized) {
      await initializeDatabase();
      dbInitialized = true;
    }

    const searchParams = request.nextUrl.searchParams;
    const wallet = searchParams.get('wallet');

    // Validation
    if (!wallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: wallet',
        },
        { status: 400 }
      );
    }

    console.log(`🎫 Fetching available coupons for wallet: ${wallet}`);

    const client = await pool.connect();

    try {
      // Get all redeemed coupons for this wallet
      const redemptionsQuery = `
        SELECT 
          cr.id,
          cr.nft_mint,
          cr.wallet_address,
          cr.coupon_code,
          cr.tx_signature,
          cr.discount_value,
          cr.merchant_name,
          cr.redeemed_at
        FROM coupon_redemptions cr
        WHERE cr.wallet_address = $1
        ORDER BY cr.redeemed_at DESC
      `;

      const redemptionsResult = await client.query(redemptionsQuery, [wallet]);
      const allCoupons = redemptionsResult.rows;

      // Get list of already-used coupon codes
      const usedCodesQuery = `
        SELECT coupon_code
        FROM user_coupons_applied
        WHERE user_wallet = $1
      `;

      const usedCodesResult = await client.query(usedCodesQuery, [wallet]);
      const usedCodes = new Set(usedCodesResult.rows.map(row => row.coupon_code));

      // Filter out used coupons
      const availableCoupons = allCoupons.filter(
        coupon => !usedCodes.has(coupon.coupon_code)
      );

      client.release();

      console.log(`✅ Found ${availableCoupons.length} available coupons (${allCoupons.length} total, ${usedCodes.size} used)`);

      return NextResponse.json({
        success: true,
        wallet,
        totalCoupons: allCoupons.length,
        usedCoupons: usedCodes.size,
        availableCoupons: availableCoupons.length,
        coupons: availableCoupons.map(coupon => ({
          id: coupon.id,
          nftMint: coupon.nft_mint,
          couponCode: coupon.coupon_code,
          discountValue: coupon.discount_value,
          merchantName: coupon.merchant_name,
          redeemedAt: coupon.redeemed_at,
          txSignature: coupon.tx_signature,
        })),
      });
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Error fetching user coupons:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user coupons',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

