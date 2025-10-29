'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createLocationProof, getUserLocation, calculateDistance } from '@/lib/geo-helpers';
import Link from 'next/link';

export default function NearbyDealsMap() {
  const { publicKey, signMessage } = useWallet();
  const [locationShared, setLocationShared] = useState(false);
  const [nearbyDeals, setNearbyDeals] = useState<any[]>([]);
  const [nearbyEvents, setNearbyEvents] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [radius, setRadius] = useState(100);
  const [error, setError] = useState('');
  const [showingEvents, setShowingEvents] = useState(false);

  const shareLocation = async () => {
    if (!publicKey || !signMessage) {
      alert('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get browser location
      const position = await getUserLocation();
      if (!position) {
        setError('Location permission denied. Please allow location access in your browser.');
        setIsLoading(false);
        return;
      }

      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: Date.now(),
      };

      // Create signed proof
      const proof = await createLocationProof(
        { publicKey, signMessage },
        locationData
      );

      // Submit to server
      const response = await fetch('/api/geo/submit-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          signature: proof.signature,
          message: proof.message,
          timestamp: locationData.timestamp,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setLocationShared(true);
        fetchNearbyDeals();
      } else {
        setError(data.error || 'Failed to verify location');
      }
    } catch (error: any) {
      console.error('Location sharing error:', error);
      setError('Error sharing location: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNearbyDeals = async () => {
    if (!publicKey) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/geo/nearby-deals?wallet=${publicKey.toString()}&radius=${radius}`
      );
      const data = await response.json();

      if (response.ok) {
        setUserLocation(data.userLocation);
        setNearbyDeals(data.deals);
        
        // If no deals found, fetch nearby events as fallback
        if (data.deals.length === 0) {
          await fetchNearbyEvents(data.userLocation.latitude, data.userLocation.longitude);
        } else {
          setShowingEvents(false);
          setNearbyEvents([]);
        }
      } else {
        setError(data.error || 'Failed to fetch nearby deals');
      }
    } catch (error: any) {
      console.error('Fetch nearby deals error:', error);
      setError('Error fetching deals: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNearbyEvents = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`/api/events?filter=all`);
      const data = await response.json();
      
      if (response.ok && data.events) {
        // Calculate distances and filter by radius
        const eventsWithDistance = data.events
          .map((event: any) => ({
            ...event,
            distance_km: calculateDistance(
              lat,
              lng,
              parseFloat(event.latitude),
              parseFloat(event.longitude)
            ),
          }))
          .filter((event: any) => event.distance_km <= radius)
          .sort((a: any, b: any) => a.distance_km - b.distance_km);
        
        setNearbyEvents(eventsWithDistance);
        setShowingEvents(eventsWithDistance.length > 0);
      }
    } catch (error) {
      console.error('Fetch nearby events error:', error);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="mb-4">
        <Link 
          href="/marketplace"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Marketplace
        </Link>
      </div>
      
      <h2 className="text-3xl font-bold mb-2 text-gray-900">🌍 Deals Near You</h2>
      <p className="text-gray-600 mb-6">
        Discover travel deals starting from your location with blockchain-verified proof
      </p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {!locationShared ? (
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="text-6xl mb-4">📍</div>
            <p className="text-lg mb-2 text-gray-700">
              Share your location to find nearby travel deals
            </p>
            <p className="text-sm text-gray-500 mb-6">
              🔐 Your location will be signed by your wallet and verified on-chain
            </p>
          </div>

          <button
            onClick={shareLocation}
            disabled={isLoading || !publicKey}
            className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {isLoading ? '🔐 Verifying Location...' : '📍 Share Location (Secure)'}
          </button>

          {!publicKey && (
            <p className="text-sm text-red-500 mt-4">
              Please connect your wallet first
            </p>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-semibold flex items-center gap-2">
              <span>✅</span>
              <span>Location verified: {userLocation?.city}, {userLocation?.country}</span>
            </p>
            <p className="text-sm text-green-600 mt-1">
              Proof signed by {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-4)} and stored on Solana blockchain
            </p>
          </div>

          <div className="mb-6 flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">Search Radius</label>
              <select
                value={radius}
                onChange={(e) => {
                  setRadius(parseInt(e.target.value));
                  fetchNearbyDeals();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              >
                <option value={25}>25 km (Local)</option>
                <option value={50}>50 km (Nearby)</option>
                <option value={100}>100 km (Regional)</option>
                <option value={200}>200 km (Wide Area)</option>
                <option value={500}>500 km (Extended)</option>
                <option value={1000}>1,000 km (Multi-State)</option>
                <option value={2000}>2,000 km (Continental)</option>
                <option value={5000}>5,000 km (Cross-Continental)</option>
                <option value={10000}>10,000 km (Global 🌍)</option>
              </select>
            </div>

            <button
              onClick={fetchNearbyDeals}
              disabled={isLoading}
              className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
            >
              {isLoading ? 'Searching...' : '🔄 Refresh'}
            </button>
          </div>

          <h3 className="font-semibold text-xl mb-4 text-gray-900">
            {nearbyDeals.length > 0 ? (
              <span>
                ✈️ {nearbyDeals.length} Deals Found Within {radius >= 1000 ? `${(radius/1000).toLocaleString()}k` : radius}km
                {radius >= 5000 && ' 🌍'}
              </span>
            ) : showingEvents && nearbyEvents.length > 0 ? (
              <span>
                🎪 No deals found, but {nearbyEvents.length} crypto events nearby!
              </span>
            ) : (
              <span>No deals found within {radius >= 1000 ? `${(radius/1000).toLocaleString()}k` : radius}km.</span>
            )}
          </h3>

          {nearbyDeals.length > 0 ? (
            <div className="space-y-4">
              {nearbyDeals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/deal/${deal.amadeus_offer_id}?type=${deal.deal_type}`}
                  className="block p-5 border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">
                          {deal.deal_type === 'flight' ? '✈️' : '🏨'}
                        </span>
                        <h4 className="font-bold text-lg">
                          {deal.origin} → {deal.destination}
                        </h4>
                      </div>

                      <p className="text-sm text-blue-600 font-medium mb-1">
                        📍 {deal.distance_km.toFixed(1)} km from you
                      </p>

                      <p className="text-sm text-gray-600">
                        📅 {deal.departure_date ? new Date(deal.departure_date).toLocaleDateString() : 'Date TBD'}
                        {deal.return_date && ` - ${new Date(deal.return_date).toLocaleDateString()}`}
                      </p>

                      {deal.provider_name && (
                        <p className="text-xs text-gray-500 mt-1">
                          by {deal.provider_name}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-3xl font-bold text-blue-600">
                        ${parseFloat(deal.price).toFixed(0)}
                      </p>
                      <p className="text-xs text-gray-500">{deal.currency || 'USD'}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : showingEvents && nearbyEvents.length > 0 ? (
            <div>
              <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-purple-900 font-semibold mb-2">
                  💡 No travel deals found yet
                </p>
                <p className="text-sm text-purple-700">
                  Check out these crypto events near you! Visit the marketplace to search for flights and hotels, which will populate more deals.
                </p>
              </div>

              <div className="space-y-4">
                {nearbyEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="block p-5 border border-purple-200 rounded-lg hover:shadow-lg hover:border-purple-400 transition bg-gradient-to-r from-purple-50 to-blue-50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">🎪</span>
                          <h4 className="font-bold text-lg text-gray-900">{event.event_name}</h4>
                        </div>

                        <p className="text-sm text-purple-600 font-medium mb-1">
                          📍 {event.distance_km.toFixed(0)} km from you
                        </p>

                        <p className="text-sm text-gray-700 mb-1">
                          📅 {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                        </p>

                        <p className="text-sm text-gray-600">
                          📍 {event.city}, {event.country}
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-semibold">
                            {event.blockchain}
                          </span>
                          <span className="text-xs text-gray-500">
                            👥 {event.expected_attendees?.toLocaleString()} expected
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Want to see travel deals?</strong> Visit the marketplace to search for flights and hotels to your favorite destinations!
                </p>
                <Link
                  href="/marketplace"
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                  Go to Marketplace
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <div className="text-5xl mb-4">🔍</div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">No Results Found</h4>
              <p className="text-gray-600 mb-4">
                No travel deals or crypto events found within {radius >= 1000 ? `${(radius/1000).toLocaleString()}k` : radius}km.
              </p>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  💡 <strong>To see travel deals:</strong> Visit the marketplace and search for flights/hotels
                </p>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition"
                >
                  <span>🛫</span>
                  Search Flights & Hotels
                </Link>
              </div>
            </div>
          )}

          <div className="hidden space-y-4">
            {nearbyDeals.map((deal) => (
              <Link
                key={deal.id}
                href={`/deal/${deal.amadeus_offer_id}?type=${deal.deal_type}`}
                className="block p-5 border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">
                        {deal.deal_type === 'flight' ? '✈️' : '🏨'}
                      </span>
                      <h4 className="font-bold text-lg">
                        {deal.origin} → {deal.destination}
                      </h4>
                    </div>

                    <p className="text-sm text-blue-600 font-medium mb-1">
                      📍 {deal.distance_km.toFixed(1)} km from you
                    </p>

                    <p className="text-sm text-gray-600">
                      📅 {deal.departure_date ? new Date(deal.departure_date).toLocaleDateString() : 'Date TBD'}
                      {deal.return_date && ` - ${new Date(deal.return_date).toLocaleDateString()}`}
                    </p>

                    {deal.provider_name && (
                      <p className="text-xs text-gray-500 mt-1">
                        by {deal.provider_name}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">
                      ${parseFloat(deal.price).toFixed(0)}
                    </p>
                    <p className="text-xs text-gray-500">{deal.currency || 'USD'}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

