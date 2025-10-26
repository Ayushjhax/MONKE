// Get all active resale listings with asset data
import { NextRequest, NextResponse } from 'next/server';
import { getResaleListings, initializeDatabase } from '@/lib/db';

const HELIUS_RPC_URL = 'https://devnet.helius-rpc.com/?api-key=22abefb4-e86a-482d-9a62-452fcd4f2cb0';

// Initialize database on first request
let dbInitialized = false;

export async function GET(request: NextRequest) {
  try {
    // Initialize database if not already done
    if (!dbInitialized) {
      await initializeDatabase();
      dbInitialized = true;
    }

    const listings = await getResaleListings();

    // Fetch asset data for each listing
    const listingsWithAssets = await Promise.all(
      listings.map(async (listing) => {
        try {
          // Fetch asset data from Helius DAS API
          const response = await fetch(HELIUS_RPC_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 'my-request-id',
              method: 'getAsset',
              params: {
                id: listing.asset_id,
              },
            }),
          });

          const data = await response.json();
          const assetData = data.result;

          return {
            ...listing,
            asset_data: assetData,
          };
        } catch (error) {
          console.error(`Error fetching asset data for ${listing.asset_id}:`, error);
          return listing; // Return listing without asset data if fetch fails
        }
      })
    );

    return NextResponse.json({
      success: true,
      listings: listingsWithAssets,
    });

  } catch (error) {
    console.error('Error fetching resale listings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}
