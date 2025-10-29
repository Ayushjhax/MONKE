import { NextRequest, NextResponse } from 'next/server';
import { claimAllRewardsForOwner, initializeDatabase } from '@/lib/db';

// fs-based storage removed; using database instead

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    const { ownerAddress } = await request.json();

    if (!ownerAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: ownerAddress' },
        { status: 400 }
      );
    }

    const totalRewards = await claimAllRewardsForOwner(ownerAddress);
    if (totalRewards === 0) {
      return NextResponse.json(
        { success: false, error: 'No pending rewards to claim' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      totalAmount: Math.round(totalRewards * 1000000) / 1000000,
      message: `Successfully claimed ${totalRewards.toFixed(6)} rewards`
    });
  } catch (error) {
    console.error('Error claiming rewards:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

