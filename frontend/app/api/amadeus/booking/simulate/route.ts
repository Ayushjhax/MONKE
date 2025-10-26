// Amadeus Booking Simulation API Route
// Simulates a booking with optional coupon application

import { NextRequest, NextResponse } from 'next/server';
import { pool, initializeDatabase } from '@/lib/db';
import { generateBookingReference, calculateDiscountedPrice } from '@/lib/amadeus';

// Initialize database on first request
let dbInitialized = false;

interface BookingRequest {
  userWallet: string;
  dealType: 'flight' | 'hotel';
  amadeusOfferId: string;
  originalPrice: number;
  currency?: string;
  couponCode?: string;
  bookingDetails: any;
}

/**
 * POST /api/amadeus/booking/simulate
 * Simulates a booking and optionally applies a coupon
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize database if not already done
    if (!dbInitialized) {
      await initializeDatabase();
      dbInitialized = true;
    }

    const body: BookingRequest = await request.json();
    const {
      userWallet,
      dealType,
      amadeusOfferId,
      originalPrice,
      currency = 'USD',
      couponCode,
      bookingDetails,
    } = body;

    // Validation
    if (!userWallet || !dealType || !amadeusOfferId || !originalPrice || !bookingDetails) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: userWallet, dealType, amadeusOfferId, originalPrice, bookingDetails',
        },
        { status: 400 }
      );
    }

    if (!['flight', 'hotel'].includes(dealType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid dealType. Must be "flight" or "hotel"',
        },
        { status: 400 }
      );
    }

    console.log(`🎯 Simulating ${dealType} booking for wallet: ${userWallet}`);

    const client = await pool.connect();

    try {
      let discountValue = 0;
      let finalPrice = originalPrice;
      let couponApplied = false;

      // If coupon code provided, validate and apply discount
      if (couponCode) {
        console.log(`🎫 Checking coupon: ${couponCode}`);

        // Check if coupon exists and belongs to this user
        const couponQuery = `
          SELECT 
            cr.id,
            cr.discount_value,
            cr.coupon_code,
            cr.merchant_name
          FROM coupon_redemptions cr
          WHERE cr.wallet_address = $1 AND cr.coupon_code = $2
        `;

        const couponResult = await client.query(couponQuery, [userWallet, couponCode]);

        if (couponResult.rows.length === 0) {
          client.release();
          return NextResponse.json(
            {
              success: false,
              error: 'Coupon not found or does not belong to this wallet',
            },
            { status: 404 }
          );
        }

        // Check if coupon has already been used
        const usedQuery = `
          SELECT id FROM user_coupons_applied
          WHERE coupon_code = $1
        `;

        const usedResult = await client.query(usedQuery, [couponCode]);

        if (usedResult.rows.length > 0) {
          client.release();
          return NextResponse.json(
            {
              success: false,
              error: 'Coupon has already been used',
            },
            { status: 400 }
          );
        }

        // Apply discount
        const discountPercent = couponResult.rows[0].discount_value;
        const discountCalc = calculateDiscountedPrice(originalPrice, discountPercent);
        
        discountValue = discountCalc.discountAmount;
        finalPrice = discountCalc.finalPrice;
        couponApplied = true;

        console.log(`✅ Coupon valid! Discount: ${discountPercent}% ($${discountValue})`);
      }

      // Generate unique booking reference
      let bookingReference = generateBookingReference();
      let referenceUnique = false;
      let attempts = 0;

      while (!referenceUnique && attempts < 10) {
        const checkQuery = `
          SELECT id FROM deal_bookings WHERE booking_reference = $1
        `;
        const checkResult = await client.query(checkQuery, [bookingReference]);
        
        if (checkResult.rows.length === 0) {
          referenceUnique = true;
        } else {
          bookingReference = generateBookingReference();
          attempts++;
        }
      }

      if (!referenceUnique) {
        throw new Error('Failed to generate unique booking reference');
      }

      // Insert booking
      const insertBookingQuery = `
        INSERT INTO deal_bookings (
          user_wallet,
          deal_type,
          amadeus_offer_id,
          original_price,
          discount_applied,
          final_price,
          coupon_code,
          booking_reference,
          status,
          booking_details
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const bookingValues = [
        userWallet,
        dealType,
        amadeusOfferId,
        originalPrice,
        discountValue,
        finalPrice,
        couponCode || null,
        bookingReference,
        'confirmed',
        JSON.stringify(bookingDetails),
      ];

      const bookingResult = await client.query(insertBookingQuery, bookingValues);
      const booking = bookingResult.rows[0];

      // If coupon was applied, mark it as used
      if (couponApplied && couponCode) {
        const applyCouponQuery = `
          INSERT INTO user_coupons_applied (
            user_wallet,
            coupon_code,
            deal_booking_id
          )
          VALUES ($1, $2, $3)
        `;

        await client.query(applyCouponQuery, [userWallet, couponCode, booking.id]);
        console.log(`✅ Coupon marked as used`);
      }

      client.release();

      console.log(`✅ Booking simulated successfully! Reference: ${bookingReference}`);

      return NextResponse.json({
        success: true,
        booking: {
          id: booking.id,
          bookingReference: booking.booking_reference,
          dealType: booking.deal_type,
          originalPrice: parseFloat(booking.original_price),
          discountApplied: parseFloat(booking.discount_applied),
          finalPrice: parseFloat(booking.final_price),
          couponCode: booking.coupon_code,
          status: booking.status,
          bookedAt: booking.booked_at,
        },
        message: couponApplied
          ? `Booking confirmed with ${discountValue}% discount!`
          : 'Booking confirmed!',
      });
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Error simulating booking:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to simulate booking',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

