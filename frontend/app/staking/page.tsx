'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { StakingCard } from '../../components/StakingCard';
import { StakingStats } from '../../components/StakingStats';
import { RewardClaimModal } from '../../components/RewardClaimModal';

export default function StakingPage() {
  const { publicKey } = useWallet();
  const [stakes, setStakes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [totalPendingRewards, setTotalPendingRewards] = useState(0);

  useEffect(() => {
    if (publicKey) {
      fetchStakes();
      fetchStats();
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

  const handleClaimRewards = async (stakeId: string) => {
    if (!publicKey) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/staking/rewards/claim`, {
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <Link 
            href="/" 
            className="inline-block text-gray-600 hover:text-gray-800 font-semibold mb-4"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Connect Your Wallet</h1>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to view your staking dashboard.
          </p>
          <WalletMultiButton />
          <div className="mt-6">
            <Link 
              href="/redeem" 
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              Go to Redeem Page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Staking Dashboard</h1>
              <p className="text-gray-600 mt-1">Earn rewards by holding your discount NFTs</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold py-2 px-6 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all flex items-center gap-2"
              >
                ← Back to Home
              </Link>
              <button
                onClick={() => setShowClaimModal(true)}
                disabled={totalPendingRewards === 0}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-2 px-6 rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Claim All ({totalPendingRewards.toFixed(6)})
              </button>
              <Link
                href="/redeem"
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
              >
                View NFTs
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && <StakingStats stats={stats} />}

        {/* Stakes */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Your Staked NFTs</h2>
            <span className="text-sm text-gray-600">
              {stakes.filter(s => s.status === 'active').length} Active
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading stakes...</p>
            </div>
          ) : stakes.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Stakes Found</h3>
              <p className="text-gray-600 mb-6">
                Start staking your discount NFTs to earn rewards!
              </p>
              <Link
                href="/redeem"
                className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
              >
                Go to Redeem Page
              </Link>
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

        {/* Info Section */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">How Staking Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🎯</div>
              <h4 className="font-semibold text-gray-800 mb-2">Proof-of-Hold</h4>
              <p className="text-sm text-gray-600">
                Keep your cNFTs in your wallet. We verify ownership every 6 hours.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">💰</div>
              <h4 className="font-semibold text-gray-800 mb-2">Earn Rewards</h4>
              <p className="text-sm text-gray-600">
                Earn rewards based on your tier (Bronze to Platinum) and time held.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">⏰</div>
              <h4 className="font-semibold text-gray-800 mb-2">7-Day Cooldown</h4>
              <p className="text-sm text-gray-600">
                Unstaking requires a 7-day cooldown to prevent gaming.
              </p>
            </div>
          </div>
        </div>
      </div>

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

