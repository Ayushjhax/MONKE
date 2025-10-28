'use client';

import { useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import ClientWalletButton from '../../components/ClientWalletButton';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import bs58 from 'bs58';

interface VerificationResult {
  success: boolean;
  nftMint: string;
  redemptionCode: string;
  discountValue: number;
  userWallet: string;
  transactionSignature: string;
  timestamp: number;
  nftBurned: boolean;
  message: string;
}

export default function VerifyPage() {
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState('');

  const verifyRedemption = async () => {
    if (!transactionSignature.trim()) {
      setError('Please enter a transaction signature');
      return;
    }

    setLoading(true);
    setError('');
    setVerificationResult(null);

    try {
      console.log('🔍 Verifying transaction:', transactionSignature);

      // First, check database for coupon redemption
      console.log('💾 Checking database for coupon redemption...');
      const dbCheckResponse = await fetch(`/api/redemption/verify?txSignature=${transactionSignature}`);
      const dbCheck = await dbCheckResponse.json();

      if (dbCheck.success && dbCheck.redemption) {
        console.log('✅ Found in database:', dbCheck.redemption);
        
        const result: VerificationResult = {
          success: true,
          nftMint: dbCheck.redemption.nft_mint || 'N/A',
          redemptionCode: dbCheck.redemption.coupon_code,
          discountValue: dbCheck.redemption.discount_value || 20,
          userWallet: dbCheck.redemption.wallet_address,
          transactionSignature: dbCheck.redemption.tx_signature,
          timestamp: dbCheck.redemption.redeemed_at ? new Date(dbCheck.redemption.redeemed_at).getTime() : Date.now(),
          nftBurned: true, // If in database, NFT was successfully burned
          message: '✅ Valid redemption found in database - NFT was burned and coupon code stored'
        };

        setVerificationResult(result);
        console.log('✅ Verification result from database:', result);
        return;
      }

      // If not in database, try to verify from blockchain
      console.log('📝 Not found in database, checking blockchain...');

      // Fetch transaction details
      const tx = await connection.getTransaction(transactionSignature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed'
      });

      if (!tx) {
        throw new Error('Transaction not found on blockchain');
      }

      console.log('📝 Transaction found:', tx);

      // Extract memo data from transaction
      let memoData: any = null;
      
      // Get instructions from versioned message
      const message = tx.transaction.message;
      const compiledInstructions = 'compiledInstructions' in message 
        ? message.compiledInstructions 
        : (message as any).instructions || [];
      
      // Check both regular instructions and inner instructions
      const allInstructions = [
        ...compiledInstructions,
        ...(tx.meta?.innerInstructions?.flatMap((ii: any) => ii.instructions) || [])
      ];

      console.log('🔍 Total instructions:', allInstructions.length);
      console.log('🔍 Account keys:', message.staticAccountKeys.map((k: any) => k.toString()));

      const memoInstruction = allInstructions.find((ix: any) => {
        // Check if this is a memo instruction
        if ('programIdIndex' in ix) {
          const programId = tx.transaction.message.staticAccountKeys[ix.programIdIndex];
          return programId.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
        }
        if ('programId' in ix) {
          return ix.programId.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
        }
        return false;
      });

      console.log('📝 Memo instruction found:', !!memoInstruction);
      console.log('📝 Transaction logs:', tx.meta?.logMessages);

      if (memoInstruction) {
        try {
          let memoText = '';
          
          console.log('🔍 Raw memo instruction:', JSON.stringify(memoInstruction, null, 2));
          
          // Try different data formats
          if ('data' in memoInstruction) {
            if (typeof memoInstruction.data === 'string') {
              // Base58 or base64 encoded
              try {
                memoText = Buffer.from(memoInstruction.data, 'base64').toString('utf-8');
                console.log('📄 Decoded from base64:', memoText);
              } catch (e1) {
                try {
                  // Try base58
                  memoText = Buffer.from(bs58.decode(memoInstruction.data)).toString('utf-8');
                  console.log('📄 Decoded from base58:', memoText);
                } catch (e2) {
                  // Maybe it's already plain text
                  memoText = memoInstruction.data;
                  console.log('📄 Plain text memo:', memoText);
                }
              }
            } else if (Array.isArray(memoInstruction.data)) {
              memoText = Buffer.from(memoInstruction.data).toString('utf-8');
              console.log('📄 Decoded from array:', memoText);
            } else if (memoInstruction.data && typeof memoInstruction.data === 'object' && 'data' in memoInstruction.data) {
              // Handle Buffer format: { type: "Buffer", data: [82, 58, 77, ...] }
              const bufferData = memoInstruction.data.data;
              if (Array.isArray(bufferData)) {
                memoText = Buffer.from(bufferData).toString('utf-8');
                console.log('📄 Decoded from Buffer object:', memoText);
              }
            }
          } else if ('parsed' in memoInstruction && memoInstruction.parsed) {
            memoText = memoInstruction.parsed;
            console.log('📄 Parsed memo:', memoText);
          }
          
          console.log('📄 Final memo text:', memoText);
          
          // Parse memo data (format: R:redemptionCode:discountValue or R:redemptionCode:discountValue:timestamp)
          if (memoText && memoText.startsWith('R:')) {
            const parts = memoText.split(':');
            console.log('📄 Memo parts:', parts);
            memoData = {
              redemptionCode: parts[1] || 'UNKNOWN',
              discountValue: parseInt(parts[2]) || 20
            };
            console.log('✅ Parsed memo data:', memoData);
          }
        } catch (e) {
          console.error('❌ Could not parse memo:', e);
        }
      }

      // Check if NFT was burned by looking for Bubblegum program
      const bubblegumProgramId = 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY';
      const hasBurnInstruction = compiledInstructions.some((ix: any) => {
        const programId = message.staticAccountKeys[ix.programIdIndex];
        return programId.toString() === bubblegumProgramId;
      });

      // Get user wallet (fee payer)
      const userWallet = tx.transaction.message.staticAccountKeys[0].toString();

      const result: VerificationResult = {
        success: true,
        nftMint: 'N/A', // Would need to parse from instruction data
        redemptionCode: memoData?.redemptionCode || 'UNKNOWN',
        discountValue: memoData?.discountValue || 20,
        userWallet,
        transactionSignature,
        timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
        nftBurned: hasBurnInstruction,
        message: hasBurnInstruction 
          ? '✅ Valid redemption - NFT was burned on-chain' 
          : '⚠️ Redemption recorded but NFT burn not detected'
      };

      setVerificationResult(result);
      console.log('✅ Verification result:', result);

    } catch (err) {
      console.error('❌ Verification error:', err);
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const checkNFTOwnership = async (nftMint: string, walletAddress: string) => {
    try {
      const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY || '22abefb4-e86a-482d-9a62-452fcd4f2cb0';
      
      // Check if NFT still exists in wallet
      const response = await fetch(`https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'check-asset',
          method: 'getAsset',
          params: { id: nftMint }
        })
      });

      const data = await response.json();
      
      if (data.result) {
        const currentOwner = data.result.ownership?.owner;
        return {
          exists: true,
          currentOwner,
          stillOwned: currentOwner === walletAddress
        };
      }

      return { exists: false, currentOwner: null, stillOwned: false };
    } catch (error) {
      console.error('Error checking NFT ownership:', error);
      return { exists: false, currentOwner: null, stillOwned: false };
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <img 
                src="/logo.png" 
                alt="MonkeDao Logo" 
                className="w-20 h-20 object-contain"
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Verify Redemption</h1>
                <p className="text-sm text-gray-500">Verify discount NFT redemptions</p>
              </div>
            </div>

            {/* Center Navigation */}
            <div className="flex-1 flex justify-center">
              <Link
                href="/"
                className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm"
              >
                🏠 Home
              </Link>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              <Link
                href="/marketplace"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Marketplace
              </Link>
              <ClientWalletButton className="!bg-black hover:!bg-gray-800" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🔍 Verify Redemption
            </h1>
            <p className="text-gray-600">
              Verify that a discount NFT was properly redeemed and burned on-chain
            </p>
          </div>

          {/* Verification Input */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
            <label className="block text-gray-900 font-semibold mb-3">
              Transaction Signature:
            </label>
            <input
              type="text"
              value={transactionSignature}
              onChange={(e) => setTransactionSignature(e.target.value)}
              placeholder="Enter transaction signature to verify..."
              className="w-full bg-gray-50 text-gray-900 border border-gray-300 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            
            <button
              onClick={verifyRedemption}
              disabled={loading || !transactionSignature.trim()}
              className="w-full bg-black text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⚡</span>
                  Verifying...
                </span>
              ) : (
                '🔍 Verify Redemption'
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
              <h3 className="text-red-800 font-bold mb-2">❌ Verification Failed</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Verification Result */}
          {verificationResult && (
            <div className={`bg-white rounded-2xl border p-8 mb-6 ${verificationResult.nftBurned ? 'border-green-200' : 'border-yellow-200'}`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  {verificationResult.nftBurned ? '✅ Valid Redemption' : '⚠️ Partial Redemption'}
                </h3>
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${verificationResult.nftBurned ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {verificationResult.nftBurned ? 'NFT BURNED' : 'RECORDED'}
                </span>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600 text-sm">Redemption Code:</span>
                    <p className="text-gray-900 font-mono text-sm">{verificationResult.redemptionCode}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">User Wallet:</span>
                    <p className="text-gray-900 font-mono text-xs break-all">{verificationResult.userWallet}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">Timestamp:</span>
                    <p className="text-gray-900 text-sm">{new Date(verificationResult.timestamp).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <span className="text-gray-600 text-sm">Transaction:</span>
                  <a 
                    href={`https://explorer.solana.com/tx/${verificationResult.transactionSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-mono text-xs break-all block"
                  >
                    {verificationResult.transactionSignature}
                  </a>
                </div>
              </div>

              <div className={`mt-6 p-4 rounded-xl ${verificationResult.nftBurned ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <p className={verificationResult.nftBurned ? 'text-green-800' : 'text-yellow-800'}>
                  {verificationResult.message}
                </p>
                {verificationResult.nftBurned && (
                  <p className="text-green-700 text-sm mt-2">
                    This NFT has been permanently destroyed and cannot be reused.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h4 className="text-gray-900 font-bold mb-3">ℹ️ How Verification Works:</h4>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>Enter the transaction signature from the redemption</li>
              <li>System fetches transaction details from Solana blockchain</li>
              <li>Extracts redemption data from transaction memo</li>
              <li>Checks if Bubblegum burn instruction was executed</li>
              <li>Confirms NFT was permanently destroyed (single-use enforcement)</li>
              <li>Displays complete verification report</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}

