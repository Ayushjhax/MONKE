'use client';

interface StakingStatsProps {
  stats: {
    totalNFTsStaked: number;
    totalRewardsEarned: number;
    totalRewardsClaimed: number;
    totalDaysStaked: number;
    averageAPY: number;
    tierDistribution: {
      bronze: number;
      silver: number;
      gold: number;
      platinum: number;
    };
  };
}

export function StakingStats({ stats }: StakingStatsProps) {
  const totalTierNFTs = stats.tierDistribution.bronze + stats.tierDistribution.silver + 
                        stats.tierDistribution.gold + stats.tierDistribution.platinum;

  return (
    <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-xl p-6 shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Staking Overview</h2>
      
      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-xs text-gray-500 mb-1">Total NFTs</p>
          <p className="text-2xl font-bold text-blue-600">{stats.totalNFTsStaked}</p>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-xs text-gray-500 mb-1">Total Earned</p>
          <p className="text-2xl font-bold text-green-600">{stats.totalRewardsEarned.toFixed(2)}</p>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-xs text-gray-500 mb-1">Total Claimed</p>
          <p className="text-2xl font-bold text-purple-600">{stats.totalRewardsClaimed.toFixed(2)}</p>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-xs text-gray-500 mb-1">Days Staked</p>
          <p className="text-2xl font-bold text-orange-600">{stats.totalDaysStaked}</p>
        </div>
      </div>

      {/* Tier Distribution */}
      {totalTierNFTs > 0 && (
        <div className="bg-white rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Tier Distribution</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-orange-400 to-orange-600" />
                  <span className="text-sm font-medium text-gray-700">Bronze</span>
                </div>
                <span className="text-sm font-semibold text-gray-800">{stats.tierDistribution.bronze}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full"
                  style={{ width: `${(stats.tierDistribution.bronze / totalTierNFTs) * 100}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-gray-300 to-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Silver</span>
                </div>
                <span className="text-sm font-semibold text-gray-800">{stats.tierDistribution.silver}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-gray-300 to-gray-400 h-2 rounded-full"
                  style={{ width: `${(stats.tierDistribution.silver / totalTierNFTs) * 100}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600" />
                  <span className="text-sm font-medium text-gray-700">Gold</span>
                </div>
                <span className="text-sm font-semibold text-gray-800">{stats.tierDistribution.gold}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full"
                  style={{ width: `${(stats.tierDistribution.gold / totalTierNFTs) * 100}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                  <span className="text-sm font-medium text-gray-700">Platinum</span>
                </div>
                <span className="text-sm font-semibold text-gray-800">{stats.tierDistribution.platinum}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                  style={{ width: `${(stats.tierDistribution.platinum / totalTierNFTs) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


