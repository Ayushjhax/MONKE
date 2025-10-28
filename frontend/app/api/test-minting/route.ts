// Test endpoint for NFT minting
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({ success: false, error: 'Disabled in production build' }, { status: 501 });

  } catch (error) {
    console.error('Test minting failed:', error);
    return NextResponse.json(
      { success: false, error: 'Test minting failed' },
      { status: 500 }
    );
  }
}
