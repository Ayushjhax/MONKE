'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import ClientWalletButton from '../../components/ClientWalletButton';

export default function LeaderboardPage() {
  const { publicKey } = useWallet();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/social/leaderboard', { cache: 'no-store' });
      const json = await res.json();
      setRows(json.leaderboard || []);
      setLoading(false);
    })();
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '👑';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '👤';
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-600';
    if (rank === 2) return 'text-gray-500';
    if (rank === 3) return 'text-orange-600';
    return 'text-gray-600';
  };

  const getRankBgColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100';
    if (rank === 2) return 'bg-gray-100';
    if (rank === 3) return 'bg-orange-100';
    return 'bg-gray-50';
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
                <h1 className="text-xl font-semibold text-gray-900">Leaderboard</h1>
                <p className="text-sm text-gray-500">Top performers in the MonkeDao ecosystem</p>
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
                href="/community"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Community
              </Link>
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Leaderboard</h1>
          <p className="text-lg text-gray-600">
            Top performers in the MonkeDao ecosystem
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-8">
          <div className="flex gap-3 justify-center">
            {[
              { id: 'all', label: 'Top Savers' },
              { id: 'traders', label: 'Top Traders' },
              { id: 'stakers', label: 'Top Stakers' },
              { id: 'merchants', label: 'Top Merchants' }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
                  activeFilter === filter.id
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading leaderboard...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">🏆</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rankings Yet</h3>
              <p className="text-gray-600 mb-6">
                Be the first to earn reputation points by rating deals, leaving comments, and sharing!
              </p>
              <Link
                href="/community"
                className="inline-block bg-black text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors"
              >
                Start Contributing
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {rows.map((row, index) => (
                <div
                  key={row.user_wallet}
                  className={`p-6 hover:bg-gray-50 transition-colors ${
                    index < 3 ? getRankBgColor(index + 1) : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      {/* Rank */}
                      <div className="flex items-center space-x-3">
                        <div className={`text-2xl font-bold ${getRankColor(index + 1)}`}>
                          {index + 1}
                        </div>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-500' : 
                          index === 2 ? 'bg-orange-500' : 'bg-gray-400'
                        }`}>
                          <span className="text-white text-sm">
                            {getRankIcon(index + 1)}
                          </span>
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="flex items-center space-x-4">
                        <img
                          src={row.avatar_url || '/placeholder-nft.png'}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-nft.png'; }}
                          alt="avatar"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {(() => {
                              if (row.display_name && row.display_name.trim().length > 0) return row.display_name;
                              const w = row.user_wallet || '';
                              if (w && w.length >= 10) return `${w.slice(0, 6)}…${w.slice(-6)}`;
                              return 'Unknown';
                            })()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {row.user_wallet ? `${row.user_wallet.slice(0, 6)}…${row.user_wallet.slice(-6)}` : 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center space-x-8">
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Level</div>
                        <div className="font-semibold text-gray-900">{row.reputation_level || 'Newbie'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Points</div>
                        <div className="font-bold text-gray-900">{row.reputation_points ?? 0}</div>
                      </div>
                      {index < 3 && (
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Status</div>
                          <div className={`font-semibold ${
                            index === 0 ? 'text-yellow-600' : 
                            index === 1 ? 'text-gray-600' : 'text-orange-600'
                          }`}>
                            {index === 0 ? 'Champion' : index === 1 ? 'Runner-up' : 'Bronze'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Your Rank Section */}
        {!loading && rows.length > 0 && (
          <div className="mt-8 bg-gray-50 rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Rank</h3>
                <div className="flex items-center space-x-4">
                  <div className="text-3xl font-bold text-gray-900">#127</div>
                  <div className="text-gray-600">
                    <span className="font-semibold">$340</span> saved • <span className="font-semibold">8</span> deals used
                  </div>
                </div>
              </div>
              <button className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors">
                View Profile
              </button>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-yellow-600 text-xl">👑</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Top Saver</h3>
            <p className="text-sm text-gray-600">
              {rows.length > 0 ? `${rows[0]?.display_name || 'Unknown'}` : 'No data yet'}
            </p>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-600 text-xl">📊</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Total Users</h3>
            <p className="text-sm text-gray-600">{rows.length} contributors</p>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-xl">💎</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Total Points</h3>
            <p className="text-sm text-gray-600">
              {rows.reduce((sum, row) => sum + (row.reputation_points || 0), 0)} points earned
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}