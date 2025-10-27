'use client';

import { useState } from 'react';

interface StakingCardProps {
  stake: any;
  onClaimRewards: (stakeId: string) => void;
  onRequestUnstake: (stakeId: string) => void;
}

export function StakingCard({ stake, onClaimRewards, onRequestUnstake }: StakingCardProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      await onClaimRewards(stake.stakeId);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleUnstake = async () => {
    setIsUnstaking(true);
    try {
      await onRequestUnstake(stake.stakeId);
    } finally {
      setIsUnstaking(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'gold': return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 'silver': return 'bg-gradient-to-r from-gray-300 to-gray-400';
      case 'bronze': return 'bg-gradient-to-r from-orange-400 to-orange-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending_unstake': return 'bg-yellow-100 text-yellow-800';
      case 'unstaked': return 'bg-gray-100 text-gray-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatReward = (amount: number) => {
    return amount.toFixed(6);
  };

  const calculateDaysStaked = () => {
    const diffTime = Math.abs(new Date().getTime() - new Date(stake.stakedAt).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getTierColor(stake.tier)}`} />
          <h3 className="text-lg font-semibold text-gray-800">{stake.nftName}</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(stake.status)}`}>
          {stake.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* NFT Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500">Discount</p>
          <p className="text-lg font-semibold text-blue-600">{stake.discountPercent}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Merchant</p>
          <p className="text-lg font-semibold text-gray-800">{stake.merchant}</p>
        </div>
      </div>

      {/* Staking Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Days Staked</p>
            <p className="text-xl font-bold text-gray-800">{calculateDaysStaked()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Tier</p>
            <p className="text-xl font-bold capitalize text-gray-800">{stake.tier}</p>
          </div>
        </div>
      </div>

      {/* Rewards Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Pending Rewards</p>
            <p className="text-2xl font-bold text-green-600">
              {formatReward(stake.pendingRewards || 0)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Earned</p>
            <p className="text-lg font-semibold text-gray-800">
              {formatReward(stake.totalRewardsEarned || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* APY Info */}
      {stake.rewardBreakdown && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">Estimated APY</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${getTierColor(stake.tier)}`}
              style={{ width: `${Math.min(stake.rewardBreakdown.apy, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">{stake.rewardBreakdown.apy.toFixed(2)}%</p>
        </div>
      )}

      {/* Unstake Info */}
      {stake.status === 'pending_unstake' && stake.cooldownEndsAt && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-yellow-800">
            <strong>Cooldown:</strong> Staking will end on{' '}
            {new Date(stake.cooldownEndsAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleClaim}
          disabled={isClaiming || (stake.pendingRewards || 0) === 0}
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isClaiming ? 'Claiming...' : 'Claim Rewards'}
        </button>
        
        {stake.status === 'active' && (
          <button
            onClick={handleUnstake}
            disabled={isUnstaking}
            className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-red-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isUnstaking ? 'Requesting...' : 'Unstake'}
          </button>
        )}
      </div>

      {/* Asset ID */}
      <p className="text-xs text-gray-400 mt-4 font-mono truncate">
        {stake.assetId}
      </p>
    </div>
  );
}


