'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import ClientWalletButton from '../../components/ClientWalletButton';
import Link from 'next/link';
import DealCard from '@/components/DealCard';
import { Collection } from '@/lib/db';
import { formatPrice, formatDuration, formatDateTime, getAirlineName, type FormattedFlightOffer, type FormattedHotelOffer } from '@/lib/amadeus';

type TabType = 'static' | 'flights' | 'hotels';

export default function MarketplacePage() {
  const { connected, publicKey } = useWallet();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('static');
  
  // Static deals state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Flights state
  const [flightOrigin, setFlightOrigin] = useState('');
  const [flightDestination, setFlightDestination] = useState('');
  const [flightDepartureDate, setFlightDepartureDate] = useState('');
  const [flightReturnDate, setFlightReturnDate] = useState('');
  const [flightAdults, setFlightAdults] = useState('1');
  const [flights, setFlights] = useState<FormattedFlightOffer[]>([]);
  const [flightsLoading, setFlightsLoading] = useState(false);
  const [flightsError, setFlightsError] = useState<string | null>(null);
  const [flightDataSource, setFlightDataSource] = useState<'amadeus' | 'hybrid' | 'mock' | 'fallback' | null>(null);
  
  // Hotels state
  const [hotelCityCode, setHotelCityCode] = useState('');
  const [hotelCheckIn, setHotelCheckIn] = useState('');
  const [hotelCheckOut, setHotelCheckOut] = useState('');
  const [hotelAdults, setHotelAdults] = useState('1');
  const [hotelRooms, setHotelRooms] = useState('1');
  const [hotels, setHotels] = useState<FormattedHotelOffer[]>([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [hotelsError, setHotelsError] = useState<string | null>(null);
  const [hotelDataSource, setHotelDataSource] = useState<'amadeus' | 'hybrid' | 'mock' | 'fallback' | null>(null);
  
  // Banner dismissal state
  const [flightBannerDismissed, setFlightBannerDismissed] = useState(false);
  const [hotelBannerDismissed, setHotelBannerDismissed] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/collections');
      const data = await response.json();
      
      if (data.success) {
        setCollections(data.collections);
      } else {
        setError(data.error || 'Failed to fetch collections');
      }
    } catch (err) {
      setError('Failed to fetch collections');
      console.error('Error fetching collections:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchFlights = async () => {
    if (!flightOrigin || !flightDestination || !flightDepartureDate) {
      setFlightsError('Please fill in all required fields');
      return;
    }

    setFlightsLoading(true);
    setFlightsError(null);

    try {
      const params = new URLSearchParams({
        origin: flightOrigin,
        destination: flightDestination,
        departureDate: flightDepartureDate,
        adults: flightAdults,
        max: '10',
      });

      if (flightReturnDate) {
        params.append('returnDate', flightReturnDate);
      }

      const response = await fetch(`/api/amadeus/flights/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setFlights(data.flights || []);
        setFlightDataSource(data.dataSource || 'amadeus');
        setFlightBannerDismissed(false); // Show banner for new search
        // Store in sessionStorage for detail page
        sessionStorage.setItem('flights', JSON.stringify(data.flights || []));
        if (data.flights.length === 0) {
          setFlightsError('No flights found for this route');
        }
      } else {
        setFlightsError(data.error || 'Failed to search flights');
      }
    } catch (err) {
      setFlightsError('Network error. Please try again.');
      console.error('Error searching flights:', err);
    } finally {
      setFlightsLoading(false);
    }
  };

  const searchHotels = async () => {
    if (!hotelCityCode || !hotelCheckIn || !hotelCheckOut) {
      setHotelsError('Please fill in all required fields');
      return;
    }

    setHotelsLoading(true);
    setHotelsError(null);

    try {
      const params = new URLSearchParams({
        cityCode: hotelCityCode,
        checkInDate: hotelCheckIn,
        checkOutDate: hotelCheckOut,
        adults: hotelAdults,
        rooms: hotelRooms,
        max: '10',
      });

      const response = await fetch(`/api/amadeus/hotels/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setHotels(data.hotels || []);
        setHotelDataSource(data.dataSource || 'amadeus');
        setHotelBannerDismissed(false); // Show banner for new search
        // Store in sessionStorage for detail page
        sessionStorage.setItem('hotels', JSON.stringify(data.hotels || []));
        if (data.hotels.length === 0) {
          setHotelsError('No hotels found in this city');
        }
      } else {
        setHotelsError(data.error || 'Failed to search hotels');
      }
    } catch (err) {
      setHotelsError('Network error. Please try again.');
      console.error('Error searching hotels:', err);
    } finally {
      setHotelsLoading(false);
    }
  };

  const filteredCollections = collections.filter(collection => {
    const categoryMatch = filter === 'all' || collection.category.toLowerCase() === filter.toLowerCase();
    const searchMatch = searchQuery === '' || 
      collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      collection.merchant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      collection.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      collection.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return categoryMatch && searchMatch;
  });

  const categories = ['all', 'flight', 'hotel', 'restaurant', 'travel', 'shopping', 'experience'];

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
                <h1 className="text-xl font-semibold text-gray-900">Marketplace</h1>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/community"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Community
              </Link>
              <Link
                href="/bookings"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                My Bookings
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

      {/* Dynamic Data Source Banner */}
      {activeTab === 'flights' && flightDataSource && !flightBannerDismissed && (
        <div className={`border-b ${
          flightDataSource === 'amadeus' ? 'bg-green-50 border-green-200' :
          flightDataSource === 'hybrid' ? 'bg-blue-50 border-blue-200' :
          flightDataSource === 'mock' ? 'bg-yellow-50 border-yellow-200' :
          'bg-orange-50 border-orange-200'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-lg">
                  {flightDataSource === 'amadeus' ? '✅' :
                   flightDataSource === 'hybrid' ? '🔄' :
                   flightDataSource === 'mock' ? '✨' : '🛡️'}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    flightDataSource === 'amadeus' ? 'text-green-900' :
                    flightDataSource === 'hybrid' ? 'text-blue-900' :
                    flightDataSource === 'mock' ? 'text-yellow-900' :
                    'text-orange-900'
                  }`}>
                    {flightDataSource === 'amadeus' && <><strong>Live Data:</strong> Real-time results from Amadeus API</>}
                    {flightDataSource === 'hybrid' && <><strong>Enhanced Results:</strong> Amadeus API + curated realistic data</>}
                    {flightDataSource === 'mock' && <><strong>Demo Data:</strong> Realistic curated data for demonstration</>}
                    {flightDataSource === 'fallback' && <><strong>Fallback Data:</strong> Using curated data (API temporarily unavailable)</>}
                  </p>
                  <p className={`text-xs mt-1 ${
                    flightDataSource === 'amadeus' ? 'text-green-700' :
                    flightDataSource === 'hybrid' ? 'text-blue-700' :
                    flightDataSource === 'mock' ? 'text-yellow-700' :
                    'text-orange-700'
                  }`}>
                    {flightDataSource === 'amadeus' && 'Connected to production-grade travel API'}
                    {flightDataSource === 'hybrid' && 'Amadeus test data enhanced with realistic options'}
                    {flightDataSource === 'mock' && 'Curated data showcasing integration capabilities'}
                    {flightDataSource === 'fallback' && 'Graceful fallback ensures uninterrupted experience'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFlightBannerDismissed(true)}
                className="ml-4 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hotels' && hotelDataSource && !hotelBannerDismissed && (
        <div className={`border-b ${
          hotelDataSource === 'amadeus' ? 'bg-green-50 border-green-200' :
          hotelDataSource === 'hybrid' ? 'bg-blue-50 border-blue-200' :
          hotelDataSource === 'mock' ? 'bg-yellow-50 border-yellow-200' :
          'bg-orange-50 border-orange-200'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-lg">
                  {hotelDataSource === 'amadeus' ? '✅' :
                   hotelDataSource === 'hybrid' ? '🔄' :
                   hotelDataSource === 'mock' ? '✨' : '🛡️'}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    hotelDataSource === 'amadeus' ? 'text-green-900' :
                    hotelDataSource === 'hybrid' ? 'text-blue-900' :
                    hotelDataSource === 'mock' ? 'text-yellow-900' :
                    'text-orange-900'
                  }`}>
                    {hotelDataSource === 'amadeus' && <><strong>Live Data:</strong> Real-time results from Amadeus API</>}
                    {hotelDataSource === 'hybrid' && <><strong>Enhanced Results:</strong> Amadeus API + curated realistic data</>}
                    {hotelDataSource === 'mock' && <><strong>Demo Data:</strong> Realistic curated data for demonstration</>}
                    {hotelDataSource === 'fallback' && <><strong>Fallback Data:</strong> Using curated data (API temporarily unavailable)</>}
                  </p>
                  <p className={`text-xs mt-1 ${
                    hotelDataSource === 'amadeus' ? 'text-green-700' :
                    hotelDataSource === 'hybrid' ? 'text-blue-700' :
                    hotelDataSource === 'mock' ? 'text-yellow-700' :
                    'text-orange-700'
                  }`}>
                    {hotelDataSource === 'amadeus' && 'Connected to production-grade travel API'}
                    {hotelDataSource === 'hybrid' && 'Amadeus test data enhanced with realistic options'}
                    {hotelDataSource === 'mock' && 'Curated data showcasing integration capabilities'}
                    {hotelDataSource === 'fallback' && 'Graceful fallback ensures uninterrupted experience'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHotelBannerDismissed(true)}
                className="ml-4 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Tab Navigation */}
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('static')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === 'static'
                    ? 'bg-black text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Static Deals
              </button>
              <button
                onClick={() => setActiveTab('flights')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === 'flights'
                    ? 'bg-black text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                ✈️ Live Flights
              </button>
              <button
                onClick={() => setActiveTab('hotels')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === 'hotels'
                    ? 'bg-black text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                🏨 Live Hotels
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Link 
                href="/nearby" 
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <span>📍</span>
                <span>Deals Near Me</span>
              </Link>

              <Link 
                href="/events" 
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <span>🎪</span>
                <span>Crypto Events</span>
              </Link>

              <Link 
                href="/resell" 
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <span>🎫</span>
                <span>Resell NFTs</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!connected && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600 mb-6">
              Connect your Solana wallet to start exploring deals
            </p>
            <ClientWalletButton className="!bg-black hover:!bg-gray-800" />
          </div>
        )}

        {connected && (
          <>
            {/* Static Deals Tab */}
            {activeTab === 'static' && (
              <div>
                {/* Search Bar */}
                <div className="mb-8">
                  <div className="max-w-2xl mx-auto">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search deals, merchants, locations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-black"
                      />
                    </div>
                  </div>
                </div>

                {/* Category Filters */}
                <div className="mb-8">
                  <div className="flex flex-wrap gap-3 justify-center">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setFilter(category)}
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                          filter === category
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                        }`}
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-16">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading deals...</p>
                  </div>
                ) : filteredCollections.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-gray-400 text-2xl">🔍</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No deals found</h3>
                    <p className="text-gray-600">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCollections.map((collection) => (
                      <DealCard
                        key={collection.id}
                        collection={collection}
                        userWallet={publicKey?.toString() || ''}
                        onMintSuccess={fetchCollections}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Flights Tab */}
            {activeTab === 'flights' && (
              <div>
                {/* Flight Search Form */}
                <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">Search Flights</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Origin (IATA)</label>
                      <input
                        type="text"
                        placeholder="JFK, LAX, etc."
                        value={flightOrigin}
                        onChange={(e) => setFlightOrigin(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all text-black"
                        maxLength={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Destination (IATA)</label>
                      <input
                        type="text"
                        placeholder="NRT, LHR, etc."
                        value={flightDestination}
                        onChange={(e) => setFlightDestination(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all text-black"
                        maxLength={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Departure Date</label>
                      <input
                        type="date"
                        value={flightDepartureDate}
                        onChange={(e) => setFlightDepartureDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Return Date (Optional)</label>
                      <input
                        type="date"
                        value={flightReturnDate}
                        onChange={(e) => setFlightReturnDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Adults</label>
                      <select
                        value={flightAdults}
                        onChange={(e) => setFlightAdults(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all text-black"
                      >
                        {[1, 2, 3, 4, 5, 6].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={searchFlights}
                        disabled={flightsLoading}
                        className="w-full bg-black text-white font-semibold py-4 px-6 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {flightsLoading ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Searching...</span>
                          </div>
                        ) : (
                          'Search Flights'
                        )}
                      </button>
                    </div>
                  </div>
                  {flightsError && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-red-800 text-sm">{flightsError}</p>
                    </div>
                  )}
                </div>

                {/* Flight Results */}
                {flightsLoading ? (
                  <div className="text-center py-16">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Searching flights...</p>
                  </div>
                ) : flights.length > 0 ? (
                  <div className="space-y-4">
                    {flights.map((flight) => (
                      <div key={flight.id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-6 mb-3">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{flight.origin}</div>
                                <div className="text-sm text-gray-500">{formatDateTime(flight.departureTime)}</div>
                              </div>
                              <div className="flex-1 text-center">
                                <div className="text-sm text-gray-500">{formatDuration(flight.duration)}</div>
                                <div className="text-xs text-gray-400">{flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{flight.destination}</div>
                                <div className="text-sm text-gray-500">{formatDateTime(flight.arrivalTime)}</div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              {getAirlineName(flight.airline)} • {flight.seats} seats available
                            </div>
                          </div>
                          <div className="text-right ml-6">
                            <div className="text-3xl font-bold text-gray-900">{formatPrice(flight.price, flight.currency)}</div>
                            <Link
                              href={`/deal/flight-${flight.id}`}
                              onClick={() => {
                                // Store the selected flight for the detail page
                                sessionStorage.setItem('selectedDeal', JSON.stringify({
                                  type: 'flight',
                                  data: flight
                                }));
                              }}
                              className="mt-3 inline-block px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {/* Hotels Tab */}
            {activeTab === 'hotels' && (
              <div>
                {/* Hotel Search Form */}
                <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">Search Hotels</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City Code (IATA)</label>
                      <input
                        type="text"
                        placeholder="NYC, PAR, LON, etc."
                        value={hotelCityCode}
                        onChange={(e) => setHotelCityCode(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all text-black"
                        maxLength={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Check-in Date</label>
                      <input
                        type="date"
                        value={hotelCheckIn}
                        onChange={(e) => setHotelCheckIn(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Check-out Date</label>
                      <input
                        type="date"
                        value={hotelCheckOut}
                        onChange={(e) => setHotelCheckOut(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Guests</label>
                      <select
                        value={hotelAdults}
                        onChange={(e) => setHotelAdults(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all text-black"
                      >
                        {[1, 2, 3, 4, 5, 6].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rooms</label>
                      <select
                        value={hotelRooms}
                        onChange={(e) => setHotelRooms(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all text-black"
                      >
                        {[1, 2, 3, 4].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={searchHotels}
                        disabled={hotelsLoading}
                        className="w-full bg-black text-white font-semibold py-4 px-6 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {hotelsLoading ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Searching...</span>
                          </div>
                        ) : (
                          'Search Hotels'
                        )}
                      </button>
                    </div>
                  </div>
                  {hotelsError && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-red-800 text-sm">{hotelsError}</p>
                    </div>
                  )}
                </div>

                {/* Hotel Results */}
                {hotelsLoading ? (
                  <div className="text-center py-16">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Searching hotels...</p>
                  </div>
                ) : hotels.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hotels.map((hotel) => (
                      <div key={hotel.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                        {hotel.imageUrl && (
                          <img src={hotel.imageUrl} alt={hotel.name} className="w-full h-48 object-cover" />
                        )}
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{hotel.name}</h3>
                            {hotel.rating && (
                              <div className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-lg">
                                ⭐ {hotel.rating}
                              </div>
                            )}
                          </div>
                          {hotel.address && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{hotel.address}</p>
                          )}
                          <div className="text-sm text-gray-500 mb-4">
                            {hotel.roomType} • {hotel.checkInDate} to {hotel.checkOutDate}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold text-gray-900">{formatPrice(hotel.price, hotel.currency)}</div>
                            <Link
                              href={`/deal/hotel-${hotel.id}`}
                              onClick={() => {
                                // Store the selected hotel for the detail page
                                sessionStorage.setItem('selectedDeal', JSON.stringify({
                                  type: 'hotel',
                                  data: hotel
                                }));
                              }}
                              className="px-4 py-2 bg-black text-white font-semibold text-sm rounded-xl hover:bg-gray-800 transition-colors"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8">
        <button className="w-14 h-14 bg-black text-white rounded-full shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center">
          <span className="text-xl">+</span>
        </button>
      </div>
    </div>
  );
}