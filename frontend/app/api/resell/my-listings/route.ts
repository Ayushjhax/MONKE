import { NextRequest, NextResponse } from 'next/server';
import { getResaleListings, getResaleListingByAssetId } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Missing wallet parameter' },
        { status: 400 }
      );
    }

    const listings = await getResaleListings();
    
    // Filter listings for this wallet
    const myListings = listings.filter(
      (listing: any) => listing.seller_wallet === wallet && listing.status === 'active'
    );

    return NextResponse.json({
      success: true,
      listings: myListings
    });

  } catch (error: any) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}

