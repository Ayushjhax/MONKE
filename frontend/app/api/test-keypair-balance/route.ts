// Detailed test for keypair creation and balance check
import { NextRequest, NextResponse } from 'next/server';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import { fetchMerchant } from '@/lib/nft-minting-modular';

const RPC_URL = 'https://api.devnet.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

export async function POST(request: NextRequest) {
  try {
    const { merchantId } = await request.json();

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'Missing merchantId parameter' },
        { status: 400 }
      );
    }

    console.log('🔍 Testing keypair creation for merchant:', merchantId);

    // Fetch merchant data
    const merchantData = await fetchMerchant(merchantId);
    
    // Convert secret key
    const secretKey = new Uint8Array(merchantData.secret_key);
    console.log('🔑 Secret key conversion:', {
      originalType: typeof merchantData.secret_key,
      originalLength: merchantData.secret_key.length,
      convertedType: typeof secretKey,
      convertedLength: secretKey.length,
      isUint8Array: secretKey instanceof Uint8Array
    });

    // Create keypair
    let keypair: Keypair;
    try {
      keypair = Keypair.fromSecretKey(secretKey);
      console.log('✅ Keypair created successfully:', {
        publicKey: keypair.publicKey.toString(),
        secretKeyLength: secretKey.length
      });
    } catch (error) {
      console.error('❌ Keypair creation failed:', error);
      return NextResponse.json({
        success: false,
        error: 'Keypair creation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Check balance
    let balanceSOL = 0;
    try {
      const balance = await connection.getBalance(keypair.publicKey);
      balanceSOL = balance / 1000000000; // Convert lamports to SOL
      
      console.log('💰 Balance check:', {
        publicKey: keypair.publicKey.toString(),
        balanceLamports: balance,
        balanceSOL: balanceSOL,
        hasEnoughBalance: balanceSOL > 0.01 // Need at least 0.01 SOL for fees
      });

      if (balanceSOL < 0.01) {
        return NextResponse.json({
          success: false,
          error: 'Insufficient balance for transaction fees',
          details: {
            balanceSOL,
            requiredSOL: 0.01,
            publicKey: keypair.publicKey.toString()
          }
        });
      }

    } catch (error) {
      console.error('❌ Balance check failed:', error);
      return NextResponse.json({
        success: false,
        error: 'Balance check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Keypair creation and balance check successful',
      results: {
        merchant: {
          id: merchantData.id,
          username: merchantData.username,
          publicKey: merchantData.public_key
        },
        keypair: {
          publicKey: keypair.publicKey.toString(),
          secretKeyLength: secretKey.length
        },
        balance: {
          balanceSOL: balanceSOL,
          hasEnoughBalance: balanceSOL > 0.01
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test failed', 
        details: error.message || 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
