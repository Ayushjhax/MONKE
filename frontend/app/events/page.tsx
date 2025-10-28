'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import ClientWalletButton from '../../components/ClientWalletButton';

export default function CryptoEventsPage() {
  const { publicKey } = useWallet();
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState('upcoming');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/events?filter=${filter}`);
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Fetch events error:', error);
    } finally {
      setIsLoading(false);
    }
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
                <h1 className="text-xl font-semibold text-gray-900">Crypto Events</h1>
                <p className="text-sm text-gray-500">Discover blockchain conferences worldwide</p>
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
                href="/marketplace"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Marketplace
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🎪 Crypto & NFT Events</h1>
          <p className="text-lg text-gray-600">
            Discover travel deals for major blockchain conferences, hackathons, and NFT launches worldwide
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex gap-3">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
              filter === 'upcoming'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📅 Upcoming Events
          </button>
          <button
            onClick={() => setFilter('popular')}
            className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
              filter === 'popular'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🔥 Popular (10k+ attendees)
          </button>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl border border-gray-200 p-6 h-80">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">🎪</span>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                No Events Found
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                We're constantly adding new crypto and NFT events. While you wait, 
                explore our marketplace for <strong>amazing travel deals with NFT discounts</strong>!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-3xl mb-2">✈️</div>
                  <p className="font-semibold text-sm">Live Flights</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-3xl mb-2">🏨</div>
                  <p className="font-semibold text-sm">Hotels</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-3xl mb-2">🎟️</div>
                  <p className="font-semibold text-sm">NFT Discounts</p>
                </div>
              </div>

              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Explore Marketplace
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="block bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold uppercase">
                    {event.blockchain || 'Multi-chain'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(event.start_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">{event.event_name}</h3>

                <p className="text-gray-600 mb-2 flex items-center gap-2">
                  <span>📍</span>
                  <span>{event.city}, {event.country}</span>
                </p>

                <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                  <span>👥</span>
                  <span>{event.expected_attendees?.toLocaleString() || 'TBD'} expected attendees</span>
                </p>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-blue-600">
                    {parseInt(event.deal_count) > 0
                      ? `✈️ ${event.deal_count} travel deals available`
                      : '🔍 Finding deals...'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}