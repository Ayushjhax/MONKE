import { NextRequest, NextResponse } from 'next/server';
import { getOfferById, updateOfferStatus } from '@/lib/db';
import { transferNFTToBuyer } from '@/lib/nft-transfer';

export async function POST(request: NextRequest) {
  try {
    const { offerId, buyerWallet, nftAddress } = await request.json();

    if (!offerId || !buyerWallet || !nftAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the offer details
    const offer = await getOfferById(offerId);
    if (!offer) {
      return NextResponse.json(
        { success: false, error: 'Offer not found' },
        { status: 404 }
      );
    }

    if (offer.status !== 'paid') {
      return NextResponse.json(
        { success: false, error: 'Offer must be paid before transfer' },
        { status: 400 }
      );
    }

    // Get collection and merchant data for minting
    const { pool } = await import('@/lib/db');
    const client = await pool.connect();
    
    try {
      // Fetch NFT metadata from Helius to get merchant info
      const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY || '22abefb4-e86a-482d-9a62-452fcd4f2cb0';
      const heliusUrl = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
      
      console.log('Fetching NFT metadata for:', nftAddress);
      
      const assetResponse = await fetch(heliusUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'my-request-id',
          method: 'getAsset',
          params: { id: nftAddress }
        })
      });
      
      const assetData = await assetResponse.json();
      console.log('NFT Asset data:', assetData);
      
      const asset = assetData.result;
      
      if (!asset || !asset.content) {
        throw new Error('Could not fetch NFT data from Helius');
      }
      
      // Get complete metadata from IPFS if available
      let metadata = asset.content.metadata;
      
      if (asset.content.json_uri && (!metadata || !metadata.attributes)) {
        console.log('Fetching complete metadata from IPFS:', asset.content.json_uri);
        try {
          const ipfsResponse = await fetch(asset.content.json_uri);
          metadata = await ipfsResponse.json();
          console.log('Fetched IPFS metadata:', metadata);
        } catch (error) {
          console.error('Failed to fetch IPFS metadata:', error);
        }
      }
      
      if (!metadata || !metadata.attributes) {
        throw new Error('Could not fetch NFT metadata from Helius or IPFS');
      }
      
      // Get merchant from NFT attributes
      const merchantAttr = metadata.attributes.find((attr: any) => 
        attr.trait_type === 'Merchant'
      );
      
      if (!merchantAttr) {
        throw new Error('Could not find merchant in NFT attributes');
      }
      
      const merchantName = merchantAttr.value.toLowerCase();
      console.log('Found merchant from NFT:', merchantName);
      
      // Get collection by merchant
      const collectionResult = await client.query(
        'SELECT c.*, m.secret_key, m.username FROM collections c JOIN merchants m ON c.merchant_id = m.username WHERE LOWER(m.username) = LOWER($1) LIMIT 1',
        [merchantName]
      );
      
      if (collectionResult.rows.length === 0) {
        throw new Error(`Collection not found for merchant: ${merchantName}`);
      }
      
      const collection = collectionResult.rows[0];
      console.log('Found collection:', collection);
      
      // Import PublicKey and Keypair
      const { PublicKey, Keypair } = await import('@solana/web3.js');
      
      // Convert secret key from array to Uint8Array and create proper Keypair
      const secretKey = new Uint8Array(collection.secret_key);
      const collectionKeypair = Keypair.fromSecretKey(secretKey);
      
      console.log('Starting NFT transfer...');
      console.log('Buyer wallet:', buyerWallet);
      console.log('Collection mint:', collection.collection_mint);
      console.log('Merkle tree:', collection.merkle_tree);
      
      // Transfer NFT from seller to buyer
      const transferResult = await transferNFTToBuyer({
        sellerWallet: new PublicKey(offer.seller_wallet),
        buyerWallet: new PublicKey(buyerWallet),
        nftAddress: nftAddress,
        collectionKeypair,
        collectionData: {
          id: collection.id,
          name: collection.name,
          symbol: collection.symbol,
          description: collection.description,
          image_url: collection.image_url,
          collection_mint: collection.collection_mint,
          merkle_tree: collection.merkle_tree,
          merchant_name: collection.merchant_name,
          category: collection.category
        },
        metadata: {
          name: collection.name,
          description: collection.description,
          image: collection.image_url
        }
      });
      
      console.log('NFT transferred successfully:', transferResult);
      
      if (!transferResult.success || !transferResult.nftAddress) {
        throw new Error(transferResult.error || 'Failed to transfer NFT');
      }
      
      // Update offer status to completed
      await updateOfferStatus(offerId, 'completed');
      
      // Update transaction status
      await client.query(
        `UPDATE transactions 
         SET nft_transfer_status = 'completed', 
             nft_transfer_signature = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE offer_id = $2`,
        [transferResult.nftAddress, offerId]
      );
      
      client.release();

      return NextResponse.json({
        success: true,
        message: 'NFT transferred successfully',
        nftAddress: transferResult.nftAddress
      });

    } catch (error: any) {
      client.release();
      console.error('Error transferring NFT:', error);
      throw error;
    }

  } catch (error: any) {
    console.error('Error in transfer-nft:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to transfer NFT' },
      { status: 500 }
    );
  }
}
