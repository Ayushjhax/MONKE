// Sync Merchant API Route - Store merchant keypair in database
import { NextRequest, NextResponse } from 'next/server';
import { createMerchant, initializeDatabase, getMerchantByWallet } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Initialize database if needed
    await initializeDatabase();

    const { username, publicKey, secretKey } = await request.json();

    if (!username || !publicKey || !secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: username, publicKey, secretKey'
        },
        { status: 400 }
      );
    }

    // Check if merchant already exists
    const existingMerchant = await getMerchantByWallet(publicKey);
    
    if (existingMerchant) {
      return NextResponse.json({
        success: true,
        message: 'Merchant already exists in database',
        merchant: existingMerchant
      });
    }

    // Create merchant in database
    const dbMerchant = await createMerchant({
      username,
      public_key: publicKey,
      secret_key: secretKey
    });

    return NextResponse.json({
      success: true,
      message: 'Merchant keypair stored in database successfully',
      merchant: dbMerchant
    });

  } catch (error) {
    console.error('Error syncing merchant:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync merchant'
      },
      { status: 500 }
    );
  }
}
