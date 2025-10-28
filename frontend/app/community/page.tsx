'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import ClientWalletButton from '../../components/ClientWalletButton';
import Link from 'next/link';
import TrendingSection from '@/components/social/TrendingSection';
import ActivityFeed from '@/components/social/ActivityFeed';
import NotificationBell from '@/components/social/NotificationBell';

export default function CommunityPage() {
  const { publicKey } = useWallet();
  const [activeFilter, setActiveFilter] = useState<'all' | 'flight' | 'hotel'>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'rated_deal' | 'commented' | 'shared_deal'>('all');
  const [communityStats, setCommunityStats] = useState({
    totalRatings: 0,
    totalComments: 0,
    activeUsers: 0,
    usersWithReputation: 0
  });
  const [topContributors, setTopContributors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommunityStats = async () => {
      try {
        const response = await fetch('/api/social/community-stats', { cache: 'no-store' });
        const data = await response.json();
        
        if (data.stats) {
          setCommunityStats(data.stats);
        }
        if (data.topContributors) {
          setTopContributors(data.topContributors);
        }
      } catch (error) {
        console.error('Error fetching community stats:', error);
      } finally {
        setLoading(false);
        }
    };

    fetchCommunityStats();
  }, []);

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
                <h1 className="text-xl font-semibold text-gray-900">Community</h1>
                <p className="text-sm text-gray-500">Discover trending deals and connect with travelers</p>
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
              <NotificationBell />
              {publicKey && (
                <Link
                  href={`/profile/${publicKey.toBase58()}`}
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Community</h1>
          <p className="text-lg text-gray-600">
            Discover trending deals, join discussions, and connect with fellow travelers
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Trending Deals */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                  🔥 Hot Deals
                </h2>
                <div className="flex gap-2">
                  {['all', 'flight', 'hotel'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter as any)}
                      className={`px-4 py-2 text-sm rounded-xl font-medium transition-colors ${
                        activeFilter === filter
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <TrendingSection
                limit={10}
                dealType={activeFilter === 'all' ? undefined : activeFilter}
              />
            </div>

            {/* Activity Feed */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Recent Activity</h2>
                <div className="flex gap-2">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'rated_deal', label: 'Ratings' },
                    { value: 'commented', label: 'Comments' },
                    { value: 'shared_deal', label: 'Shares' }
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setActivityFilter(filter.value as any)}
                      className={`px-4 py-2 text-sm rounded-xl font-medium transition-colors ${
                        activityFilter === filter.value
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <ActivityFeed
                activityType={activityFilter === 'all' ? undefined : activityFilter as any}
                limit={20}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Community Stats */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Community Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">⭐</span>
                    </div>
                    <span className="text-sm text-gray-600">Total Ratings</span>
                  </div>
                  <span className="text-xl font-semibold text-gray-900">
                    {loading ? '...' : communityStats.totalRatings.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">💬</span>
                    </div>
                    <span className="text-sm text-gray-600">Comments</span>
                  </div>
                  <span className="text-xl font-semibold text-gray-900">
                    {loading ? '...' : communityStats.totalComments.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">👥</span>
                    </div>
                    <span className="text-sm text-gray-600">Active Users</span>
                  </div>
                  <span className="text-xl font-semibold text-gray-900">
                    {loading ? '...' : communityStats.activeUsers.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Leaderboard Preview */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Top Contributors</h3>
                <Link 
                  href="/leaderboard" 
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  View All →
                </Link>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-gray-400 text-xl">🏆</span>
                  </div>
                  <p className="text-sm text-gray-500">Loading...</p>
                </div>
              ) : topContributors.length > 0 ? (
                <div className="space-y-3">
                  {topContributors.map((contributor, index) => (
                    <div key={contributor.user_wallet} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600">
                        {contributor.rank}
                      </div>
                      <img
                        src={contributor.avatar_url || '/placeholder-nft.png'}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-nft.png'; }}
                        alt="avatar"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {contributor.display_name || `${contributor.user_wallet.slice(0, 6)}...${contributor.user_wallet.slice(-4)}`}
                        </p>
                        <p className="text-xs text-gray-500">{contributor.reputation_level}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{contributor.reputation_points}</p>
                        <p className="text-xs text-gray-500">pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-gray-400 text-xl">🏆</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    No contributors yet. Be the first to earn reputation!
                  </p>
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div className="bg-black rounded-2xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Get Started</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">⭐</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Rate Deals</p>
                    <p className="text-xs text-gray-400">+2 reputation points</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">💬</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Leave Comments</p>
                    <p className="text-xs text-gray-400">+3 reputation points</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🔗</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Share Deals</p>
                    <p className="text-xs text-gray-400">+1 reputation point</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

