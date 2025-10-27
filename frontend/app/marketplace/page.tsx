'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all">
                🎫 DealCoin
              </Link>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                Marketplace
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </Link>
              <Link
                href="/community"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Community
              </Link>
              <Link
                href="/bookings"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                My Bookings
              </Link>
              <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700" />
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

      {/* Main Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('static')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'static'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Static Deals
              </button>
              <button
                onClick={() => setActiveTab('flights')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'flights'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                ✈️ Live Flights
              </button>
              <button
                onClick={() => setActiveTab('hotels')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'hotels'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                🏨 Live Hotels
              </button>
            </div>

            <div className="flex gap-3">
              <Link 
                href="/nearby" 
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <span>📍</span>
                <span>Deals Near Me</span>
              </Link>

              <Link 
                href="/events" 
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
              >
                <span>🎪</span>
                <span>Crypto Events</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!connected && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="mx-auto h-24 w-24 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Connect Your Wallet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Connect your Solana wallet to start exploring deals
            </p>
            <div className="mt-6">
              <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700" />
            </div>
          </div>
        )}

        {connected && (
          <>
            {/* Static Deals Tab */}
            {activeTab === 'static' && (
              <div>
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="max-w-md mx-auto">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search deals, merchants, locations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Category Filters */}
                <div className="mb-6 flex flex-wrap gap-2 justify-center">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setFilter(category)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        filter === category
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading deals...</p>
                  </div>
                ) : filteredCollections.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow">
                    <p className="text-gray-600">No deals found</p>
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
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Search Flights</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Origin (IATA)</label>
                      <input
                        type="text"
                        placeholder="JFK, LAX, etc."
                        value={flightOrigin}
                        onChange={(e) => setFlightOrigin(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        maxLength={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Destination (IATA)</label>
                      <input
                        type="text"
                        placeholder="NRT, LHR, etc."
                        value={flightDestination}
                        onChange={(e) => setFlightDestination(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        maxLength={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Departure Date</label>
                      <input
                        type="date"
                        value={flightDepartureDate}
                        onChange={(e) => setFlightDepartureDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Return Date (Optional)</label>
                      <input
                        type="date"
                        value={flightReturnDate}
                        onChange={(e) => setFlightReturnDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adults</label>
                      <select
                        value={flightAdults}
                        onChange={(e) => setFlightAdults(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                      >
                        {flightsLoading ? 'Searching...' : 'Search Flights'}
                      </button>
                    </div>
                  </div>
                  {flightsError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {flightsError}
                    </div>
                  )}
                </div>

                {/* Flight Results */}
                {flightsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Searching flights...</p>
                  </div>
                ) : flights.length > 0 ? (
                  <div className="space-y-4">
                    {flights.map((flight) => (
                      <div key={flight.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-2">
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
                            <div className="text-3xl font-bold text-blue-600">{formatPrice(flight.price, flight.currency)}</div>
                            <Link
                              href={`/deal/flight-${flight.id}`}
                              onClick={() => {
                                // Store the selected flight for the detail page
                                sessionStorage.setItem('selectedDeal', JSON.stringify({
                                  type: 'flight',
                                  data: flight
                                }));
                              }}
                              className="mt-2 inline-block px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Search Hotels</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City Code (IATA)</label>
                      <input
                        type="text"
                        placeholder="NYC, PAR, LON, etc."
                        value={hotelCityCode}
                        onChange={(e) => setHotelCityCode(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        maxLength={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
                      <input
                        type="date"
                        value={hotelCheckIn}
                        onChange={(e) => setHotelCheckIn(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date</label>
                      <input
                        type="date"
                        value={hotelCheckOut}
                        onChange={(e) => setHotelCheckOut(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
                      <select
                        value={hotelAdults}
                        onChange={(e) => setHotelAdults(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {[1, 2, 3, 4, 5, 6].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rooms</label>
                      <select
                        value={hotelRooms}
                        onChange={(e) => setHotelRooms(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                      >
                        {hotelsLoading ? 'Searching...' : 'Search Hotels'}
                      </button>
                    </div>
                  </div>
                  {hotelsError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {hotelsError}
                    </div>
                  )}
                </div>

                {/* Hotel Results */}
                {hotelsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Searching hotels...</p>
                  </div>
                ) : hotels.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hotels.map((hotel) => (
                      <div key={hotel.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                        {hotel.imageUrl && (
                          <img src={hotel.imageUrl} alt={hotel.name} className="w-full h-48 object-cover" />
                        )}
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{hotel.name}</h3>
                            {hotel.rating && (
                              <div className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                ⭐ {hotel.rating}
                              </div>
                            )}
                          </div>
                          {hotel.address && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{hotel.address}</p>
                          )}
                          <div className="text-sm text-gray-500 mb-3">
                            {hotel.roomType} • {hotel.checkInDate} to {hotel.checkOutDate}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold text-blue-600">{formatPrice(hotel.price, hotel.currency)}</div>
                            <Link
                              href={`/deal/hotel-${hotel.id}`}
                              onClick={() => {
                                // Store the selected hotel for the detail page
                                sessionStorage.setItem('selectedDeal', JSON.stringify({
                                  type: 'hotel',
                                  data: hotel
                                }));
                              }}
                              className="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition-colors"
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
    </div>
  );
}
