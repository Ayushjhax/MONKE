'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import ClientWalletButton from '../../../components/ClientWalletButton';
import Link from 'next/link';
import { UserSocialProfile } from '@/lib/social-types';
import UserReputation from '@/components/social/UserReputation';
import ActivityFeed from '@/components/social/ActivityFeed';
import NotificationBell from '@/components/social/NotificationBell';
import PaymentModal from '@/components/PaymentModal';

export default function ProfilePage() {
  const params = useParams();
  const { publicKey } = useWallet();
  const walletAddress = params.wallet as string;
  const isOwnProfile = publicKey?.toBase58() === walletAddress;

  const [profile, setProfile] = useState<UserSocialProfile | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Resale offers state (only shown for own profile)
  const [myOffers, setMyOffers] = useState<any[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<any[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    offer: any | null;
  }>({ isOpen: false, offer: null });

  useEffect(() => {
    fetchProfile();
  }, [walletAddress]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/social/profile?userWallet=${walletAddress}`);
      const data = await response.json();
      
      if (response.ok) {
        setProfile(data.profile);
        setStats(data.stats);
        setDisplayName(data.profile.display_name || '');
        setAvatarUrl(data.profile.avatar_url || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOffers = async () => {
    if (!isOwnProfile || !publicKey) return;
    try {
      setOffersLoading(true);
      const [sentRes, recvRes] = await Promise.all([
        fetch(`/api/offers/my-offers?wallet=${publicKey.toBase58()}&tab=sent`, { cache: 'no-store' }),
        fetch(`/api/offers/my-offers?wallet=${publicKey.toBase58()}&tab=received`, { cache: 'no-store' })
      ]);
      const sentJson = await sentRes.json();
      const recvJson = await recvRes.json();
      setMyOffers(sentJson.offers || []);
      setReceivedOffers(recvJson.offers || []);
    } catch (e) {
      console.error('Error fetching offers:', e);
    } finally {
      setOffersLoading(false);
    }
  };

  useEffect(() => {
    if (isOwnProfile) {
      fetchOffers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwnProfile, publicKey]);

  const handleSaveProfile = async () => {
    if (!publicKey || !isOwnProfile) return;

    setSaving(true);

    try {
      const response = await fetch('/api/social/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWallet: publicKey.toBase58(),
          displayName: displayName.trim() || undefined,
          avatarUrl: avatarUrl.trim() || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setProfile(data.profile);
        setIsEditing(false);
      } else {
        alert(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-2xl">❌</span>
          </div>
          <p className="text-gray-600">Profile not found</p>
          <Link href="/community" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            Back to Community
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
                <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
                <p className="text-sm text-gray-500">User profile and activity</p>
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
              <Link
                href="/community"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Community
              </Link>
              <NotificationBell />
              <ClientWalletButton className="!bg-black hover:!bg-gray-800" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
              {/* Avatar */}
              <div className="text-center">
                <div className="w-32 h-32 mx-auto rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-5xl font-bold">
                  {profile.display_name?.[0]?.toUpperCase() || walletAddress.slice(0, 2)}
                </div>
              </div>

              {/* Profile Info */}
              {isEditing && isOwnProfile ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={100}
                      placeholder="Enter your name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Avatar URL (optional)
                    </label>
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.png"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors font-semibold"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setDisplayName(profile.display_name || '');
                        setAvatarUrl(profile.avatar_url || '');
                      }}
                      className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {profile.display_name || `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`}
                  </h2>
                  <p className="text-sm text-gray-500 break-all">
                    {walletAddress}
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              )}

              {/* Reputation */}
              <div className="border-t pt-6">
                <UserReputation userWallet={walletAddress} />
              </div>

              {/* Stats Grid */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Activity Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-yellow-50 rounded-xl">
                    <div className="text-2xl font-bold text-gray-900">{stats?.rating_count || 0}</div>
                    <div className="text-xs text-gray-600">Ratings</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <div className="text-2xl font-bold text-gray-900">{stats?.comment_count || 0}</div>
                    <div className="text-xs text-gray-600">Comments</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-xl">
                    <div className="text-2xl font-bold text-gray-900">{stats?.share_count || 0}</div>
                    <div className="text-xs text-gray-600">Shares</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-xl">
                    <div className="text-2xl font-bold text-gray-900">{stats?.viral_shares || 0}</div>
                    <div className="text-xs text-gray-600">Viral</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {isOwnProfile ? 'Your Activity' : 'Activity'}
              </h2>
              <ActivityFeed userWallet={walletAddress} limit={20} />
            </div>

            {isOwnProfile && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Resale Offers</h2>
                <OffersPanel 
                  offers={myOffers} 
                  receivedOffers={receivedOffers} 
                  loading={offersLoading} 
                  onChanged={fetchOffers}
                  onPayNow={(offer) => setPaymentModal({ isOpen: true, offer })}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      {paymentModal.isOpen && paymentModal.offer && (
        <PaymentModal
          isOpen={paymentModal.isOpen}
          onClose={() => {
            setPaymentModal({ isOpen: false, offer: null });
            // Refresh offers after closing to see updated status
            setTimeout(() => fetchOffers(), 500);
          }}
          listing={{
            id: paymentModal.offer.listing_id,
            nft_address: paymentModal.offer.nft_address,
            seller_wallet: paymentModal.offer.seller_wallet,
            price: paymentModal.offer.offer_amount,
            status: 'active'
          } as any}
          onPaymentSuccess={async (signature) => {
            try {
              // Call API to process offer payment and confirm transaction
              const res = await fetch('/api/offers/pay-accepted', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  offerId: paymentModal.offer.id,
                  paymentSignature: signature
                })
              });
              
              const data = await res.json();
              if (res.ok) {
                alert('Payment successful! The seller will be notified to release the NFT.');
                // Close modal immediately to prevent duplicate payments
                setPaymentModal({ isOpen: false, offer: null });
                // Refresh offers to show updated status
                setTimeout(() => fetchOffers(), 500);
              } else {
                alert(`Payment processing failed: ${data.error}`);
                // Don't close modal if payment processing failed - let user see the error
              }
            } catch (error) {
              console.error('Error processing payment:', error);
              alert('Failed to process payment. Please try again.');
              // Don't close modal on error
            }
          }}
        />
      )}
    </div>
  );
}

function OffersPanel({ 
  offers, 
  receivedOffers, 
  loading, 
  onChanged,
  onPayNow
}: { 
  offers: any[]; 
  receivedOffers: any[]; 
  loading: boolean; 
  onChanged: () => void;
  onPayNow: (offer: any) => void;
}) {
  const [subTab, setSubTab] = useState<'received' | 'sent'>('received');

  const handleRespond = async (offerId: number, action: 'accept' | 'reject') => {
    try {
      const res = await fetch('/api/offers/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId, action })
      });
      if (res.ok) {
        onChanged();
      }
    } catch (e) {
      console.error('Error responding to offer:', e);
    }
  };

  return (
    <div>
      <div className="flex space-x-3 mb-4">
        <button
          onClick={() => setSubTab('received')}
          className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
            subTab === 'received' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Received ({receivedOffers.length})
        </button>
        <button
          onClick={() => setSubTab('sent')}
          className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
            subTab === 'sent' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Sent ({offers.length})
        </button>
      </div>

      {loading ? (
        <div className="text-gray-600">Loading offers…</div>
      ) : (
        <div className="space-y-3">
          {/* Seller notification banner when any offer is paid */}
          {subTab === 'received' && receivedOffers.some((o: any) => o.status === 'paid') && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-yellow-900">Payment received</p>
                  <p className="text-xs text-yellow-800 mt-1">Buyer has paid. Please release the NFT to the buyer.</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const paid = receivedOffers.find((o: any) => o.status === 'paid');
                      if (!paid) return;
                      const res = await fetch('/api/offers/mark-transferred', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ offerId: paid.id })
                      });
                      if (res.ok) {
                        onChanged();
                      }
                    } catch (e) {
                      console.error('Error marking transferred:', e);
                    }
                  }}
                  className="px-3 py-2 bg-black text-white text-xs font-semibold rounded-md hover:bg-gray-800"
                >
                  Release NFT
                </button>
              </div>
            </div>
          )}
          {(subTab === 'received' ? receivedOffers : offers).map((offer: any) => (
            <div key={offer.id} className="bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-green-700 font-semibold">{offer.offer_amount} SOL</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {subTab === 'received' ? 'From' : 'To'}: {offer.buyer_wallet?.slice(0,8)}...
                  </div>
                  {subTab === 'sent' && offer.status === 'accepted' && (
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          // Double check offer is still accepted before opening payment modal
                          if (offer.status === 'accepted') {
                            onPayNow(offer);
                          } else {
                            alert('This offer is no longer available for payment. Please refresh the page.');
                            onChanged();
                          }
                        }}
                        className="w-full bg-black hover:bg-gray-800 text-white rounded-lg px-4 py-2 font-semibold transition-colors"
                      >
                        💳 Pay {offer.offer_amount} SOL
                      </button>
                      <p className="text-xs text-gray-500 mt-1 text-center">Click to pay the seller</p>
                    </div>
                  )}
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  offer.status === 'accepted' ? 'bg-green-100 text-green-700' :
                  offer.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {offer.status}
                </span>
              </div>

              {subTab === 'received' && offer.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleRespond(offer.id, 'accept')} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-2 font-semibold">Accept</button>
                  <button onClick={() => handleRespond(offer.id, 'reject')} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-2 font-semibold">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}