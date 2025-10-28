'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import ClientWalletButton from '../../../components/ClientWalletButton';
import Link from 'next/link';
import {
  formatPrice,
  formatDuration,
  formatDateTime,
  formatDate,
  getAirlineName,
  calculateDiscountedPrice,
} from '@/lib/amadeus';
import RatingWidget from '@/components/social/RatingWidget';
import VoteButtons from '@/components/social/VoteButtons';
import ShareButtons from '@/components/social/ShareButtons';
import CommentSection from '@/components/social/CommentSection';
import SocialStats from '@/components/social/SocialStats';
import { createRealBurnTransaction, fetchAssetDataForBurn, createRedemptionOnlyTransaction } from '@/lib/burn-nft';
import { PublicKey, Transaction } from '@solana/web3.js';

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

interface BurnedNFT {
  nftMint: string;
  couponCode: string;
  discountValue: number;
  merchantName: string;
  txSignature: string;
  burnedAt: string;
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { connected, publicKey, sendTransaction, signTransaction } = useWallet();
  const { connection } = useConnection();
  
  const dealId = params.dealId as string;
  const dealTypeParam = searchParams.get('type');
  const dealType = dealTypeParam || (dealId.startsWith('flight-') ? 'flight' : dealId.startsWith('hotel-') ? 'hotel' : 'collection');
  const offerId = dealId.replace(/^(flight|hotel)-/, '');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dealDetails, setDealDetails] = useState<any>(null);
  
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [nftsLoading, setNftsLoading] = useState(false);
  const [burningNFT, setBurningNFT] = useState<string | null>(null);
  const [burnedNFT, setBurnedNFT] = useState<BurnedNFT | null>(null);
  
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingReference, setBookingReference] = useState('');
  
  const [socialStats, setSocialStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');

  // Sample merchant wallet
  const merchantWallet = 'aPi7gR9c3s7eUvtWu7HVFRakW1e9rZz59ZNzrGbkKZ3';

  useEffect(() => {
    fetchSocialStats();
  }, [dealId, publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchUserNFTs();
    }
  }, [connected, publicKey]);

  const fetchSocialStats = async () => {
    try {
      const response = await fetch(
        `/api/social/stats?dealId=${dealId}&userWallet=${publicKey?.toBase58() || ''}`
      );
      const data = await response.json();
      if (response.ok) {
        setSocialStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching social stats:', error);
    }
  };

  useEffect(() => {
    // Get the selected deal from sessionStorage
    const selectedDealData = sessionStorage.getItem('selectedDeal');
    
    if (selectedDealData) {
      try {
        const selectedDeal = JSON.parse(selectedDealData);
        
        // Verify it's the correct type
        if (selectedDeal.type === dealType) {
          setDealDetails(selectedDeal.data);
        } else {
          setError('Deal type mismatch');
        }
      } catch (e) {
        console.error('Error parsing deal data:', e);
        setError('Invalid deal data');
      }
    } else {
      // Fallback: try the old method
      const storedDeals = sessionStorage.getItem(dealType === 'flight' ? 'flights' : 'hotels');
      if (storedDeals) {
        try {
          const deals = JSON.parse(storedDeals);
          const deal = deals.find((d: any) => d.id === offerId);
          if (deal) {
            setDealDetails(deal);
          } else {
            setError('Deal not found. Please search again from the marketplace.');
          }
        } catch (e) {
          setError('Deal not found. Please search again from the marketplace.');
        }
      } else {
        setError('Deal not found. Please search again from the marketplace.');
      }
    }
    
    setLoading(false);
  }, [dealId, dealType, offerId]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchUserNFTs();
    }
  }, [connected, publicKey]);

  const fetchUserNFTs = async () => {
    if (!publicKey) return;

    setNftsLoading(true);
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
      console.log('🔍 All assets:', assets.map((a: any) => ({ 
        id: a.id, 
        name: a.content?.metadata?.name, 
        burned: a.burnt,
        attributes: a.content?.metadata?.attributes?.map((attr: any) => `${attr.trait_type}: ${attr.value}`) || []
      })));

      // Filter for ALL cNFTs (compressed NFTs) - SHOW EVERYTHING
      const allCNFTs = assets
        .filter((asset: any) => {
          const isCompressed = asset.compression?.compressed || false;
          const isBurned = asset.burnt || false;
          
          // Debug logging for each asset
          console.log(`🔍 Asset ${asset.id}:`, {
            name: asset.content?.metadata?.name || 'Unknown',
            burned: isBurned,
            isCompressed: isCompressed,
            attributes: asset.content?.metadata?.attributes?.map((a: any) => `${a.trait_type}: ${a.value}`) || []
          });
          
          // Include ALL non-burned cNFTs
          const shouldInclude = isCompressed && !isBurned;
          console.log(`   → ${shouldInclude ? 'INCLUDED' : 'EXCLUDED'}`);
          
          return shouldInclude;
        })
        .map((asset: any) => {
          const attrs = asset.content?.metadata?.attributes || [];
          
          // Generate a random redemption code if not found in metadata
          const generateRedemptionCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < 8; i++) {
              result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
          };
          
          // Extract values with better fallbacks for ANY cNFT
          const category = attrs.find((a: any) => a.trait_type === 'Category')?.value || 
                          attrs.find((a: any) => a.trait_type === 'category')?.value || 
                          attrs.find((a: any) => a.trait_type === 'Type')?.value ||
                          attrs.find((a: any) => a.trait_type === 'Collection')?.value ||
                          'General';
          
          // Try to extract discount from various possible attributes
          let discountPercent = 20; // Default discount
          const discountAttr = attrs.find((a: any) => 
            a.trait_type && (
              a.trait_type.toLowerCase().includes('discount') ||
              a.trait_type.toLowerCase().includes('percent') ||
              a.trait_type.toLowerCase().includes('off')
            )
          );
          
          if (discountAttr) {
            const value = discountAttr.value;
            if (typeof value === 'number') {
              discountPercent = value;
            } else if (typeof value === 'string') {
              const numValue = parseInt(value.replace('%', '').replace('off', ''));
              if (!isNaN(numValue)) {
                discountPercent = numValue;
              }
            }
          }
          
          const merchant = attrs.find((a: any) => a.trait_type === 'Merchant')?.value || 
                          attrs.find((a: any) => a.trait_type === 'merchant')?.value || 
                          attrs.find((a: any) => a.trait_type === 'Brand')?.value ||
                          attrs.find((a: any) => a.trait_type === 'Creator')?.value ||
                          'NFT Partner';
          
          const redemptionCode = attrs.find((a: any) => a.trait_type === 'Redemption Code')?.value || 
                                attrs.find((a: any) => a.trait_type === 'redemption_code')?.value ||
                                attrs.find((a: any) => a.trait_type === 'Code')?.value ||
                                generateRedemptionCode(); // Generate if not found
          
          const expiryDate = attrs.find((a: any) => a.trait_type === 'Expiry Date')?.value || 
                            attrs.find((a: any) => a.trait_type === 'expiry_date')?.value ||
                            attrs.find((a: any) => a.trait_type === 'Expires')?.value ||
                            '2024-12-31'; // Default expiry
          
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

      console.log('🔍 Filtered cNFTs:', allCNFTs.length);
      setNfts(allCNFTs);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
    } finally {
      setNftsLoading(false);
    }
  };

  const burnNFT = async (nft: NFTData) => {
    if (!publicKey || !sendTransaction) {
      alert('Please connect your wallet');
      return;
    }

    setBurningNFT(nft.mint);
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

      let transaction: Transaction;

      // Try to burn if we have any valid data
      if (assetData && assetData.merkleTree && assetData.proof && assetData.proof.length > 0) {
        console.log('✅ Asset data found - creating REAL burn transaction');
        
        // Create REAL burn transaction with Bubblegum instruction
        transaction = await createRealBurnTransaction(connection, {
          nftMint: nft.mint,
          userWallet: publicKey.toBase58(),
          merchantWallet: merchantWallet,
          redemptionCode: couponCode,
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
        console.log('⚠️  Asset data incomplete - creating redemption-only transaction');
        
        // Fallback: Create redemption transaction without burn
        transaction = await createRedemptionOnlyTransaction(connection, {
          nftMint: nft.mint,
          userWallet: publicKey.toBase58(),
          merchantWallet: merchantWallet,
          redemptionCode: couponCode,
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

      // Simulate transaction first to catch errors
      console.log('🔍 Simulating transaction...');
      try {
        const simulationResult = await connection.simulateTransaction(transaction);
        console.log('📊 Simulation result:', simulationResult);
        
        if (simulationResult.value.err) {
          console.error('❌ Simulation failed with error:', simulationResult.value.err);
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
            discountValue: nft.discountPercent,
            merchantName: nft.merchant
          })
        });

        const storeData = await storeResponse.json();
        console.log('✅ Coupon redemption stored:', storeData);
      } catch (storeError) {
        console.error('⚠️ Failed to store coupon redemption:', storeError);
        // Continue anyway - transaction is already confirmed
      }

      // Set the burned NFT data for immediate discount application
      const burnedNFTData: BurnedNFT = {
        nftMint: nft.mint,
        couponCode: couponCode,
        discountValue: nft.discountPercent,
        merchantName: nft.merchant,
        txSignature: signature,
        burnedAt: new Date().toISOString()
      };

      setBurnedNFT(burnedNFTData);

      const message = assetData && assetData.merkleTree && assetData.proof && assetData.proof.length > 0
        ? `✅ NFT Burned Successfully!\n\n🎫 Your Coupon Code: ${couponCode}\n\n🔥 NFT BURNED!\n\nTransaction: ${signature}\n\nThe NFT has been permanently burned and the discount is now applied to your booking!`
        : `✅ Redemption Successful!\n\n🎫 Your Coupon Code: ${couponCode}\n\n📝 Transaction recorded on-chain\n\nTransaction: ${signature}\n\nNote: NFT burn requires merkle tree data. Redemption is tracked via memo.\n\nThe discount is now applied to your booking!`;

      alert(message);

      // Refresh NFT list
      await fetchUserNFTs();

    } catch (error) {
      console.error('❌ Error burning NFT:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error during NFT burn: ${errorMessage}\n\nPlease try again.`);
    } finally {
      setBurningNFT(null);
    }
  };

  const handleBooking = async () => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    if (!dealDetails) {
      alert('Deal details not available');
      return;
    }

    setBooking(true);
    setError(null);

    try {
      const bookingRequest = {
        userWallet: publicKey.toString(),
        dealType,
        amadeusOfferId: dealDetails.id,
        originalPrice: dealDetails.price,
        currency: dealDetails.currency || 'USD',
        couponCode: burnedNFT?.couponCode,
        bookingDetails: dealDetails.rawOffer,
      };

      const response = await fetch('/api/amadeus/booking/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingRequest),
      });

      const data = await response.json();

      if (data.success) {
        setBookingSuccess(true);
        setBookingReference(data.booking.bookingReference);
        
        // Show success message with redirect option
        setTimeout(() => {
          router.push('/bookings');
        }, 3000);
      } else {
        setError(data.error || 'Booking failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error booking:', err);
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading deal details...</p>
        </div>
      </div>
    );
  }

  if (error && !dealDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{error}</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-700 mb-2">
              <strong>💡 Tip:</strong> Deal details are lost when you refresh the page or use a direct link.
            </p>
            <p className="text-sm text-gray-600">
              To view this deal, please go back to the marketplace and search for flights/hotels again, then click "View Details".
            </p>
          </div>
          <div className="space-y-3">
            <Link
              href="/marketplace"
              className="block w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔍 Search Deals in Marketplace
            </Link>
            <Link
              href="/community"
              className="block w-full px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              🔥 Browse Trending Deals
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <div className="text-green-600 text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-4">Your booking has been successfully simulated.</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-600 mb-1">Booking Reference</div>
            <div className="text-2xl font-bold text-blue-600">{bookingReference}</div>
          </div>
          <p className="text-sm text-gray-500 mb-6">Redirecting to My Bookings...</p>
          <Link
            href="/bookings"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            View My Bookings
          </Link>
        </div>
      </div>
    );
  }

  const finalPrice = burnedNFT
    ? calculateDiscountedPrice(dealDetails.price, burnedNFT.discountValue).finalPrice
    : dealDetails.price;

  const savings = burnedNFT
    ? calculateDiscountedPrice(dealDetails.price, burnedNFT.discountValue).discountAmount
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/marketplace" className="text-gray-600 hover:text-gray-900">
                ← Back to Marketplace
              </Link>
            </div>
            <ClientWalletButton className="!bg-blue-600 hover:!bg-blue-700" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Deal Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Social Stats Overview */}
            {socialStats && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <SocialStats
                  avgRating={socialStats.avg_rating}
                  ratingCount={socialStats.rating_count}
                  commentCount={socialStats.comment_count}
                  upvoteCount={socialStats.upvote_count}
                  downvoteCount={socialStats.downvote_count}
                  shareCount={socialStats.share_count}
                  isHot={socialStats.hotness_score > 50}
                  compact={false}
                />
              </div>
            )}

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="border-b">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'details'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Deal Details
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'reviews'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Reviews & Comments
                    {socialStats?.comment_count > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
                        {socialStats.comment_count}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {activeTab === 'details' ? (
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    {dealType === 'flight' ? '✈️ Flight' : '🏨 Hotel'}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {dealType === 'flight'
                    ? `${dealDetails.origin} → ${dealDetails.destination}`
                    : dealDetails.name}
                </h1>
              </div>

              {dealType === 'flight' ? (
                <div className="space-y-6">
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Flight Details</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-2xl font-bold text-gray-900">{dealDetails.origin}</div>
                          <div className="text-sm text-gray-500">{formatDateTime(dealDetails.departureTime)}</div>
                        </div>
                        <div className="flex-1 text-center mx-4">
                          <div className="text-sm text-gray-500">{formatDuration(dealDetails.duration)}</div>
                          <div className="h-px bg-gray-300 my-2"></div>
                          <div className="text-xs text-gray-400">
                            {dealDetails.stops === 0 ? 'Non-stop' : `${dealDetails.stops} stop${dealDetails.stops > 1 ? 's' : ''}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{dealDetails.destination}</div>
                          <div className="text-sm text-gray-500">{formatDateTime(dealDetails.arrivalTime)}</div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-600">Airline</div>
                            <div className="font-medium text-gray-900">{getAirlineName(dealDetails.airline)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Seats Available</div>
                            <div className="font-medium text-gray-900">{dealDetails.seats}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Hotel Details</h3>
                    {dealDetails.address && (
                      <p className="text-gray-600 mb-4">{dealDetails.address}</p>
                    )}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Check-in</span>
                        <span className="font-medium text-gray-900">{formatDate(dealDetails.checkInDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Check-out</span>
                        <span className="font-medium text-gray-900">{formatDate(dealDetails.checkOutDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Room Type</span>
                        <span className="font-medium text-gray-900">{dealDetails.roomType}</span>
                      </div>
                      {dealDetails.rating && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Rating</span>
                          <span className="font-medium text-gray-900">⭐ {dealDetails.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
              ) : (
                /* Reviews & Comments Tab */
                <div className="p-6 space-y-8">
                  {/* Rating Section */}
                  <div>
                    <h3 className="text-xl font-bold mb-4">Rate this Deal</h3>
                    <RatingWidget
                      dealId={dealId}
                      dealType={dealType}
                      initialStats={socialStats ? {
                        avg_rating: socialStats.avg_rating,
                        rating_count: socialStats.rating_count
                      } : undefined}
                      onRatingUpdate={(newStats) => {
                        setSocialStats({ ...socialStats, ...newStats });
                      }}
                    />
                  </div>

                  {/* Comments Section */}
                  <div>
                    <CommentSection
                      dealId={dealId}
                      dealType={dealType}
                      onCommentCountUpdate={(count) => {
                        setSocialStats({ ...socialStats, comment_count: count });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Booking Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8 space-y-6">
              {/* Vote & Share Actions */}
              <div className="flex items-center justify-between pb-6 border-b">
                <VoteButtons
                  dealId={dealId}
                  dealType={dealType}
                  initialUpvotes={socialStats?.upvote_count}
                  initialDownvotes={socialStats?.downvote_count}
                  initialUserVote={socialStats?.user_vote}
                  onVoteUpdate={(upvotes, downvotes) => {
                    setSocialStats({ ...socialStats, upvote_count: upvotes, downvote_count: downvotes });
                  }}
                />
              </div>

              <div className="pb-6 border-b">
                <h4 className="text-sm font-semibold mb-3">Share this deal</h4>
                <ShareButtons
                  dealId={dealId}
                  dealType={dealType}
                  dealTitle={dealDetails?.name || `${dealDetails?.origin} → ${dealDetails?.destination}`}
                  initialShareCount={socialStats?.share_count}
                  onShareUpdate={(count) => {
                    setSocialStats({ ...socialStats, share_count: count });
                  }}
                />
              </div>

              <h3 className="text-lg font-semibold text-gray-900">Booking Summary</h3>
              
              {/* Price */}
              <div className="mb-6">
                <div className="flex justify-between text-gray-600 mb-2">
                  <span>Original Price</span>
                  <span>{formatPrice(dealDetails.price, dealDetails.currency)}</span>
                </div>
                {burnedNFT && (
                  <>
                    <div className="flex justify-between text-green-600 mb-2">
                      <span>Discount ({burnedNFT.discountValue}%)</span>
                      <span>-{formatPrice(savings, dealDetails.currency)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-xl text-gray-900">
                      <span>Final Price</span>
                      <span>{formatPrice(finalPrice, dealDetails.currency)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Available NFTs for Burning */}
              {connected && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Available cNFTs (All Compressed NFTs)</h4>
                  {nftsLoading ? (
                    <div className="text-sm text-gray-500">Loading NFTs...</div>
                  ) : nfts.length === 0 ? (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-500">
                        No compressed NFTs (cNFTs) found in your wallet.
                      </div>
                      <div className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg">
                        <strong>How to get cNFTs:</strong><br/>
                        1. Go to <Link href="/marketplace" className="text-blue-600 hover:underline">Marketplace</Link><br/>
                        2. Browse available collections<br/>
                        3. Mint compressed NFTs to your wallet<br/>
                        4. Return here to burn them for discounts
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {nfts.map((nft) => (
                        <div
                          key={nft.mint}
                          className="w-full text-left p-3 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <div className="font-medium text-sm text-gray-900">{nft.name}</div>
                              <div className="text-xs text-gray-500">{nft.merchant}</div>
                            </div>
                            <div className="text-lg font-bold text-purple-600">{nft.discountPercent}% OFF</div>
                          </div>
                          <div className="flex gap-2 flex-wrap mb-2">
                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                              {nft.category}
                            </span>
                            {nft.isCompressed && (
                              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                                cNFT
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => burnNFT(nft)}
                            disabled={burningNFT === nft.mint}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {burningNFT === nft.mint ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin">🔥</span>
                                <span>Burning NFT...</span>
                              </span>
                            ) : (
                              '🔥 Burn NFT for Discount'
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Burned NFT Status */}
              {burnedNFT && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-green-800 mb-2">✅ NFT Burned Successfully!</h4>
                  <div className="space-y-1 text-xs text-green-700">
                    <div><strong>Coupon Code:</strong> {burnedNFT.couponCode}</div>
                    <div><strong>Discount:</strong> {burnedNFT.discountValue}% OFF</div>
                    <div><strong>Merchant:</strong> {burnedNFT.merchantName}</div>
                    <div><strong>Transaction:</strong> {burnedNFT.txSignature.slice(0, 8)}...</div>
                  </div>
                </div>
              )}

              {/* Booking Button */}
              {!connected ? (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-3">Connect your wallet to book</p>
                  <ClientWalletButton className="!bg-blue-600 hover:!bg-blue-700 !w-full" />
                </div>
              ) : (
                <button
                  onClick={handleBooking}
                  disabled={booking}
                  className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {booking ? 'Processing...' : burnedNFT ? 'Complete Booking with Discount' : 'Simulate Booking'}
                </button>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

