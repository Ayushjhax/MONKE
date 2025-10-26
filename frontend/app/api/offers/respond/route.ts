import { NextRequest, NextResponse } from 'next/server';
import { getOfferById, updateOfferStatus, createTransaction, updateResaleListingStatus } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { offerId, action } = await request.json();

    if (!offerId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const offer = await getOfferById(offerId);
    if (!offer) {
      return NextResponse.json(
        { success: false, error: 'Offer not found' },
        { status: 404 }
      );
    }

    if (action === 'accept') {
      // Update offer status
      await updateOfferStatus(offerId, 'accepted');

      // Create transaction record
      const transaction = await createTransaction({
        offer_id: offerId,
        nft_address: offer.nft_address,
        buyer_wallet: offer.buyer_wallet,
        seller_wallet: offer.seller_wallet,
        amount: offer.offer_amount,
        payment_status: 'pending',
        nft_transfer_status: 'pending'
      });

      // Update listing status
      await updateResaleListingStatus(
        offer.listing_id,
        'sold',
        offer.buyer_wallet
      );

      return NextResponse.json({
        success: true,
        message: 'Offer accepted',
        transaction,
        buyerWallet: offer.buyer_wallet,
        amount: offer.offer_amount
      });

    } else if (action === 'reject') {
      await updateOfferStatus(offerId, 'rejected');
      
      return NextResponse.json({
        success: true,
        message: 'Offer rejected'
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Error responding to offer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to respond to offer' },
      { status: 500 }
    );
  }
}

