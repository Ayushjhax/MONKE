// Get all active resale listings for marketplace
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
    
    // Filter only active listings
    const activeListings = listings.filter(listing => listing.status === 'active');

    // Fetch NFT metadata for each listing
    const listingsWithMetadata = await Promise.all(
      activeListings.map(async (listing) => {
        try {
          // Fetch NFT data from Helius DAS API
          const response = await fetch(HELIUS_RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 'get-asset',
              method: 'getAsset',
              params: {
                id: listing.nft_address
              }
            })
          });

          const data = await response.json();
          const asset = data.result;

          if (asset && asset.content?.metadata) {
            // Fetch complete metadata from IPFS if needed
            let completeMetadata = asset.content.metadata;
            
            if (!asset.content.metadata.attributes || asset.content.metadata.attributes.length === 0) {
              const jsonUri = asset.content?.json_uri;
              if (jsonUri) {
                try {
                  const metadataResponse = await fetch(jsonUri);
                  if (metadataResponse.ok) {
                    completeMetadata = await metadataResponse.json();
                  }
                } catch (error) {
                  console.log(`Failed to fetch metadata from IPFS for ${listing.nft_address}:`, error);
                }
              }
            }

            return {
              ...listing,
              asset_data: {
                ...asset,
                content: {
                  ...asset.content,
                  metadata: completeMetadata
                }
              }
            };
          }

          return listing;
        } catch (error) {
          console.error(`Error fetching metadata for ${listing.nft_address}:`, error);
          return listing;
        }
      })
    );

    return NextResponse.json({
      success: true,
      listings: listingsWithMetadata,
      total: listingsWithMetadata.length
    });

  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch marketplace listings' },
      { status: 500 }
    );
  }
}
