'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CryptoEventsPage() {
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <Link 
            href="/marketplace"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg hover:bg-gray-100 transition border border-gray-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Marketplace
          </Link>
        </div>
        
        <h1 className="text-4xl font-bold mb-2">🎪 Crypto & NFT Events</h1>
        <p className="text-gray-600 mb-8">
          Discover travel deals for major blockchain conferences, hackathons, and NFT launches worldwide
        </p>

        {/* Filters */}
        <div className="mb-8 flex gap-3">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              filter === 'upcoming'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            📅 Upcoming Events
          </button>
          <button
            onClick={() => setFilter('popular')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              filter === 'popular'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🔥 Popular (10k+ attendees)
          </button>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse p-6 bg-white rounded-lg h-72">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center py-12 px-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-dashed border-purple-200">
              <div className="text-6xl mb-4">🎪</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No Events Found
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                We're constantly adding new crypto and NFT events. While you wait, 
                explore our marketplace for <strong>amazing travel deals with NFT discounts</strong>!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-white/60 backdrop-blur rounded-lg">
                  <div className="text-3xl mb-2">✈️</div>
                  <p className="font-semibold text-sm">Live Flights</p>
                </div>
                <div className="p-4 bg-white/60 backdrop-blur rounded-lg">
                  <div className="text-3xl mb-2">🏨</div>
                  <p className="font-semibold text-sm">Hotels</p>
                </div>
                <div className="p-4 bg-white/60 backdrop-blur rounded-lg">
                  <div className="text-3xl mb-2">🎟️</div>
                  <p className="font-semibold text-sm">NFT Discounts</p>
                </div>
              </div>

              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition shadow-lg"
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
                className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-xl hover:border-purple-300 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase">
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

                <h3 className="text-xl font-bold mb-3 text-gray-900">{event.event_name}</h3>

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
      </div>
    </div>
  );
}

