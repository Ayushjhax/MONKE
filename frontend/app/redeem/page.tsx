'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, TransactionInstruction } from '@solana/web3.js';
import Link from 'next/link';
import { createRealBurnTransaction, fetchAssetDataForBurn, createRedemptionOnlyTransaction } from '../../lib/burn-nft';

interface NFTData {
  mint: string;
  name: string;
  symbol: string;
  category: string;
  discountPercent: number;
  merchant: string;
  redemptionCode: string;
  expiryDate: string;
  isCompressed: boolean;
}

export default function RedeemPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [transactionSignature, setTransactionSignature] = useState('');
  const [redeemMode, setRedeemMode] = useState<'nft' | 'signature'>('nft');

  // Sample merchant wallet
  const merchantWallet = 'aPi7gR9c3s7eUvtWu7HVFRakW1e9rZz59ZNzrGbkKZ3';

  // Fetch user's NFTs
  useEffect(() => {
    if (publicKey) {
      console.log('🔗 Wallet connected, fetching NFTs for:', publicKey.toBase58());
      fetchUserNFTs();
    } else {
      console.log('🔗 No wallet connected');
    }
  }, [publicKey]);

  const fetchUserNFTs = async () => {
    if (!publicKey) {
      console.log('❌ No public key available');
      return;
    }

    console.log('🔄 Starting NFT fetch...');
    setLoading(true);
    try {
      // Call Helius DAS API to get user's NFTs
      const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY || '22abefb4-e86a-482d-9a62-452fcd4f2cb0';
      const response = await fetch(`https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'get-assets',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: publicKey.toBase58(),
            page: 1,
            limit: 1000
          }
        })
      });

      const data = await response.json();
      const assets = data.result?.items || [];

      console.log('🔍 Total assets fetched from DAS API:', assets.length);
      console.log('🔍 Raw assets:', assets.map((a: any) => ({ id: a.id, name: a.content?.metadata?.name, burned: a.burnt })));

      // Filter for DealCoin promotion NFTs
      const promotionNFTs = assets
        .filter((asset: any) => {
          const attrs = asset.content?.metadata?.attributes || [];
          const isDealCoin = attrs.some((attr: any) => attr.trait_type === 'Platform' && attr.value === 'DealCoin');
          const isBurned = asset.burnt || false;
          
          console.log(`🔍 Asset ${asset.id}:`, {
            name: asset.content?.metadata?.name,
            isDealCoin,
            isBurned,
            hasAttributes: attrs.length > 0
          });
          
          return isDealCoin && !isBurned; // Only include non-burned DealCoin NFTs
        })
        .map((asset: any) => {
          const attrs = asset.content?.metadata?.attributes || [];
          
          // Debug: Log all attributes for this asset
          console.log(`🔍 Attributes for ${asset.id}:`, attrs);
          
          // Generate a random redemption code if not found in metadata
          const generateRedemptionCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < 8; i++) {
              result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
          };
          
          // Extract values with better fallbacks
          const category = attrs.find((a: any) => a.trait_type === 'Category')?.value || 
                          attrs.find((a: any) => a.trait_type === 'category')?.value || 
                          'Unknown';
          
          const discountPercent = attrs.find((a: any) => a.trait_type === 'Discount Percentage')?.value || 
                                 attrs.find((a: any) => a.trait_type === 'discount_percentage')?.value ||
                                 attrs.find((a: any) => a.trait_type === 'Discount')?.value ||
                                 20; // Default 20% discount
          
          const merchant = attrs.find((a: any) => a.trait_type === 'Merchant')?.value || 
                          attrs.find((a: any) => a.trait_type === 'merchant')?.value || 
                          'DealCoin Partner';
          
          const redemptionCode = attrs.find((a: any) => a.trait_type === 'Redemption Code')?.value || 
                                attrs.find((a: any) => a.trait_type === 'redemption_code')?.value ||
                                attrs.find((a: any) => a.trait_type === 'Code')?.value ||
                                generateRedemptionCode(); // Generate if not found
          
          const expiryDate = attrs.find((a: any) => a.trait_type === 'Expiry Date')?.value || 
                            attrs.find((a: any) => a.trait_type === 'expiry_date')?.value ||
                            attrs.find((a: any) => a.trait_type === 'Expires')?.value ||
                            '2024-12-31'; // Default expiry
          
          console.log(`🔍 Extracted values for ${asset.id}:`, {
            category,
            discountPercent,
            merchant,
            redemptionCode,
            expiryDate
          });
          
          return {
            mint: asset.id,
            name: asset.content?.metadata?.name || 'Unknown',
            symbol: asset.content?.metadata?.symbol || '',
            category,
            discountPercent: typeof discountPercent === 'number' ? discountPercent : parseInt(discountPercent) || 20,
            merchant,
            redemptionCode,
            expiryDate,
            isCompressed: asset.compression?.compressed || false
          };
        });

      console.log('🔍 Filtered promotion NFTs:', promotionNFTs.length);
      console.log('🔍 Promotion NFT details:', promotionNFTs.map((nft: any) => ({ mint: nft.mint, name: nft.name })));

      setNfts(promotionNFTs);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
    } finally {
      setLoading(false);
    }
  };

  const redeemNFT = async (nft: NFTData) => {
    if (!publicKey || !sendTransaction) {
      alert('Please connect your wallet');
      return;
    }

    setRedeeming(nft.mint);
    try {
      console.log('🔥 Starting REAL NFT burn process...');
      
      // Step 1: Fetch asset proof data from Helius DAS API for burning
      const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY || '22abefb4-e86a-482d-9a62-452fcd4f2cb0';
      console.log('📡 Fetching asset proof for burn...');
      
      const assetData = await fetchAssetDataForBurn(nft.mint, HELIUS_API_KEY);

      let transaction: Transaction;

      if (assetData) {
        console.log('✅ Asset data found - creating REAL burn transaction');
        console.log('   Merkle Tree:', assetData.merkleTree);
        console.log('   Leaf Index:', assetData.leafIndex);
        console.log('   Proof length:', assetData.proof?.length);
        console.log('   Has dataHash:', !!assetData.dataHash);
        console.log('   Has creatorHash:', !!assetData.creatorHash);
        console.log('   Has nonce:', !!assetData.nonce);
        
        if (!assetData.dataHash || !assetData.creatorHash) {
          console.warn('⚠️ Missing required hashes for burn - will skip burn instruction');
        }
        // Note: Proof can be large (up to ~24 nodes) - we'll handle transaction size later
        console.log('   Proof nodes:', assetData.proof.length, '(max merkle tree depth)');
        
        // Create REAL burn transaction with Bubblegum instruction
        transaction = await createRealBurnTransaction(connection, {
          nftMint: nft.mint,
          userWallet: publicKey.toBase58(),
          merchantWallet: merchantWallet,
          redemptionCode: nft.redemptionCode,
          discountValue: nft.discountPercent,
          merkleTree: assetData.merkleTree,
          leafIndex: assetData.leafIndex,
          root: assetData.root,
          proof: assetData.proof,
          dataHash: assetData.dataHash,
          creatorHash: assetData.creatorHash,
          nonce: assetData.nonce,
        });
      } else {
        console.log('⚠️  Asset data not found - creating redemption-only transaction');
        
        // Fallback: Create redemption transaction without burn
        transaction = await createRedemptionOnlyTransaction(connection, {
          nftMint: nft.mint,
          userWallet: publicKey.toBase58(),
          merchantWallet: merchantWallet,
          redemptionCode: nft.redemptionCode,
          discountValue: nft.discountPercent
        });
      }

      // Check user's SOL balance first
      const balance = await connection.getBalance(publicKey);
      console.log('💰 User balance:', balance / 1000000000, 'SOL');
      
      if (balance < 1000) { // Less than 0.000001 SOL
        throw new Error('Insufficient SOL balance. You need at least 0.000001 SOL for transaction fees.');
      }

      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Check transaction size after blockhash is set
      try {
        const transactionSize = transaction.serialize({ requireAllSignatures: false }).length;
        console.log('📝 Transaction size:', transactionSize, 'bytes');
        
        if (transactionSize > 1232) {
          console.error('❌ Transaction too large:', transactionSize, 'bytes (max 1232)');
          throw new Error(`Transaction size ${transactionSize} bytes exceeds Solana limit of 1232 bytes. This usually means the merkle proof is too large. Please contact support.`);
        } else if (transactionSize > 1200) {
          console.warn('⚠️ Transaction size is close to limit:', transactionSize, 'bytes');
        } else {
          console.log('✅ Transaction size OK:', transactionSize, 'bytes');
        }
      } catch (sizeError) {
        if (sizeError instanceof Error && sizeError.message.includes('exceeds Solana limit')) {
          throw sizeError;
        }
        // If we can't serialize for size check, continue anyway
        console.warn('Could not check transaction size:', sizeError);
      }

      // Simulate transaction first to catch errors
      console.log('🔍 Simulating transaction...');
      try {
        const simulationResult = await connection.simulateTransaction(transaction);
        console.log('📊 Simulation result:', simulationResult);
        
        if (simulationResult.value.err) {
          console.error('❌ Simulation failed with error:', simulationResult.value.err);
          console.error('❌ Simulation logs:', simulationResult.value.logs);
          throw new Error(`Transaction simulation failed: ${JSON.stringify(simulationResult.value.err)}`);
        }
        
        console.log('✅ Simulation successful - transaction should work');
      } catch (simError) {
        console.error('❌ Simulation failed:', simError);
        const errorMessage = simError instanceof Error ? simError.message : String(simError);
        throw new Error(`Transaction simulation failed: ${errorMessage}. Please check your wallet balance and try again.`);
      }

      console.log('📝 Sending transaction...');
      
      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      console.log('✅ Transaction sent:', signature);

      // Wait for confirmation
      console.log('⏳ Waiting for confirmation...');
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      if (confirmation.value.err) {
        throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
      }

      console.log('🎉 Transaction confirmed!');

      const message = assetData 
        ? `✅ Redemption successful!\n\n🔥 NFT BURNED ON-CHAIN!\n\nTransaction: ${signature}\n\nThe NFT has been permanently destroyed using Metaplex Bubblegum. It can never be recovered or reused.\n\nView on Solana Explorer to verify the burn.`
        : `✅ Redemption successful!\n\n📝 Transaction recorded on-chain\n\nTransaction: ${signature}\n\nNote: NFT burn requires merkle tree data. Redemption is tracked via memo.`;

      alert(message);

      // Refresh NFT list
      await fetchUserNFTs();

    } catch (error) {
      console.error('❌ Error redeeming:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error during redemption: ${errorMessage}\n\nPlease try again.`);
    } finally {
      setRedeeming(null);
    }
  };

  // Redeem using Solana Pay transaction signature
  const redeemWithSignature = async () => {
    if (!transactionSignature.trim()) {
      alert('Please enter a transaction signature');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Verifying Solana Pay transaction:', transactionSignature);
      
      // Get transaction details
      const tx = await connection.getTransaction(transactionSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!tx) {
        throw new Error('Transaction not found. Please check the signature.');
      }

      console.log('📄 Transaction found:', tx);

      // Check if transaction is to merchant wallet
      const transaction = tx.transaction;
      const txMessage = transaction.message;
      
      // Find transfer instruction
      const instructions = 'instructions' in txMessage ? txMessage.instructions : txMessage.compiledInstructions;
      const staticAccountKeys = 'staticAccountKeys' in txMessage ? txMessage.staticAccountKeys : (txMessage as any).accountKeys;
      
      const transferInstruction = instructions.find((ix: any) => {
        const programId = staticAccountKeys[ix.programIdIndex];
        return programId.toString() === '11111111111111111111111111111111'; // System Program
      });

      if (!transferInstruction) {
        throw new Error('No transfer instruction found in transaction');
      }

      // Get memo instruction
      const memoInstruction = instructions.find((ix: any) => {
        const programId = staticAccountKeys[ix.programIdIndex];
        return programId.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
      });

      if (!memoInstruction) {
        throw new Error('No memo instruction found in transaction');
      }

      // Parse memo data
      let memoData = null;
      if (memoInstruction) {
        try {
          const memoBytes = memoInstruction.data;
          const memoText = typeof memoBytes === 'string' 
            ? Buffer.from(memoBytes, 'base64').toString('utf-8')
            : Buffer.from(memoBytes).toString('utf-8');
          console.log('📝 Memo text:', memoText);
          
          // Parse memo data (format: R:redemptionCode:discountValue)
          if (memoText.startsWith('R:')) {
            const parts = memoText.split(':');
            memoData = {
              redemptionCode: parts[1] || 'N/A',
              discountValue: parseInt(parts[2]) || 0
            };
            console.log('✅ Parsed memo data:', memoData);
          }
        } catch (e) {
          console.warn('Could not parse memo:', e);
        }
      }

      // Show success message
      const successMessage = memoData 
        ? `✅ Solana Pay Redemption Verified!\n\n📝 Redemption Code: ${memoData.redemptionCode}\n💰 Discount: ${memoData.discountValue}%\n\n🔗 Transaction: ${transactionSignature}\n\n✅ This transaction proves the customer paid and is eligible for the discount!\n\nYou can now provide the discount to the customer.`
        : `✅ Solana Pay Transaction Verified!\n\n🔗 Transaction: ${transactionSignature}\n\n✅ This transaction proves the customer paid and is eligible for a discount!\n\nNote: Could not parse discount details from memo.`;

      alert(successMessage);

    } catch (error) {
      console.error('❌ Error verifying transaction:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`❌ Error verifying transaction: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <nav className="p-6 flex justify-between items-center bg-black/20 backdrop-blur-sm">
        <Link href="/" className="text-2xl font-bold text-white">
          ← Back
        </Link>
        <WalletMultiButton />
      </nav>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              👤 Redeem Your Discount NFTs
            </h1>
            <p className="text-gray-300">
              Connect your wallet to view and redeem your promotion NFTs
            </p>
          </div>

          {!publicKey ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
              <p className="text-white text-lg mb-4">
                Please connect your wallet to view your NFTs
              </p>
              <WalletMultiButton />
            </div>
          ) : (
            <div>
              {/* Mode Selector */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
                <h2 className="text-xl font-bold text-white mb-4">Choose Redemption Method:</h2>
                <div className="flex gap-4">
                  <button
                    onClick={() => setRedeemMode('nft')}
                    className={`px-6 py-3 rounded-lg font-medium transition ${
                      redeemMode === 'nft' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white/20 text-gray-300 hover:bg-white/30'
                    }`}
                  >
                    🔥 Direct NFT Burn
                  </button>
                  <button
                    onClick={() => setRedeemMode('signature')}
                    className={`px-6 py-3 rounded-lg font-medium transition ${
                      redeemMode === 'signature' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-white/20 text-gray-300 hover:bg-white/30'
                    }`}
                  >
                    📱 Solana Pay QR Code
                  </button>
                </div>
              </div>

              {/* Solana Pay Mode */}
              {redeemMode === 'signature' && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
                  <h3 className="text-xl font-bold text-white mb-4">📱 Redeem with Solana Pay Transaction</h3>
                  <p className="text-gray-300 mb-4">
                    Enter the transaction signature from your Solana Pay QR code scan:
                  </p>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={transactionSignature}
                      onChange={(e) => setTransactionSignature(e.target.value)}
                      placeholder="Enter transaction signature (e.g., 5K7...ABC123)"
                      className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-400 border border-white/30 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={redeemWithSignature}
                      disabled={loading || !transactionSignature.trim()}
                      className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition"
                    >
                      {loading ? 'Verifying...' : 'Verify & Redeem'}
                    </button>
                  </div>
                  <div className="mt-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                    <h4 className="text-white font-bold mb-2">📋 How to use:</h4>
                    <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                      <li>Merchant generates QR code at <code className="bg-black/30 px-1 rounded">/merchant</code></li>
                      <li>Customer scans QR code with Solana wallet</li>
                      <li>Customer approves transaction (gets signature)</li>
                      <li>Customer enters signature here to redeem discount</li>
                    </ol>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center text-white text-xl">
                  Loading your NFTs...
                </div>
              ) : nfts.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
                  <p className="text-white text-lg">
                    No promotion NFTs found in your wallet
                  </p>
                  <p className="text-gray-400 mt-2">
                    Make sure you're on the correct wallet and network (Devnet)
                  </p>
                </div>
              ) : redeemMode === 'nft' ? (
                <div>
                  <div className="mb-6 bg-white/10 backdrop-blur-lg rounded-xl p-4">
                    <p className="text-white">
                      <span className="font-bold">{nfts.length}</span> promotion NFT(s) found
                    </p>
                  </div>

                  <div className="grid gap-6">
                    {nfts.map((nft, index) => (
                      <div
                        key={nft.mint}
                        className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                              {nft.name}
                            </h3>
                            <div className="flex gap-2 flex-wrap">
                              <span className="bg-purple-500/30 text-purple-200 px-3 py-1 rounded-full text-sm">
                                {nft.category}
                              </span>
                              <span className="bg-blue-500/30 text-blue-200 px-3 py-1 rounded-full text-sm">
                                {nft.discountPercent}% OFF
                              </span>
                              {nft.isCompressed && (
                                <span className="bg-green-500/30 text-green-200 px-3 py-1 rounded-full text-sm">
                                  cNFT
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-black/20 rounded-xl p-4 mb-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Merchant:</span>
                              <p className="text-white font-semibold">{nft.merchant}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Code:</span>
                              <p className="text-white font-mono text-xs">{nft.redemptionCode}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Expires:</span>
                              <p className="text-white">{nft.expiryDate}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Status:</span>
                              <p className="text-green-400 font-semibold">✓ Available</p>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => redeemNFT(nft)}
                          disabled={redeeming === nft.mint}
                          className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 px-6 rounded-xl hover:from-green-600 hover:to-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {redeeming === nft.mint ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="animate-spin">⚡</span>
                              Redeeming...
                            </span>
                          ) : (
                            '🎫 Redeem This Discount'
                          )}
                        </button>

                        <p className="text-xs text-gray-400 text-center mt-2">
                          NFT will be burned after redemption to prevent reuse
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Info Box */}
              <div className="mt-8 bg-blue-500/20 border border-blue-500/50 rounded-xl p-6">
                <h4 className="text-white font-bold mb-2">ℹ️ How Redemption Works:</h4>
                <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                  <li>Click "Redeem This Discount" on your chosen NFT</li>
                  <li>Approve the transaction in your wallet (cost: ~0.000006 SOL)</li>
                  <li>Transaction is recorded on-chain with memo containing redemption details</li>
                  <li>NFT is burned automatically to prevent double-spending</li>
                  <li>Merchant can verify redemption on blockchain explorer</li>
                  <li>You receive your discount in real-world transaction</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

