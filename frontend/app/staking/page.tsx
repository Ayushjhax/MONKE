'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import ClientWalletButton from '../../components/ClientWalletButton';
import Link from 'next/link';
import { StakingCard } from '../../components/StakingCard';
import { StakingStats } from '../../components/StakingStats';
import { RewardClaimModal } from '../../components/RewardClaimModal';

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

export default function StakingPage() {
  const { publicKey } = useWallet();
  const [stakes, setStakes] = useState<any[]>([]);
  const [availableNFTs, setAvailableNFTs] = useState<NFTData[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [nftsLoading, setNftsLoading] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [totalPendingRewards, setTotalPendingRewards] = useState(0);

  useEffect(() => {
    if (publicKey) {
      fetchStakes();
      fetchStats();
      fetchAvailableNFTs();
    }
  }, [publicKey]);

  const fetchStakes = async () => {
    if (!publicKey) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/staking/my-stakes?ownerAddress=${publicKey.toBase58()}`
      );
      const data = await response.json();
      
      if (data.success) {
        setStakes(data.stakes);
        setTotalPendingRewards(data.totalPendingRewards || 0);
      }
    } catch (error) {
      console.error('Error fetching stakes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!publicKey) return;
    
    try {
      const response = await fetch(
        `/api/staking/stats/${publicKey.toBase58()}`
      );
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAvailableNFTs = async () => {
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
      setAvailableNFTs(allCNFTs);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
    } finally {
      setNftsLoading(false);
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
        fetchStakes();
        fetchAvailableNFTs();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error staking NFT:', error);
      alert('Failed to stake NFT');
    }
  };

  const handleClaimRewards = async (stakeId: string) => {
    if (!publicKey) return;

    try {
      const response = await fetch(`/api/staking/rewards/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerAddress: publicKey.toBase58()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Successfully claimed ${data.totalAmount.toFixed(6)} rewards!`);
        fetchStakes();
        fetchStats();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error claiming rewards:', error);
      alert('Failed to claim rewards');
    }
  };

  const handleRequestUnstake = async (stakeId: string) => {
    if (!publicKey) return;

    try {
      const response = await fetch('/api/staking/unstake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stakeId,
          ownerAddress: publicKey.toBase58()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const cooldownEnd = new Date(data.cooldownEndsAt);
        alert(`Unstaking initiated. Cooldown ends on ${cooldownEnd.toLocaleString()}`);
        fetchStakes();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error requesting unstake:', error);
      alert('Failed to request unstaking');
    }
  };

  const handleClaimAllRewards = async () => {
    if (!publicKey) return;

    try {
      const response = await fetch('/api/staking/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerAddress: publicKey.toBase58()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        fetchStakes();
        fetchStats();
        setShowClaimModal(false);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error claiming rewards:', error);
      alert('Failed to claim rewards');
    }
  };

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
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
                  <h1 className="text-xl font-semibold text-gray-900">Staking</h1>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center space-x-4">
                <Link
                  href="/"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Home
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600 mb-6">
              Connect your Solana wallet to view your staking dashboard
            </p>
            <ClientWalletButton className="!bg-black hover:!bg-gray-800" />
          </div>
        </main>
      </div>
    );
  }

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
                <h1 className="text-xl font-semibold text-gray-900">Staking</h1>
                <p className="text-sm text-gray-500">Earn rewards by holding your discount NFTs</p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Home
              </Link>
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
              <button
                onClick={() => setShowClaimModal(true)}
                disabled={totalPendingRewards === 0}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Claim All ({totalPendingRewards.toFixed(6)})
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && <StakingStats stats={stats} />}

        {/* Stakes */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Your Staked NFTs</h2>
            <span className="text-sm text-gray-500">
              {stakes.filter(s => s.status === 'active').length} Active
            </span>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading stakes...</p>
            </div>
          ) : stakes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Stakes Found</h3>
              <p className="text-gray-600 mb-6">
                Start staking your discount NFTs to earn rewards! Scroll down to see available NFTs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stakes.map((stake) => (
                <StakingCard
                  key={stake.stakeId}
                  stake={stake}
                  onClaimRewards={handleClaimRewards}
                  onRequestUnstake={handleRequestUnstake}
                />
              ))}
            </div>
          )}
        </div>

        {/* Available NFTs for Staking */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Available NFTs to Stake</h2>
            <span className="text-sm text-gray-500">
              {availableNFTs.length} Available
            </span>
          </div>

          {nftsLoading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading available NFTs...</p>
            </div>
          ) : availableNFTs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">🎨</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No NFTs Available</h3>
              <p className="text-gray-600 mb-6">
                No compressed NFTs found in your wallet to stake.
              </p>
              <Link
                href="/marketplace"
                className="inline-block bg-black text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors"
              >
                Browse Marketplace
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableNFTs.map((nft) => (
                <div
                  key={nft.mint}
                  className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {nft.name}
                      </h3>
                      <div className="flex gap-2 flex-wrap">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-lg text-xs font-medium">
                          {nft.category}
                        </span>
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-medium">
                          {nft.discountPercent}% OFF
                        </span>
                        {nft.isCompressed && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-medium">
                            cNFT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Merchant:</span>
                        <p className="text-gray-900 font-medium">{nft.merchant}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Code:</span>
                        <p className="text-gray-900 font-mono text-xs">{nft.redemptionCode}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Expires:</span>
                        <p className="text-gray-900">{nft.expiryDate}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <p className="text-green-600 font-medium">✓ Available</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStakeNFT(nft)}
                    className="w-full bg-black text-white font-semibold py-3 px-4 rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    ⭐ Stake NFT
                  </button>

                  <p className="text-xs text-gray-500 text-center mt-2">
                    Stake to earn rewards based on tier and time held
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-white rounded-2xl border border-gray-200 p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">How Staking Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-600 text-xl">🎯</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Proof-of-Hold</h4>
              <p className="text-sm text-gray-600">
                Keep your cNFTs in your wallet. We verify ownership every 6 hours.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-600 text-xl">💰</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Earn Rewards</h4>
              <p className="text-sm text-gray-600">
                Earn rewards based on your tier (Bronze to Platinum) and time held.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-600 text-xl">⏰</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">7-Day Cooldown</h4>
              <p className="text-sm text-gray-600">
                Unstaking requires a 7-day cooldown to prevent gaming.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Claim Modal */}
      <RewardClaimModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        totalRewards={totalPendingRewards}
        onClaim={handleClaimAllRewards}
      />
    </div>
  );
}