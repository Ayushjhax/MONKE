// Test endpoint for actual NFT minting with secret key
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({ success: false, error: 'Disabled in production build' }, { status: 501 });
  } catch (error: any) {
    console.error('❌ Test minting failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test minting failed', 
        details: error.message || 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
