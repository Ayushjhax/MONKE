'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import ClientWalletButton from '../../../components/ClientWalletButton';

function apiBase() {
  return '';
}

export default function DealDetails() {
  const { publicKey } = useWallet();
  const params = useParams();
  const router = useRouter();
  const dealId = params?.dealId as string;
  const [deal, setDeal] = useState<any>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [startLoading, setStartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${apiBase()}/api/group-deals/${dealId}`, { cache: 'no-store' });
        const data = await res.json();
        if (res.ok) {
          setDeal(data.deal);
          setTiers(data.tiers || []);
          setRecent(data.recent_groups || []);
        } else {
          setError(data.error || 'Failed to load deal');
        }
      } catch (e: any) {
        setError(e.message);
      }
    }
    if (dealId) load();
  }, [dealId]);

  async function startGroup() {
    if (!deal) return;
    setStartLoading(true);
    try {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
      const res = await fetch(`${apiBase()}/api/group-deals/${deal.id}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: 'host_wallet_demo', expires_at: expiresAt })
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/group-deals/${deal.id}/groups/${data.group_id}`);
      } else {
        setError(data.error || 'Failed to start group');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStartLoading(false);
    }
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <img src="/logo.png" alt="MonkeDao Logo" className="w-20 h-20 object-contain" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Group Deal Details</h1>
                  <p className="text-sm text-gray-500">Loading...</p>
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
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
              <img src="/logo.png" alt="MonkeDao Logo" className="w-20 h-20 object-contain" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Group Deal Details</h1>
                <p className="text-sm text-gray-500">{deal.deal_title}</p>
              </div>
            </div>

            {/* Center Navigation */}
            <div className="flex-1 flex justify-center">
              <Link href="/" className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm">
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-3xl p-8 md:p-12 mb-8 text-white">
          <h1 className="text-4xl font-bold mb-3">{deal.deal_title}</h1>
          <p className="text-lg text-purple-100 mb-6">{deal.highlight}</p>
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4">
              <div className="text-sm text-purple-200 mb-1">Base Price</div>
              <div className="text-3xl font-bold">${Number(deal.base_price).toFixed(2)}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4">
              <div className="text-sm text-purple-200 mb-1">Ends</div>
              <div className="text-lg font-semibold">{new Date(deal.end_at).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Tier Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Tier Breakdown</h2>
          <div className="space-y-4">
            {tiers.map(t => (
              <div 
                key={t.id} 
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                  {t.rank}
                </div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-gray-900">{t.discount_percent}% Off</div>
                  <div className="text-sm text-gray-600">
                    {deal.tier_type === 'by_volume' ? 'Volume' : 'Members'} ≥ {t.threshold}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={startGroup} 
          disabled={startLoading} 
          className="w-full py-4 px-6 bg-black text-white text-lg font-bold rounded-xl hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {startLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating Group…
            </>
          ) : (
            <>🚀 Start Your Group</>
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}