// Test endpoint for actual NFT minting with secret key
import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { completeMintFlow } from '@/lib/nft-minting-modular';

export async function POST(request: NextRequest) {
  try {
    const { merchantId, buyerWallet, testMode = true } = await request.json();

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'Missing merchantId parameter' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing actual NFT minting for merchant:', merchantId);

    // Use provided buyer wallet or default test wallet
    const buyerWalletPubkey = buyerWallet 
      ? new PublicKey(buyerWallet)
      : new PublicKey('2T9AuGr6g6tRvAvpcHWSAbENRrnmM7Z2oPxqFbKcE6QQ');

    const metadata = {
      name: 'Test NFT - ' + merchantId,
      description: 'A test NFT minted using the modular system',
      image: 'https://ayushjhax.github.io/restaurant-discount.jpg',
      attributes: [
        { trait_type: 'Platform', value: 'DealCoin' },
        { trait_type: 'Merchant', value: merchantId },
        { trait_type: 'Test', value: 'Yes' },
        { trait_type: 'Category', value: 'Test' },
        { trait_type: 'Discount', value: '100%' }
      ]
    };

    console.log('🚀 Starting complete mint flow...');
    console.log('Buyer wallet:', buyerWalletPubkey.toString());
    console.log('Metadata:', metadata.name);

    const mintResult = await completeMintFlow(merchantId, buyerWalletPubkey, metadata);
    
    console.log('📊 Final mint result:', mintResult);

    return NextResponse.json({
      success: mintResult.success,
      message: mintResult.success ? 'NFT minted successfully!' : 'NFT minting failed',
      result: mintResult,
      error: mintResult.error || 'No error details',
      testDetails: {
        merchantId,
        buyerWallet: buyerWalletPubkey.toString(),
        testMode
      }
    });

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
