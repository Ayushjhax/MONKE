import { NextRequest, NextResponse } from 'next/server';
import { getOfferById, updateOfferStatus } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { offerId } = await request.json();

    if (!offerId) {
      return NextResponse.json(
        { success: false, error: 'Missing offerId' },
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

    // Update offer status to completed
    await updateOfferStatus(offerId, 'completed');
    
    // Update transaction status
    const { pool } = await import('@/lib/db');
    const client = await pool.connect();
    
    try {
      await client.query(
        `UPDATE transactions 
         SET nft_transfer_status = 'completed',
             updated_at = CURRENT_TIMESTAMP
         WHERE offer_id = $1`,
        [offerId]
      );

      client.release();

      return NextResponse.json({
        success: true,
        message: 'Transfer marked as completed'
      });

    } catch (error: any) {
      client.release();
      throw error;
    }

  } catch (error: any) {
    console.error('Error marking as transferred:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark as transferred' },
      { status: 500 }
    );
  }
}

