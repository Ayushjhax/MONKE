// Transfer NFT after successful payment using modular approach
import { NextRequest, NextResponse } from 'next/server';
import { PublicKey, Keypair } from '@solana/web3.js';
import { getResaleListingByAssetId, updateResaleListingStatus } from '@/lib/db';
import { mintNFTToBuyer } from '@/lib/nft-minting';

const HELIUS_RPC_URL = 'https://devnet.helius-rpc.com/?api-key=22abefb4-e86a-482d-9a62-452fcd4f2cb0';

export async function POST(request: NextRequest) {
  try {
    const { listingId, buyerWallet, paymentSignature } = await request.json();

    if (!listingId || !buyerWallet || !paymentSignature) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: listingId, buyerWallet, paymentSignature' },
        { status: 400 }
      );
    }

    console.log('🔄 Processing NFT transfer request:', {
      listingId,
      buyerWallet,
      paymentSignature: paymentSignature.substring(0, 10) + '...'
    });

    // Get the listing details
    const listing = await getResaleListingByAssetId(listingId);
    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }

    console.log('✅ Found listing:', {
      id: listing.id,
      nftAddress: listing.nft_address,
      seller: listing.seller_wallet,
      price: listing.price
    });

    // Get the NFT data from Helius to find its merchant
    const assetResponse = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-asset',
        method: 'getAsset',
        params: { id: listing.nft_address }
      })
    });
    
    const assetData = await assetResponse.json();
    const asset = assetData.result;
    
    if (!asset || !asset.content?.metadata?.attributes) {
      return NextResponse.json(
        { success: false, error: 'Could not fetch NFT metadata' },
        { status: 404 }
      );
    }
    
    const merchantAttr = asset.content.metadata.attributes.find((attr: any) => 
      attr.trait_type === 'Merchant'
    );
    
    if (!merchantAttr) {
      return NextResponse.json(
        { success: false, error: 'Could not find merchant in NFT attributes' },
        { status: 404 }
      );
    }
    
    const merchantName = merchantAttr.value;
    
    console.log('🎯 Using modular minting approach for merchant:', merchantName);
    
    // Update listing status to sold
    await updateResaleListingStatus(listing.id, 'sold', buyerWallet);

    // Simulate 20-second delay as requested, then mint NFT
    setTimeout(async () => {
      console.log(`🔄 Processing NFT transfer for listing ${listingId} to buyer ${buyerWallet}`);
      console.log(`⏰ Starting 20-second delay countdown...`);
      
      try {
        // Get collection and merchant data to mint NFT
        const { pool } = await import('@/lib/db');
        const client = await pool.connect();
        
        // Fetch collection with merchant's secret key
        const collectionQuery = `
          SELECT c.*, m.secret_key, m.username
          FROM collections c 
          JOIN merchants m ON c.merchant_id = m.public_key 
          WHERE LOWER(m.username) = LOWER($1)
          LIMIT 1
        `;
        
        const collectionResult = await client.query(collectionQuery, [merchantName]);
        client.release();
        
        if (collectionResult.rows.length === 0) {
          throw new Error(`Collection not found for merchant: ${merchantName}`);
        }
        
        const collection = collectionResult.rows[0];
        const secretKey = new Uint8Array(collection.secret_key);
        const keypair = Keypair.fromSecretKey(secretKey);
        
        // Use hardcoded metadata from IPFS
        const metadata = {
          name: "20% Off Hotel Stay Munich",
          description: "20% Off Hotel Stay Munich",
          image: "https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/250px-Manchester_United_FC_crest.svg.png",
          attributes: [
            { trait_type: "Discount Percentage", value: 20 },
            { trait_type: "Merchant", value: merchantName },
            { trait_type: "Platform", value: "DealCoin" }
          ]
        };
        
        console.log('🚀 Calling mintNFTToBuyer function with hardcoded metadata...');
        const mintResult = await mintNFTToBuyer({
          collectionKeypair: keypair,
          buyerWallet: new PublicKey(buyerWallet),
          collectionData: {
            id: collection.id,
            name: collection.name,
            symbol: collection.symbol,
            description: collection.description,
            image_url: collection.image_url,
            collection_mint: collection.collection_mint,
            merkle_tree: collection.merkle_tree,
            merchant_name: collection.merchant_name,
            category: collection.category,
            discount_percent: collection.discount_percent,
            original_price: collection.original_price,
            discounted_price: collection.discounted_price,
            location: collection.location,
            expiry_date: collection.expiry_date,
            max_uses: collection.max_uses
          },
          metadata
        });
        
        console.log('📊 Minting result:', mintResult);
        
        if (mintResult.success) {
          console.log('✅ NFT minting completed for buyer:', buyerWallet);
          console.log('New NFT address:', mintResult.nftAddress);
          if ((mintResult as any).txSignature) {
            console.log('Transaction signature:', (mintResult as any).txSignature);
          }
          console.log('Merchant:', merchantName);
        } else {
          console.error('❌ NFT minting failed:', mintResult.error);
        }
        
      } catch (error) {
        console.error('Error during NFT minting:', error);
      }
    }, 20000); // 20 seconds delay

    return NextResponse.json({
      success: true,
      message: 'Payment verified! NFT transfer will be processed in 20 seconds.',
      listing: {
        ...listing,
        status: 'sold',
        buyer_wallet: buyerWallet
      }
    });

  } catch (error: any) {
    console.error('Error processing NFT transfer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process NFT transfer', details: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}