import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, setStakePendingUnstake } from '@/lib/db';


const COOLDOWN_DAYS = 7;

// FS-based helpers removed; DB is the source of truth.

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    const { stakeId, ownerAddress } = await request.json();

    if (!stakeId || !ownerAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: stakeId and ownerAddress' },
        { status: 400 }
      );
    }

    // Calculate cooldown
    const cooldownEndsAt = new Date(Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await setStakePendingUnstake(stakeId, cooldownEndsAt);

    return NextResponse.json({
      success: true,
      cooldownEndsAt,
      message: 'Unstaking initiated. Cooldown period: 7 days'
    });
  } catch (error) {
    console.error('Error in unstake endpoint:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

