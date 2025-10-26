// Bookings API Route
// Get all bookings for a user wallet

import { NextRequest, NextResponse } from 'next/server';
import { pool, initializeDatabase } from '@/lib/db';

// Initialize database on first request
let dbInitialized = false;

/**
 * GET /api/bookings?wallet=WALLET_ADDRESS
 * Returns all bookings for a user wallet
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

    console.log(`📋 Fetching bookings for wallet: ${wallet}`);

    const client = await pool.connect();

    try {
      // Get all bookings for this wallet
      const bookingsQuery = `
        SELECT 
          id,
          user_wallet,
          deal_type,
          amadeus_offer_id,
          original_price,
          discount_applied,
          final_price,
          coupon_code,
          booking_reference,
          status,
          booking_details,
          booked_at
        FROM deal_bookings
        WHERE user_wallet = $1
        ORDER BY booked_at DESC
      `;

      const result = await client.query(bookingsQuery, [wallet]);
      const bookings = result.rows;

      client.release();

      console.log(`✅ Found ${bookings.length} bookings`);

      return NextResponse.json({
        success: true,
        count: bookings.length,
        wallet,
        bookings: bookings.map(booking => ({
          id: booking.id,
          bookingReference: booking.booking_reference,
          dealType: booking.deal_type,
          amadeusOfferId: booking.amadeus_offer_id,
          originalPrice: parseFloat(booking.original_price),
          discountApplied: parseFloat(booking.discount_applied),
          finalPrice: parseFloat(booking.final_price),
          couponCode: booking.coupon_code,
          status: booking.status,
          bookedAt: booking.booked_at,
          bookingDetails: booking.booking_details,
        })),
      });
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Error fetching bookings:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bookings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

