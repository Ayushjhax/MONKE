// Test endpoint for NFT minting
import { NextRequest, NextResponse } from 'next/server';
import { PublicKey, Keypair } from '@solana/web3.js';
import { mintNFTToBuyer } from '@/lib/nft-minting';

export async function POST(request: NextRequest) {
  try {
    const { buyerWallet } = await request.json();

    if (!buyerWallet) {
      return NextResponse.json(
        { success: false, error: 'Missing buyerWallet' },
        { status: 400 }
      );
    }

    // Create a test keypair
    const testKeypair = Keypair.generate();
    
    // Test metadata
    const metadata = {
      name: 'Test NFT',
      description: 'This is a test NFT for debugging',
      image: 'https://via.placeholder.com/300x300',
      attributes: [
        { trait_type: 'Test', value: 'True' },
        { trait_type: 'Type', value: 'Debug' }
      ]
    };

    console.log('🧪 Testing NFT minting...');
    console.log('Test keypair:', testKeypair.publicKey.toString());
    console.log('Buyer wallet:', buyerWallet);

    const result = await mintNFTToBuyer({
      collectionKeypair: testKeypair,
      buyerWallet: new PublicKey(buyerWallet),
      metadata
    });

    return NextResponse.json({
      success: result.success,
      nftAddress: result.nftAddress,
      error: result.error
    });

  } catch (error) {
    console.error('Test minting failed:', error);
    return NextResponse.json(
      { success: false, error: 'Test minting failed' },
      { status: 500 }
    );
  }
}
