'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import TrendingSection from '@/components/social/TrendingSection';
import ActivityFeed from '@/components/social/ActivityFeed';
import NotificationBell from '@/components/social/NotificationBell';

export default function CommunityPage() {
  const { publicKey } = useWallet();
  const [activeFilter, setActiveFilter] = useState<'all' | 'flight' | 'hotel'>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'rated_deal' | 'commented' | 'shared_deal'>('all');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                MonkeDao
              </Link>
              <nav className="flex space-x-6">
                <Link href="/marketplace" className="text-gray-600 hover:text-gray-900 font-medium">
                  Marketplace
                </Link>
                <Link href="/community" className="text-purple-600 font-medium">
                  Community
                </Link>
                <Link href="/bookings" className="text-gray-600 hover:text-gray-900 font-medium">
                  My Bookings
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              {publicKey && (
                <Link
                  href={`/profile/${publicKey.toBase58()}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </Link>
              )}
              <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  🔥 Hot Deals
                </h2>
                <div className="flex gap-2">
                  {['all', 'flight', 'hotel'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter as any)}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                        activeFilter === filter
                          ? 'bg-purple-600 text-white'
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
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
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                        activityFilter === filter.value
                          ? 'bg-purple-600 text-white'
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Community Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⭐</span>
                    <span className="text-sm text-gray-600">Total Ratings</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">—</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💬</span>
                    <span className="text-sm text-gray-600">Comments</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">—</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">👥</span>
                    <span className="text-sm text-gray-600">Active Users</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">—</span>
                </div>
              </div>
            </div>

            {/* Leaderboard Preview */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top Contributors</h3>
              <p className="text-sm text-gray-500 text-center py-8">
                Coming soon! Check user profiles to see reputation levels.
              </p>
            </div>

            {/* Quick Links */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-md p-6 text-white">
              <h3 className="text-lg font-bold mb-4">Get Started</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-xl">⭐</span>
                  <div>
                    <p className="font-medium">Rate Deals</p>
                    <p className="text-sm text-purple-100">+2 reputation points</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xl">💬</span>
                  <div>
                    <p className="font-medium">Leave Comments</p>
                    <p className="text-sm text-purple-100">+3 reputation points</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xl">🔗</span>
                  <div>
                    <p className="font-medium">Share Deals</p>
                    <p className="text-sm text-purple-100">+1 reputation point</p>
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

