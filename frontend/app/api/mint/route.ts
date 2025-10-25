// Mint API Route - Mint CNFT from collection
import { NextRequest, NextResponse } from 'next/server';
import { getCollectionById, updateCollectionUsage, hasUserClaimed, recordUserClaim, getMerchantByWallet } from '@/lib/db';
import { getKeypairFromUser } from '@/lib/pinata';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { mplBubblegum, mintV1 } from '@metaplex-foundation/mpl-bubblegum';
import { publicKey, signerIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi';
import bs58 from 'bs58';

const HELIUS_RPC_URL = 'https://devnet.helius-rpc.com/?api-key=22abefb4-e86a-482d-9a62-452fcd4f2cb0';

export async function POST(request: NextRequest) {
  try {
    const { collectionId, userWallet } = await request.json();

    if (!collectionId || !userWallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: collectionId and userWallet'
        },
        { status: 400 }
      );
    }

    // Get collection from database
    const collection = await getCollectionById(collectionId);
    if (!collection) {
      return NextResponse.json(
        {
          success: false,
          error: 'Collection not found'
        },
        { status: 404 }
      );
    }

    // Check if collection is still active
    if (collection.status !== 'Active') {
      return NextResponse.json(
        {
          success: false,
          error: 'Collection is not active'
        },
        { status: 400 }
      );
    }

    // Check if collection has expired
    if (new Date(collection.expiry_date) < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Collection has expired'
        },
        { status: 400 }
      );
    }

    // Check if user has already claimed from this collection
    const alreadyClaimed = await hasUserClaimed(collectionId, userWallet);
    if (alreadyClaimed) {
      return NextResponse.json(
        {
          success: false,
          error: 'You have already claimed an NFT from this collection'
        },
        { status: 400 }
      );
    }

    // Check if collection has remaining uses
    if (collection.current_uses >= collection.max_uses) {
      return NextResponse.json(
        {
          success: false,
          error: 'Collection is fully redeemed'
        },
        { status: 400 }
      );
    }

    // Real NFT minting process
    console.log(`🎫 Minting NFT for collection: ${collection.name}`);
    console.log(`👤 User wallet: ${userWallet}`);
    console.log(`🎨 Collection: ${collection.collection_mint}`);
    console.log(`🌳 Merkle Tree: ${collection.merkle_tree}`);
    
    try {
      // Create Umi instance for Solana interaction
      const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL!)
        .use(mplTokenMetadata())
        .use(mplBubblegum());

      // Get merchant's keypair for fee payment
      const merchant = await getMerchantByWallet(collection.merchant_wallet);
      
      if (!merchant) {
        throw new Error(`Merchant not found for wallet: ${collection.merchant_wallet}`);
      }

      console.log(`🔑 Found merchant: ${merchant.username} with wallet: ${merchant.public_key}`);
      console.log(`🔐 Secret key length: ${merchant.secret_key.length}`);

      // Convert merchant data to the format expected by getKeypairFromUser
      const merchantUser = {
        username: merchant.username,
        passwordHash: '', // Not needed for keypair creation
        publicKey: merchant.public_key,
        secretKey: merchant.secret_key,
        createdAt: Date.now()
      };

      // Use merchant's keypair as fee payer
      try {
        // Create Umi keypair directly from secret key
        const secretKeyBytes = new Uint8Array(merchant.secret_key);
        const merchantKeypair = umi.eddsa.createKeypairFromSecretKey(secretKeyBytes);
        const signer = createSignerFromKeypair({ eddsa: umi.eddsa }, merchantKeypair);
        umi.use(signerIdentity(signer));
        
        console.log(`✅ Using merchant keypair for fee payment: ${merchant.username}`);
        console.log(`🔑 Merchant public key: ${merchantKeypair.publicKey}`);
      } catch (keypairError) {
        console.error('❌ Error creating merchant keypair:', keypairError);
        throw new Error(`Failed to create merchant keypair: ${keypairError instanceof Error ? keypairError.message : 'Unknown error'}`);
      }
      
      // Create metadata for the NFT
      const metadata = {
        name: `${collection.name} - Discount Coupon`,
        symbol: collection.symbol,
        description: collection.description,
        image: collection.image_url,
        attributes: [
          { trait_type: "Category", value: collection.category },
          { trait_type: "Discount", value: `${collection.discount_percent}%` },
          { trait_type: "Location", value: collection.location },
          { trait_type: "Original Price", value: `$${collection.original_price}` },
          { trait_type: "Discounted Price", value: `$${collection.discounted_price}` },
          { trait_type: "Merchant", value: collection.merchant_name },
        ],
        properties: {
          files: [{ uri: collection.image_url, type: "image/png" }],
          category: "image",
        },
      };

      // Upload metadata to IPFS (using Pinata)
      const metadataResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': process.env.NEXT_PUBLIC_PINATA_API_KEY!,
          'pinata_secret_api_key': process.env.NEXT_PUBLIC_PINATA_API_SECRET!,
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: `${collection.name}-metadata-${Date.now()}`,
          },
        }),
      });

      const metadataResult = await metadataResponse.json();
      const metadataUri = `https://gateway.pinata.cloud/ipfs/${metadataResult.IpfsHash}`;

      // Mint the cNFT
      console.log(`🎫 Starting mint process...`);
      console.log(`👤 User wallet: ${userWallet}`);
      console.log(`🌳 Merkle Tree: ${collection.merkle_tree}`);
      console.log(`🎨 Collection Mint: ${collection.collection_mint}`);
      console.log(`📄 Metadata URI: ${metadataUri}`);
      
      const mintResult = await mintV1(umi, {
        leafOwner: publicKey(userWallet),
        merkleTree: publicKey(collection.merkle_tree),
        metadata: {
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadataUri,
          sellerFeeBasisPoints: 0,
          collection: {
            key: publicKey(collection.collection_mint),
            verified: false,
          },
          creators: [{
            address: publicKey(collection.merchant_wallet),
            verified: false,
            share: 100,
          }],
        },
      }).sendAndConfirm(umi);
      
      console.log(`✅ Mint transaction completed!`);

      // Record user claim and update collection usage
      await recordUserClaim(collectionId, userWallet);
      await updateCollectionUsage(collectionId);

      const signature = bs58.encode(mintResult.signature);
      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

      return NextResponse.json({
        success: true,
        signature,
        explorerUrl,
        message: 'NFT minted successfully!',
        metadataUri,
      });

    } catch (mintError) {
      console.error('Minting error:', mintError);
      
      return NextResponse.json(
        {
          success: false,
          error: `Minting failed: ${mintError instanceof Error ? mintError.message : 'Unknown error'}`
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error minting NFT:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mint NFT'
      },
      { status: 500 }
    );
  }
}
