import { NextRequest, NextResponse } from 'next/server';
import { getOfferById, updateOfferStatus } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { offerId, paymentSignature } = await request.json();

    if (!offerId || !paymentSignature) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the offer to find the transaction
    const offer = await getOfferById(offerId);
    if (!offer) {
      return NextResponse.json(
        { success: false, error: 'Offer not found' },
        { status: 404 }
      );
    }

    // Update offer with payment signature
    const { pool } = await import('@/lib/db');
    const client = await pool.connect();
    
    try {
      // Update offer status to show payment completed
      await client.query(
        'UPDATE offers SET payment_signature = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [paymentSignature, 'paid', offerId]
      );

      // Update transaction status to completed
      await client.query(
        `UPDATE transactions 
         SET payment_status = 'completed', payment_signature = $1, updated_at = CURRENT_TIMESTAMP
         WHERE offer_id = $2`,
        [paymentSignature, offerId]
      );

      client.release();

      return NextResponse.json({
        success: true,
        message: 'Payment recorded successfully'
      });

    } catch (error: any) {
      client.release();
      throw error;
    }

  } catch (error: any) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}

