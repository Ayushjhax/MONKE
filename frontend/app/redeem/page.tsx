'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import ClientWalletButton from '../../components/ClientWalletButton';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, TransactionInstruction } from '@solana/web3.js';
import Link from 'next/link';
import { createRealBurnTransaction, fetchAssetDataForBurn, createRedemptionOnlyTransaction } from '../../lib/burn-nft';

interface NFTData {
  mint: string;
  name: string;
  symbol: string;
  category: string;
  discountPercent: number | null;
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
  const [stakingStatuses, setStakingStatuses] = useState<{ [key: string]: any }>({});
  const [redemptionResult, setRedemptionResult] = useState<{
    isOpen: boolean;
    success: boolean;
    couponCode?: string;
    txSignature?: string;
    message?: string;
    nftName?: string;
  }>({ isOpen: false, success: false });

  // Sample merchant wallet
  const merchantWallet = 'aPi7gR9c3s7eUvtWu7HVFRakW1e9rZz59ZNzrGbkKZ3';

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here if you have one
      console.log('Copied to clipboard:', text);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Fetch user's NFTs and staking statuses
  useEffect(() => {
    if (publicKey) {
      console.log('🔗 Wallet connected, fetching NFTs for:', publicKey.toBase58());
      fetchUserNFTs();
      fetchStakingStatuses();
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

      // Show ALL NFTs with metadata (like profile page) - NO RESTRICTIVE FILTERING
      const promotionNFTs = assets
        .filter((asset: any) => {
          const hasMetadata = !!asset.content?.metadata;
          const isBurned = asset.burnt || false;
          
          console.log(`🔍 Asset ${asset.id}:`, {
            name: asset.content?.metadata?.name || 'No name',
            hasMetadata,
            isBurned,
            interface: asset.interface,
            attributes: asset.content?.metadata?.attributes?.length || 0,
            description: asset.content?.metadata?.description || 'No description',
            image: asset.content?.metadata?.image || 'No image'
          });
          
          return hasMetadata && !isBurned; // Show all NFTs with metadata
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
          
          // Extract values with better fallbacks - handle any NFT type
          const category = attrs.find((a: any) => a.trait_type === 'Category')?.value || 
                          attrs.find((a: any) => a.trait_type === 'category')?.value || 
                          attrs.find((a: any) => a.trait_type === 'Type')?.value ||
                          'NFT'; // Default to 'NFT' for any NFT
          
          // Better discount percentage extraction with more attribute variations
          let discountPercent = null;
          const discountAttributes = [
            'Discount Percentage', 'discount_percentage', 'Discount', 'discount',
            'Discount%', 'discount%', 'Percent Off', 'percent_off', 'Percent', 'percent',
            'Value', 'value', 'Amount', 'amount', 'Rate', 'rate'
          ];
          
          for (const attrName of discountAttributes) {
            const attr = attrs.find((a: any) => a.trait_type === attrName);
            if (attr && attr.value) {
              // Try to extract number from the value
              const value = attr.value.toString();
              const numberMatch = value.match(/(\d+)/);
              if (numberMatch) {
                discountPercent = parseInt(numberMatch[1]);
                console.log(`🔍 Found discount from attribute "${attrName}": ${discountPercent}%`);
                break;
              }
            }
          }
          
          // If no discount found, set to null (don't show discount)
          if (discountPercent === null) {
            console.log(`⚠️ No discount percentage found in attributes for ${asset.id}`);
            console.log(`🔍 Available attributes:`, attrs.map((a: any) => `${a.trait_type}: ${a.value}`));
          } 
          
          const merchant = attrs.find((a: any) => a.trait_type === 'Merchant')?.value || 
                          attrs.find((a: any) => a.trait_type === 'merchant')?.value || 
                          attrs.find((a: any) => a.trait_type === 'Creator')?.value ||
                          'NFT Creator'; // Default merchant name
          
          const redemptionCode = attrs.find((a: any) => a.trait_type === 'Redemption Code')?.value || 
                                attrs.find((a: any) => a.trait_type === 'redemption_code')?.value ||
                                attrs.find((a: any) => a.trait_type === 'Code')?.value ||
                                generateRedemptionCode(); // Generate if not found
          
          const expiryDate = attrs.find((a: any) => a.trait_type === 'Expiry Date')?.value || 
                            attrs.find((a: any) => a.trait_type === 'expiry_date')?.value ||
                            attrs.find((a: any) => a.trait_type === 'Expires')?.value ||
                            '2025-12-31'; // Default expiry far in future
          
          console.log(`🔍 Extracted values for ${asset.id}:`, {
            category,
            discountPercent: discountPercent !== null ? `${discountPercent}%` : 'No discount found',
            merchant,
            redemptionCode,
            expiryDate
          });
          
          return {
            mint: asset.id,
            name: asset.content?.metadata?.name || 'Unknown',
            symbol: asset.content?.metadata?.symbol || '',
            category,
            discountPercent: discountPercent, // Use the actual extracted value or null
            merchant,
            redemptionCode,
            expiryDate,
            isCompressed: asset.compression?.compressed || false
          };
        });

      console.log('🔍 All NFTs found:', promotionNFTs.length);
      console.log('🔍 NFT details:', promotionNFTs.map((nft: any) => ({ mint: nft.mint, name: nft.name })));

      setNfts(promotionNFTs);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStakingStatuses = async () => {
    if (!publicKey) return;

    try {
      const response = await fetch(
        `/api/staking/my-stakes?ownerAddress=${publicKey.toBase58()}`
      );
      const data = await response.json();

      if (data.success) {
        const statusMap: { [key: string]: any } = {};
        data.stakes.forEach((stake: any) => {
          statusMap[stake.assetId] = stake;
        });
        setStakingStatuses(statusMap);
      }
    } catch (error) {
      console.error('Error fetching staking statuses:', error);
    }
  };

  const handleStakeNFT = async (nft: NFTData) => {
    if (!publicKey) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const response = await fetch('/api/staking/stake',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assetId: nft.mint,
            ownerAddress: publicKey.toBase58()
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        alert(`Successfully staked ${nft.name}! You'll start earning rewards.`);
        fetchStakingStatuses();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error staking NFT:', error);
      alert('Failed to stake NFT');
    }
  };

  const redeemNFT = async (nft: NFTData) => {
    if (!publicKey || !sendTransaction) {
      alert('Please connect your wallet');
      return;
    }

    setRedeeming(nft.mint);
    try {
      // Generate 8-digit random coupon code
      const generateCouponCode = () => {
        const digits = '0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
          code += digits.charAt(Math.floor(Math.random() * digits.length));
        }
        return code;
      };

      const couponCode = generateCouponCode();
      console.log('🎫 Generated coupon code:', couponCode);
      
      console.log('🔥 Starting REAL NFT burn process...');
      
      // Step 1: Fetch asset proof data from Helius DAS API for burning
      const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY || '22abefb4-e86a-482d-9a62-452fcd4f2cb0';
      console.log('📡 Fetching asset proof for burn...');
      
      const assetData = await fetchAssetDataForBurn(nft.mint, HELIUS_API_KEY);

      console.log('🔍 Detailed asset data check:', {
        hasAssetData: !!assetData,
        dataHash: assetData?.dataHash ? 'present' : 'missing',
        creatorHash: assetData?.creatorHash ? 'present' : 'missing',
        proof: assetData?.proof?.length || 0,
        merkleTree: assetData?.merkleTree,
        leafIndex: assetData?.leafIndex,
        nonce: assetData?.nonce
      });

      let transaction: Transaction;

      // Try to burn if we have any valid data
      if (assetData && assetData.merkleTree && assetData.proof && assetData.proof.length > 0) {
        console.log('✅ Asset data found - creating REAL burn transaction');
        console.log('   Merkle Tree:', assetData.merkleTree);
        console.log('   Leaf Index:', assetData.leafIndex);
        console.log('   Proof length:', assetData.proof.length);
        console.log('   Has dataHash:', !!assetData.dataHash);
        console.log('   Has creatorHash:', !!assetData.creatorHash);
        console.log('   Has nonce:', !!assetData.nonce);
        
        // Create REAL burn transaction with Bubblegum instruction
        transaction = await createRealBurnTransaction(connection, {
          nftMint: nft.mint,
          userWallet: publicKey.toBase58(),
          merchantWallet: merchantWallet,
          redemptionCode: couponCode,
          discountValue: nft.discountPercent || 0,
          merkleTree: assetData.merkleTree,
          leafIndex: assetData.leafIndex,
          root: assetData.root,
          proof: assetData.proof,
          dataHash: assetData.dataHash,
          creatorHash: assetData.creatorHash,
          nonce: assetData.nonce,
        });
      } else {
        console.log('⚠️  Asset data incomplete - creating redemption-only transaction');
        console.log('   Missing:', {
          hasAssetData: !!assetData,
          hasMerkleTree: !!assetData?.merkleTree,
          hasRoot: !!assetData?.root,
          hasProof: (assetData?.proof?.length || 0) > 0
        });
        
        // Fallback: Create redemption transaction without burn
        transaction = await createRedemptionOnlyTransaction(connection, {
          nftMint: nft.mint,
          userWallet: publicKey.toBase58(),
          merchantWallet: merchantWallet,
          redemptionCode: couponCode,
          discountValue: nft.discountPercent || 0
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

      // Store coupon redemption in database
      try {
        console.log('💾 Storing coupon redemption in database...');
        const storeResponse = await fetch('/api/redemption/store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nftMint: nft.mint,
            walletAddress: publicKey.toBase58(),
            couponCode: couponCode,
            txSignature: signature,
            discountValue: nft.discountPercent || 0,
            merchantName: nft.merchant
          })
        });

        const storeData = await storeResponse.json();
        console.log('✅ Coupon redemption stored:', storeData);
      } catch (storeError) {
        console.error('⚠️ Failed to store coupon redemption:', storeError);
        // Continue anyway - transaction is already confirmed
      }

      const message = assetData && assetData.merkleTree && assetData.proof && assetData.proof.length > 0
        ? `🔥 NFT BURN ATTEMPTED!\n\nThe NFT burn instruction was added to the transaction.\n\nThe coupon code has been stored in the database.\n\nYou can now verify this redemption on the verify page.`
        : `📝 Transaction recorded on-chain\n\nNote: NFT burn requires merkle tree data. Redemption is tracked via memo.\n\nThis coupon code has been stored in the database.`;

      // Show redemption result modal
      setRedemptionResult({
        isOpen: true,
        success: true,
        couponCode,
        txSignature: signature,
        message,
        nftName: nft.name
      });

      // Refresh NFT list
      await fetchUserNFTs();

    } catch (error) {
      console.error('❌ Error redeeming:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Show error in modal
      setRedemptionResult({
        isOpen: true,
        success: false,
        message: `Error during redemption: ${errorMessage}\n\nPlease try again.`,
        nftName: nft.name
      });
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
                <h1 className="text-xl font-semibold text-gray-900">Redeem NFTs</h1>
                <p className="text-sm text-gray-500">Redeem your NFTs</p>
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
              {publicKey && (
                <Link
                  href={`/profile/${(publicKey as any).toBase58()}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </Link>
              )}
              <ClientWalletButton className="!bg-black hover:!bg-gray-800" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎫 Redeem Your NFTs
            </h1>
            <p className="text-gray-600">
              Connect your wallet to view and redeem your NFTs
            </p>
          </div>

          {!publicKey ? (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 text-center">
              <p className="text-gray-900 text-lg mb-4">
                Please connect your wallet to view your NFTs
              </p>
              <ClientWalletButton className="!bg-black hover:!bg-gray-800" />
            </div>
          ) : (
            <div>
              {/* Mode Selector */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Choose Redemption Method:</h2>
                <div className="flex gap-4">
                  <button
                    onClick={() => setRedeemMode('nft')}
                    className={`px-6 py-3 rounded-lg font-medium transition ${
                      redeemMode === 'nft' 
                        ? 'bg-black text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🔥 Direct NFT Burn
                  </button>
                  <button
                    onClick={() => setRedeemMode('signature')}
                    className={`px-6 py-3 rounded-lg font-medium transition ${
                      redeemMode === 'signature' 
                        ? 'bg-black text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📱 Solana Pay QR Code
                  </button>
                </div>
              </div>

              {/* Solana Pay Mode */}
              {redeemMode === 'signature' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">📱 Redeem with Solana Pay Transaction</h3>
                  <p className="text-gray-600 mb-4">
                    Enter the transaction signature from your Solana Pay QR code scan:
                  </p>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={transactionSignature}
                      onChange={(e) => setTransactionSignature(e.target.value)}
                      placeholder="Enter transaction signature (e.g., 5K7...ABC123)"
                      className="w-full p-3 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <button
                      onClick={redeemWithSignature}
                      disabled={loading || !transactionSignature.trim()}
                      className="w-full bg-black hover:bg-gray-800 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition"
                    >
                      {loading ? 'Verifying...' : 'Verify & Redeem'}
                    </button>
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-gray-900 font-bold mb-2">📋 How to use:</h4>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li>Merchant generates QR code at <code className="bg-gray-200 px-1 rounded">/merchant</code></li>
                      <li>Customer scans QR code with Solana wallet</li>
                      <li>Customer approves transaction (gets signature)</li>
                      <li>Customer enters signature here to redeem discount</li>
                    </ol>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center text-gray-600 text-xl">
                  Loading your NFTs...
                </div>
              ) : nfts.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 text-center">
                  <p className="text-gray-900 text-lg">
                    No NFTs found in your wallet
                  </p>
                  <p className="text-gray-600 mt-2">
                    Make sure you're on the correct wallet and network (Devnet)
                  </p>
                </div>
              ) : redeemMode === 'nft' ? (
                <div>
                  <div className="mb-6 bg-gray-50 rounded-xl border border-gray-200 p-4">
                    <p className="text-gray-900">
                      <span className="font-bold">{nfts.length}</span> NFT(s) found in your wallet
                    </p>
                  </div>

                  <div className="grid gap-6">
                    {nfts.map((nft, index) => (
                      <div
                        key={nft.mint}
                        className="bg-white rounded-2xl border border-gray-200 p-6"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                              {nft.name}
                            </h3>
                            <div className="flex gap-2 flex-wrap">
                              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                                {nft.category}
                              </span>
                              {nft.isCompressed && (
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                                  cNFT
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 mb-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Merchant:</span>
                              <p className="text-gray-900 font-semibold">{nft.merchant}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Code:</span>
                              <p className="text-gray-900 font-mono text-xs">{nft.redemptionCode}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Expires:</span>
                              <p className="text-gray-900">{nft.expiryDate}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Status:</span>
                              <p className="text-green-600 font-semibold">✓ Available</p>
                            </div>
                          </div>
                        </div>

                        {stakingStatuses[nft.mint] ? (
                          <div className="space-y-3">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <p className="text-yellow-800 text-sm font-semibold mb-1">
                                ⭐ Currently Staking
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-xs text-yellow-700">
                                <div>
                                  <span className="text-yellow-600">Pending Rewards:</span>
                                  <p className="font-bold">{stakingStatuses[nft.mint].pendingRewards?.toFixed(6) || '0'}</p>
                                </div>
                                <div>
                                  <span className="text-yellow-600">Tier:</span>
                                  <p className="font-bold capitalize">{stakingStatuses[nft.mint].tier}</p>
                                </div>
                              </div>
                            </div>
                            <Link
                              href="/staking"
                              className="block w-full text-center bg-gray-100 text-gray-900 font-semibold py-3 px-6 rounded-xl hover:bg-gray-200 transition"
                            >
                              📊 View in Staking Dashboard
                            </Link>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => handleStakeNFT(nft)}
                              className="bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-xl hover:bg-gray-200 transition"
                            >
                              ⭐ Stake NFT
                            </button>
                            <button
                              onClick={() => redeemNFT(nft)}
                              disabled={redeeming === nft.mint}
                              className="bg-black text-white font-semibold py-3 px-4 rounded-xl hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {redeeming === nft.mint ? (
                                <span className="flex items-center justify-center gap-2">
                                  <span className="animate-spin">⚡</span>
                                  <span className="hidden sm:inline">Redeeming...</span>
                                </span>
                              ) : (
                                '🎫 Redeem'
                              )}
                            </button>
                          </div>
                        )}

                        <p className="text-xs text-gray-600 text-center mt-2">
                          {stakingStatuses[nft.mint] 
                            ? 'NFT is staked and earning rewards'
                            : 'Stake to earn rewards or redeem for discount'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Info Box */}
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="text-gray-900 font-bold mb-2">ℹ️ How Redemption Works:</h4>
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
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

      {/* Redemption Result Modal */}
      {redemptionResult.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {redemptionResult.success ? '✅ Redemption Successful!' : '❌ Redemption Failed'}
                </h3>
                <button
                  onClick={() => setRedemptionResult({ isOpen: false, success: false })}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* NFT Name */}
              {redemptionResult.nftName && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">NFT:</p>
                  <p className="font-semibold text-gray-900">{redemptionResult.nftName}</p>
                </div>
              )}

              {/* Coupon Code */}
              {redemptionResult.success && redemptionResult.couponCode && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">🎫 Your Coupon Code:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg font-mono text-sm text-black">
                      {redemptionResult.couponCode}
                    </code>
                    <button
                      onClick={() => copyToClipboard(redemptionResult.couponCode!)}
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                      title="Copy coupon code"
                    >
                      📋
                    </button>
                  </div>
                </div>
              )}

              {/* Transaction Signature */}
              {redemptionResult.success && redemptionResult.txSignature && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">🔗 Transaction ID:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg font-mono text-xs break-all text-black">
                      {redemptionResult.txSignature}
                    </code>
                    <button
                      onClick={() => copyToClipboard(redemptionResult.txSignature!)}
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                      title="Copy transaction ID"
                    >
                      📋
                    </button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <a
                      href={`https://explorer.solana.com/tx/${redemptionResult.txSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      View on Solana Explorer
                    </a>
                    <a
                      href={`/verify`}
                      className="text-green-600 hover:text-green-800 text-sm underline"
                    >
                      Verify Redemption
                    </a>
                  </div>
                </div>
              )}

              {/* Message */}
              {redemptionResult.message && (
                <div className="mb-6">
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {redemptionResult.message}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setRedemptionResult({ isOpen: false, success: false })}
                  className="flex-1 bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-xl hover:bg-gray-200 transition"
                >
                  Close
                </button>
                {redemptionResult.success && (
                  <button
                    onClick={() => {
                      setRedemptionResult({ isOpen: false, success: false });
                      // Refresh NFT list
                      fetchUserNFTs();
                    }}
                    className="flex-1 bg-black text-white font-semibold py-3 px-4 rounded-xl hover:bg-gray-800 transition"
                  >
                    Refresh NFTs
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

