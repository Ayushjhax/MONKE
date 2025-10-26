import { NextRequest, NextResponse } from 'next/server';
import { getOffersBySeller } from '@/lib/db';

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

    const offers = await getOffersBySeller(wallet);

    return NextResponse.json({
      success: true,
      offers
    });

  } catch (error: any) {
    console.error('Error fetching received offers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}

