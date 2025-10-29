import { NextRequest, NextResponse } from 'next/server';
import { getStakingStatsForOwner, initializeDatabase } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    await initializeDatabase();
    const { address } = await params;
    const ownerAddress = address;

    if (!ownerAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing address parameter' },
        { status: 400 }
      );
    }

    const stats = await getStakingStatsForOwner(ownerAddress);

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

