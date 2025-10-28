// Add Collection to Marketplace API Route
import { NextRequest, NextResponse } from 'next/server';
import { createCollection, initializeDatabase, getCollectionByMint } from '@/lib/db';

// Initialize database on first request
let dbInitialized = false;

export async function POST(request: NextRequest) {
  try {
    // Initialize database if not already done
    if (!dbInitialized) {
      await initializeDatabase();
      dbInitialized = true;
    }

    const {
      name,
      symbol,
      description,
      imageUrl,
      collectionMint,
      merkleTree,
      merchantId,
      merchantName,
      merchantWallet,
      category,
      discountPercent,
      originalPrice,
      discountedPrice,
      location,
      expiryDate,
      maxUses
    } = await request.json();

    // Validate required fields
    if (!name || !collectionMint || !merkleTree || !merchantId || !merchantName || !merchantWallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, collectionMint, merkleTree, merchantId, merchantName, merchantWallet'
        },
        { status: 400 }
      );
    }

    // Create collection data
    const collectionData = {
      name,
      symbol: symbol || 'DEAL',
      description: description || '',
      image_url: imageUrl || 'https://ayushjhax.github.io/restaurant-discount.jpg',
      collection_mint: collectionMint,
      merkle_tree: merkleTree,
      merchant_id: merchantId,
      merchant_name: merchantName,
      merchant_wallet: merchantWallet,
      category: category || 'General',
      discount_percent: discountPercent || 0,
      original_price: originalPrice || 0,
      discounted_price: discountedPrice || 0,
      location: location || 'Global',
      expiry_date: expiryDate ? new Date(expiryDate).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      max_uses: maxUses || 999999,
      current_uses: 0,
      status: 'Active' as const
    };

    // Check if collection already exists
    const existingCollection = await getCollectionByMint(collectionMint);
    
    if (existingCollection) {
      return NextResponse.json({
        success: true,
        collection: existingCollection,
        message: 'Collection already exists in marketplace',
        isExisting: true
      });
    }
    // Add to database
    const collection = await createCollection(collectionData);

    return NextResponse.json({
      success: true,
      collection,
      message: 'Collection added to marketplace successfully',
      isExisting: false
    });

  } catch (error) {
    console.error('Error adding collection to marketplace:', error);
    
    // Handle duplicate key error specifically
    if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
      try {
        const body = await request.json().catch(() => ({}));
        const existingCollection = body?.collectionMint ? await getCollectionByMint(body.collectionMint) : null;
        if (existingCollection) {
          return NextResponse.json({
            success: true,
            collection: existingCollection,
            message: 'Collection already exists in marketplace',
            isExisting: true
          });
        }
      } catch (fetchError) {
        console.error('Error fetching existing collection:', fetchError);
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add collection to marketplace'
      },
      { status: 500 }
    );
  }
}
