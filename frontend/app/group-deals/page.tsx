'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import ClientWalletButton from '../../components/ClientWalletButton';

function apiBase() {
  return '';
}

export default function GroupDealsIndex() {
  const { publicKey } = useWallet();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${apiBase()}/api/group-deals`, { cache: 'no-store' });
        const data = await res.json();
        setDeals(data.deals || []);
      } catch (e: any) {
        setError(e.message || 'Failed to load deals');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <img 
                  src="/logo.png" 
                  alt="MonkeDao Logo" 
                  className="w-20 h-20 object-contain"
                />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Group Deals</h1>
                  <p className="text-sm text-gray-500">Pool friends and unlock bigger discounts together</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/" className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm">
                  🏠 Home
                </Link>
                <ClientWalletButton className="!bg-black hover:!bg-gray-800" />
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading group deals...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <img 
                  src="/logo.png" 
                  alt="MonkeDao Logo" 
                  className="w-20 h-20 object-contain"
                />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Group Deals</h1>
                  <p className="text-sm text-gray-500">Pool friends and unlock bigger discounts together</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/" className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm">
                  🏠 Home
                </Link>
                <ClientWalletButton className="!bg-black hover:!bg-gray-800" />
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-700">Error: {error}</p>
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
                <h1 className="text-xl font-semibold text-gray-900">Group Deals</h1>
                <p className="text-sm text-gray-500">Pool friends and unlock bigger discounts together</p>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">CrowdBoost Group Deals</h1>
          <p className="text-lg text-gray-600">
            Pool friends and unlock bigger discounts together
          </p>
        </div>

        {deals.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-2xl">🤝</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Group Deals</h3>
            <p className="text-gray-600">
              Check back later for new group deals to join with friends!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deals.map((d) => (
              <div 
                key={d.id} 
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Image */}
                <div className="aspect-square bg-gray-100 relative">
                  <img 
                    src={d.image || '/placeholder-nft.png'} 
                    alt={d.deal_title} 
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{d.deal_title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{d.highlight || 'Group up to save more'}</p>
                  
                  {/* Price and Date */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Base Price</div>
                      <div className="text-2xl font-bold text-gray-900">${Number(d.base_price).toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">Ends</div>
                      <div className="text-sm font-semibold text-gray-900">{new Date(d.end_at).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Tier Badges */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {(d.tiers || []).slice(0, 3).map((t: any) => (
                      <span 
                        key={t.id} 
                        className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100"
                      >
                        {t.discount_percent}% at {d.tier_type === 'by_volume' ? 'vol' : 'cnt'} ≥ {t.threshold}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Link 
                      href={`/group-deals/${d.id}`} 
                      className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-center"
                    >
                      View Deal
                    </Link>
                    <Link 
                      href={`/group-deals/${d.id}`} 
                      className="flex-1 px-4 py-2 text-sm font-semibold bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-center"
                    >
                      Start Group
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}