// List NFT for resale
import { NextRequest, NextResponse } from 'next/server';
import { createResaleListing, getResaleListingByAssetId, initializeDatabase, pool } from '@/lib/db';

// Initialize database on first request
let dbInitialized = false;

export async function POST(request: NextRequest) {
  try {
    // Initialize database if not already done
    if (!dbInitialized) {
      await initializeDatabase();
      dbInitialized = true;
    }

    const { assetId, sellerWallet, priceSol } = await request.json();

    if (!assetId || !sellerWallet || !priceSol) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: assetId, sellerWallet, priceSol' },
        { status: 400 }
      );
    }

    if (priceSol <= 0) {
      return NextResponse.json(
        { success: false, error: 'Price must be greater than 0' },
        { status: 400 }
      );
    }

    // Check if asset is already listed
    const existingListing = await getResaleListingByAssetId(assetId);
    if (existingListing && existingListing.status === 'active') {
      return NextResponse.json(
        { success: false, error: 'This NFT is already listed for sale' },
        { status: 400 }
      );
    }

    // If listing exists but is not active, update it
    if (existingListing && existingListing.status !== 'active') {
      const query = `
        UPDATE resale_listings 
        SET seller_wallet = $1, price = $2, status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE nft_address = $3
        RETURNING *
      `;
      
      const client = await pool.connect();
      const result = await client.query(query, [sellerWallet, priceSol, assetId]);
      client.release();
      
      const listing = result.rows[0];
      
      return NextResponse.json({
        success: true,
        listing,
        message: 'NFT relisted for resale successfully',
      });
    }

    // Create new listing
    const listing = await createResaleListing(assetId, sellerWallet, priceSol);

    return NextResponse.json({
      success: true,
      listing,
      message: 'NFT listed for resale successfully',
    });

  } catch (error) {
    console.error('Error creating resale listing:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create listing',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
