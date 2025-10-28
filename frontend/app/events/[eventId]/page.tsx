'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function EventDetailPage() {
  const params = useParams();
  const [event, setEvent] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params?.eventId) {
      fetchEventDetails();
    }
  }, [params?.eventId]);

  const fetchEventDetails = async () => {
    try {
      const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
      const response = await fetch(`/api/events/${eventId}`);
      const data = await response.json();

      if (response.ok) {
        setEvent(data.event);
        setDeals(data.deals || []);
      }
    } catch (error) {
      console.error('Fetch event details error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-2xl">❌</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900 mb-4">Event not found</p>
          <Link href="/events" className="text-blue-600 hover:underline">
            ← Back to Events
          </Link>
        </div>
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
                <h1 className="text-xl font-semibold text-gray-900">Event Details</h1>
                <p className="text-sm text-gray-500">Blockchain conference information</p>
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
                href="/events"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                ← Back to Events
              </Link>
              <Link
                href="/marketplace"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Marketplace
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Header */}
        <div className="bg-black text-white p-8 rounded-2xl mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="px-4 py-1 bg-white/20 backdrop-blur rounded-lg text-sm font-semibold uppercase">
                  {event.blockchain || 'Multi-chain'}
                </div>
                {event.verified && (
                  <div className="px-3 py-1 bg-green-500/30 backdrop-blur rounded-lg text-xs font-semibold">
                    ✓ Verified
                  </div>
                )}
              </div>

              <h1 className="text-4xl font-bold mb-3">{event.event_name}</h1>

              <div className="space-y-2 text-lg">
                <p className="flex items-center gap-2">
                  <span>📍</span>
                  <span>{event.city}, {event.country}</span>
                </p>
                <p className="flex items-center gap-2">
                  <span>📅</span>
                  <span>
                    {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                  </span>
                </p>
                {event.venue_address && (
                  <p className="flex items-center gap-2 text-sm opacity-90">
                    <span>🏢</span>
                    <span>{event.venue_address}</span>
                  </p>
                )}
              </div>

              {event.official_website && (
                <a
                  href={event.official_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 px-4 py-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-colors"
                >
                  🔗 Official Website
                </a>
              )}
            </div>

            <div className="text-right">
              <p className="text-5xl font-bold mb-1">
                {event.expected_attendees?.toLocaleString() || 'TBD'}
              </p>
              <p className="text-sm opacity-90">Expected Attendees</p>
            </div>
          </div>

          {event.description && (
            <p className="mt-6 text-white/90 leading-relaxed">
              {event.description}
            </p>
          )}
        </div>

        {/* Travel Deals Section */}
        <h2 className="text-3xl font-bold mb-2">✈️ Travel Deals for This Event</h2>
        <p className="text-gray-600 mb-6">
          {deals.length > 0
            ? `${deals.length} deals found matching this event's dates and location`
            : 'No deals found yet. Check back soon!'}
        </p>

        {deals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {deals.map((deal) => (
              <Link
                key={deal.id}
                href={`/deal/${deal.amadeus_offer_id}?type=${deal.deal_type}`}
                className="p-6 bg-white border border-gray-200 rounded-2xl hover:shadow-lg hover:border-gray-300 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">
                        {deal.deal_type === 'flight' ? '✈️' : '🏨'}
                      </span>
                      <h3 className="text-xl font-semibold">
                        {deal.origin} → {deal.destination}
                      </h3>
                    </div>

                    <p className="text-sm text-gray-600 mb-1">
                      📅 {deal.departure_date ? new Date(deal.departure_date).toLocaleDateString() : 'Date TBD'}
                      {deal.return_date && ` - ${new Date(deal.return_date).toLocaleDateString()}`}
                    </p>

                    {deal.provider_name && (
                      <p className="text-xs text-gray-500">by {deal.provider_name}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">
                      ${parseFloat(deal.price).toFixed(0)}
                    </p>
                    <p className="text-xs text-gray-500">{deal.currency || 'USD'}</p>
                  </div>
                </div>

                {deal.relevance_score && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600 font-semibold">
                        ✅ {(parseFloat(deal.relevance_score) * 100).toFixed(0)}% match
                      </span>
                      {deal.auto_matched && (
                        <span className="text-gray-500 text-xs">(AI matched)</span>
                      )}
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {/* Beautiful empty state with CTAs */}
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">🎫</span>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                No Linked Deals Yet
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                We're still matching travel deals to this event! In the meantime, 
                you can explore our marketplace to find flights and hotels with <strong>exclusive NFT discounts</strong>.
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 text-left bg-gray-50 p-4 rounded-xl">
                  <div className="text-3xl">✈️</div>
                  <div>
                    <p className="font-semibold text-gray-900">Live Flight Deals</p>
                    <p className="text-sm text-gray-600">Search real-time flights powered by Amadeus API</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-left bg-gray-50 p-4 rounded-xl">
                  <div className="text-3xl">🏨</div>
                  <div>
                    <p className="font-semibold text-gray-900">Hotel Bookings</p>
                    <p className="text-sm text-gray-600">Find accommodations near {event.city}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-left bg-gray-50 p-4 rounded-xl">
                  <div className="text-3xl">🎟️</div>
                  <div>
                    <p className="font-semibold text-gray-900">NFT Discount Coupons</p>
                    <p className="text-sm text-gray-600">Mint NFTs to unlock special travel discounts</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/marketplace"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Go to Marketplace
                </Link>

                <Link
                  href="/nearby"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors border-2 border-gray-300"
                >
                  <span>📍</span>
                  Find Deals Near Me
                </Link>
              </div>

              <p className="text-xs text-gray-500 mt-6">
                💡 Tip: Deals for this event will be automatically added as they become available
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}