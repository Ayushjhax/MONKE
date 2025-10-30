'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import ClientWalletButton from '../../components/ClientWalletButton';
import Link from 'next/link';
import { formatPrice, formatDate } from '@/lib/amadeus';

interface Booking {
  id: number;
  bookingReference: string;
  dealType: 'flight' | 'hotel';
  originalPrice: number;
  discountApplied: number;
  finalPrice: number;
  couponCode?: string;
  status: string;
  bookedAt: string;
  bookingDetails: any;
}

export default function BookingsPage() {
  const { connected, publicKey } = useWallet();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterType, setFilterType] = useState<'all' | 'flight' | 'hotel'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'cancelled'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'price'>('date');

  useEffect(() => {
    if (connected && publicKey) {
      fetchBookings();
    } else {
      setLoading(false);
    }
  }, [connected, publicKey]);

  const fetchBookings = async () => {
    if (!publicKey) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookings?wallet=${publicKey.toString()}`);
      const data = await response.json();

      if (data.success) {
        setBookings(data.bookings || []);
      } else {
        setError(data.error || 'Failed to fetch bookings');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (filteredBookings.length === 0) {
      alert('No bookings to export');
      return;
    }

    const headers = ['Booking Reference', 'Type', 'Date', 'Original Price', 'Discount', 'Final Price', 'Coupon Code', 'Status'];
    const rows = filteredBookings.map(booking => [
      booking.bookingReference,
      booking.dealType.charAt(0).toUpperCase() + booking.dealType.slice(1),
      new Date(booking.bookedAt).toLocaleDateString(),
      booking.originalPrice.toFixed(2),
      booking.discountApplied.toFixed(2),
      booking.finalPrice.toFixed(2),
      booking.couponCode || 'N/A',
      booking.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredBookings = bookings
    .filter(booking => {
      const typeMatch = filterType === 'all' || booking.dealType === filterType;
      const statusMatch = filterStatus === 'all' || booking.status === filterStatus;
      return typeMatch && statusMatch;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime();
      } else {
        return b.finalPrice - a.finalPrice;
      }
    });

  const totalSpent = filteredBookings.reduce((sum, booking) => sum + booking.finalPrice, 0);
  const totalSaved = filteredBookings.reduce((sum, booking) => sum + booking.discountApplied, 0);

  if (!connected) {
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
                  <h1 className="text-xl font-semibold text-gray-900">My Bookings</h1>
                  <p className="text-sm text-gray-500">Manage your travel bookings and reservations</p>
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
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center bg-white rounded-2xl border border-gray-200 p-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600 mb-6">
              Connect your Solana wallet to view your bookings
            </p>
            <ClientWalletButton className="!bg-black hover:!bg-gray-800" />
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
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
                  <h1 className="text-xl font-semibold text-gray-900">My Bookings</h1>
                  <p className="text-sm text-gray-500">Manage your travel bookings and reservations</p>
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
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your bookings...</p>
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
                <h1 className="text-xl font-semibold text-gray-900">My Bookings</h1>
                <p className="text-sm text-gray-500">Manage your travel bookings and reservations</p>
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
                  Back to Marketplace
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Bookings</h1>
          <p className="text-lg text-gray-600">
            Manage your travel bookings and reservations
          </p>
        </div>

        {/* Stats */}
        {bookings.length > 0 && (
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">{bookings.length}</div>
                <div className="text-sm text-gray-600">Total Bookings</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">{formatPrice(totalSaved)}</div>
                <div className="text-sm text-gray-600">Total Saved</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">{formatPrice(totalSpent)}</div>
                <div className="text-sm text-gray-600">Total Spent</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {bookings.filter(b => b.status === 'confirmed').length}
                </div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div>
                <label className="text-sm text-gray-600 mr-2">Type:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-black focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                >
                  <option value="all">All</option>
                  <option value="flight">Flights</option>
                  <option value="hotel">Hotels</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mr-2">Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-black focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                >
                  <option value="all">All</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mr-2">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-black focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                >
                  <option value="date">Date</option>
                  <option value="price">Price</option>
                </select>
              </div>
            </div>
            <button
              onClick={exportToCSV}
              disabled={filteredBookings.length === 0}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Bookings List */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">⚠️</div>
              <div>
                <h3 className="text-sm font-semibold text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {filteredBookings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-2xl">📋</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-600 mb-6">
              {bookings.length === 0
                ? "You haven't made any bookings yet. Start exploring deals!"
                : 'No bookings match your filters. Try adjusting them.'}
            </p>
            <Link
              href="/marketplace"
              className="inline-block bg-black text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors"
            >
              Explore Marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`w-20 h-20 rounded-xl flex items-center justify-center ${
                        booking.dealType === 'flight'
                          ? 'bg-blue-50'
                          : 'bg-purple-50'
                      }`}>
                        <span className="text-2xl">
                          {booking.dealType === 'flight' ? '✈️' : '🏨'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-3 py-1 text-sm font-semibold rounded-lg ${
                            booking.dealType === 'flight'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {booking.dealType === 'flight' ? 'Flight' : 'Hotel'}
                          </span>
                          <span className={`px-3 py-1 text-sm font-semibold rounded-lg ${
                            booking.status === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {booking.bookingReference}
                        </div>
                        <div className="text-sm text-gray-500">
                          Booked on {formatDate(booking.bookedAt)}
                        </div>
                        {booking.couponCode && (
                          <div className="inline-flex items-center px-3 py-1 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 mt-2">
                            🎫 Coupon: <span className="ml-1 font-semibold">{booking.couponCode}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-6">
                    {booking.discountApplied > 0 && (
                      <div className="text-sm text-gray-500 line-through mb-1">
                        {formatPrice(booking.originalPrice)}
                      </div>
                    )}
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {formatPrice(booking.finalPrice)}
                    </div>
                    {booking.discountApplied > 0 && (
                      <div className="text-sm text-green-600 font-semibold">
                        Saved {formatPrice(booking.discountApplied)}
                      </div>
                    )}
                    <div className="mt-4 flex space-x-2">
                      <button className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors">
                        View Details
                      </button>
                      <button className="px-4 py-2 border border-red-500 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors">
                        Cancel
                      </button>
                    </div>
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