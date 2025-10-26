import { NextRequest, NextResponse } from 'next/server';
import { createOffer, getResaleListingById } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { listingId, buyerWallet, offerAmount } = await request.json();

    if (!listingId || !buyerWallet || !offerAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get listing details
    const listing = await getResaleListingById(listingId);
    if (!listing || listing.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Listing not found or not active' },
        { status: 404 }
      );
    }

    // Create offer
    const offer = await createOffer(
      listingId,
      listing.nft_address,
      buyerWallet,
      listing.seller_wallet,
      offerAmount
    );

    return NextResponse.json({
      success: true,
      offer
    });

  } catch (error: any) {
    console.error('Error creating offer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create offer' },
      { status: 500 }
    );
  }
}

