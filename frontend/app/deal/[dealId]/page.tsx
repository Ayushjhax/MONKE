'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import {
  formatPrice,
  formatDuration,
  formatDateTime,
  formatDate,
  getAirlineName,
  calculateDiscountedPrice,
} from '@/lib/amadeus';

interface Coupon {
  id: number;
  nftMint: string;
  couponCode: string;
  discountValue: number;
  merchantName: string;
  redeemedAt: string;
  txSignature: string;
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  
  const dealId = params.dealId as string;
  const dealType = dealId.startsWith('flight-') ? 'flight' : 'hotel';
  const offerId = dealId.replace(/^(flight|hotel)-/, '');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dealDetails, setDealDetails] = useState<any>(null);
  
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingReference, setBookingReference] = useState('');

  useEffect(() => {
    // Get the selected deal from sessionStorage
    const selectedDealData = sessionStorage.getItem('selectedDeal');
    
    if (selectedDealData) {
      try {
        const selectedDeal = JSON.parse(selectedDealData);
        
        // Verify it's the correct type
        if (selectedDeal.type === dealType) {
          setDealDetails(selectedDeal.data);
        } else {
          setError('Deal type mismatch');
        }
      } catch (e) {
        console.error('Error parsing deal data:', e);
        setError('Invalid deal data');
      }
    } else {
      // Fallback: try the old method
      const storedDeals = sessionStorage.getItem(dealType === 'flight' ? 'flights' : 'hotels');
      if (storedDeals) {
        try {
          const deals = JSON.parse(storedDeals);
          const deal = deals.find((d: any) => d.id === offerId);
          if (deal) {
            setDealDetails(deal);
          } else {
            setError('Deal not found. Please search again from the marketplace.');
          }
        } catch (e) {
          setError('Deal not found. Please search again from the marketplace.');
        }
      } else {
        setError('Deal not found. Please search again from the marketplace.');
      }
    }
    
    setLoading(false);
  }, [dealId, dealType, offerId]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchUserCoupons();
    }
  }, [connected, publicKey]);

  const fetchUserCoupons = async () => {
    if (!publicKey) return;

    setCouponsLoading(true);
    try {
      const response = await fetch(`/api/redemption/user-coupons?wallet=${publicKey.toString()}`);
      const data = await response.json();

      if (data.success) {
        setCoupons(data.coupons || []);
      }
    } catch (err) {
      console.error('Error fetching coupons:', err);
    } finally {
      setCouponsLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    if (!dealDetails) {
      alert('Deal details not available');
      return;
    }

    setBooking(true);
    setError(null);

    try {
      const bookingRequest = {
        userWallet: publicKey.toString(),
        dealType,
        amadeusOfferId: dealDetails.id,
        originalPrice: dealDetails.price,
        currency: dealDetails.currency || 'USD',
        couponCode: selectedCoupon?.couponCode,
        bookingDetails: dealDetails.rawOffer,
      };

      const response = await fetch('/api/amadeus/booking/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingRequest),
      });

      const data = await response.json();

      if (data.success) {
        setBookingSuccess(true);
        setBookingReference(data.booking.bookingReference);
        
        // Show success message with redirect option
        setTimeout(() => {
          router.push('/bookings');
        }, 3000);
      } else {
        setError(data.error || 'Booking failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error booking:', err);
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading deal details...</p>
        </div>
      </div>
    );
  }

  if (error && !dealDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{error}</h2>
          <Link
            href="/marketplace"
            className="mt-4 inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <div className="text-green-600 text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-4">Your booking has been successfully simulated.</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-600 mb-1">Booking Reference</div>
            <div className="text-2xl font-bold text-blue-600">{bookingReference}</div>
          </div>
          <p className="text-sm text-gray-500 mb-6">Redirecting to My Bookings...</p>
          <Link
            href="/bookings"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            View My Bookings
          </Link>
        </div>
      </div>
    );
  }

  const finalPrice = selectedCoupon
    ? calculateDiscountedPrice(dealDetails.price, selectedCoupon.discountValue).finalPrice
    : dealDetails.price;

  const savings = selectedCoupon
    ? calculateDiscountedPrice(dealDetails.price, selectedCoupon.discountValue).discountAmount
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/marketplace" className="text-gray-600 hover:text-gray-900">
                ← Back to Marketplace
              </Link>
            </div>
            <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Deal Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    {dealType === 'flight' ? '✈️ Flight' : '🏨 Hotel'}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {dealType === 'flight'
                    ? `${dealDetails.origin} → ${dealDetails.destination}`
                    : dealDetails.name}
                </h1>
              </div>

              {dealType === 'flight' ? (
                <div className="space-y-6">
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Flight Details</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-2xl font-bold text-gray-900">{dealDetails.origin}</div>
                          <div className="text-sm text-gray-500">{formatDateTime(dealDetails.departureTime)}</div>
                        </div>
                        <div className="flex-1 text-center mx-4">
                          <div className="text-sm text-gray-500">{formatDuration(dealDetails.duration)}</div>
                          <div className="h-px bg-gray-300 my-2"></div>
                          <div className="text-xs text-gray-400">
                            {dealDetails.stops === 0 ? 'Non-stop' : `${dealDetails.stops} stop${dealDetails.stops > 1 ? 's' : ''}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{dealDetails.destination}</div>
                          <div className="text-sm text-gray-500">{formatDateTime(dealDetails.arrivalTime)}</div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-600">Airline</div>
                            <div className="font-medium text-gray-900">{getAirlineName(dealDetails.airline)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Seats Available</div>
                            <div className="font-medium text-gray-900">{dealDetails.seats}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Hotel Details</h3>
                    {dealDetails.address && (
                      <p className="text-gray-600 mb-4">{dealDetails.address}</p>
                    )}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Check-in</span>
                        <span className="font-medium text-gray-900">{formatDate(dealDetails.checkInDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Check-out</span>
                        <span className="font-medium text-gray-900">{formatDate(dealDetails.checkOutDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Room Type</span>
                        <span className="font-medium text-gray-900">{dealDetails.roomType}</span>
                      </div>
                      {dealDetails.rating && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Rating</span>
                          <span className="font-medium text-gray-900">⭐ {dealDetails.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Booking Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
              
              {/* Price */}
              <div className="mb-6">
                <div className="flex justify-between text-gray-600 mb-2">
                  <span>Original Price</span>
                  <span>{formatPrice(dealDetails.price, dealDetails.currency)}</span>
                </div>
                {selectedCoupon && (
                  <>
                    <div className="flex justify-between text-green-600 mb-2">
                      <span>Discount ({selectedCoupon.discountValue}%)</span>
                      <span>-{formatPrice(savings, dealDetails.currency)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-xl text-gray-900">
                      <span>Final Price</span>
                      <span>{formatPrice(finalPrice, dealDetails.currency)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Coupons */}
              {connected && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Available Coupons</h4>
                  {couponsLoading ? (
                    <div className="text-sm text-gray-500">Loading coupons...</div>
                  ) : coupons.length === 0 ? (
                    <div className="text-sm text-gray-500">No coupons available</div>
                  ) : (
                    <div className="space-y-2">
                      {coupons.map((coupon) => (
                        <button
                          key={coupon.id}
                          onClick={() => setSelectedCoupon(selectedCoupon?.id === coupon.id ? null : coupon)}
                          className={`w-full text-left p-3 border rounded-lg transition-colors ${
                            selectedCoupon?.id === coupon.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-sm">{coupon.couponCode}</div>
                              <div className="text-xs text-gray-500">{coupon.merchantName}</div>
                            </div>
                            <div className="text-lg font-bold text-blue-600">{coupon.discountValue}%</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Booking Button */}
              {!connected ? (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-3">Connect your wallet to book</p>
                  <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !w-full" />
                </div>
              ) : (
                <button
                  onClick={handleBooking}
                  disabled={booking}
                  className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {booking ? 'Processing...' : 'Simulate Booking'}
                </button>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

