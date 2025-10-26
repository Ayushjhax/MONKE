// Simple test for basic transaction creation
import { NextRequest, NextResponse } from 'next/server';
import { PublicKey, Connection, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
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

    console.log('🧪 Testing basic transaction creation for merchant:', merchantId);

    // Fetch merchant data
    const merchantData = await fetchMerchant(merchantId);
    
    // Convert secret key
    const secretKey = new Uint8Array(merchantData.secret_key);
    const keypair = Keypair.fromSecretKey(secretKey);

    console.log('✅ Keypair created:', keypair.publicKey.toString());

    // Test basic transaction creation
    try {
      const transaction = new Transaction();
      
      // Add a simple transfer instruction (0.001 SOL to self)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: keypair.publicKey,
          lamports: 1000000 // 0.001 SOL
        })
      );

      console.log('✅ Transaction created successfully');
      console.log('Transaction instructions:', transaction.instructions.length);

      // Test transaction simulation (don't actually send)
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = keypair.publicKey;

      console.log('✅ Transaction prepared for signing');

      return NextResponse.json({
        success: true,
        message: 'Basic transaction creation successful',
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
          transaction: {
            instructions: transaction.instructions.length,
            blockhash: blockhash
          }
        }
      });

    } catch (txError) {
      console.error('❌ Transaction creation failed:', txError);
      return NextResponse.json({
        success: false,
        error: 'Transaction creation failed',
        details: txError instanceof Error ? txError.message : 'Unknown error'
      });
    }

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
