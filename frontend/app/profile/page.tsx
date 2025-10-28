'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import PaymentModal from '@/components/PaymentModal';
import UserReputation from '@/components/social/UserReputation';
import ClientWalletButton from '../../components/ClientWalletButton';

interface Offer {
  id: number;
  listing_id: number;
  nft_address: string;
  buyer_wallet: string;
  seller_wallet: string;
  offer_amount: number;
  status: string;
  created_at: string;
  asset_data?: any;
}

export default function ProfilePage() {
  const { publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState<'owned' | 'listings' | 'offers' | 'transactions'>('owned');
  const [myAssets, setMyAssets] = useState<any[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    offer: Offer | null;
    amount: number;
  }>({ isOpen: false, offer: null, amount: 0 });

  useEffect(() => {
    if (publicKey) {
      fetchData();
    }
  }, [publicKey]);

  const fetchData = async () => {
    if (!publicKey) return;
    
    setLoading(true);
    try {
      // Fetch owned assets
      const assetsRes = await fetch('/api/resell/my-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toString() })
      });
      const assetsData = await assetsRes.json();
      setMyAssets(assetsData.assets || []);

      // Fetch listings
      const listingsRes = await fetch(`/api/resell/my-listings?wallet=${publicKey.toString()}`);
      const listingsData = await listingsRes.json();
      setMyListings(listingsData.listings || []);

      // Fetch offers made (sent by this user)
      const offersRes = await fetch(`/api/offers/my-offers?wallet=${publicKey.toString()}&tab=sent`);
      const offersData = await offersRes.json();
      setMyOffers(offersData.offers || []);

      // Fetch received offers (sent to this user by others)
      const receivedRes = await fetch(`/api/offers/my-offers?wallet=${publicKey.toString()}&tab=received`);
      const receivedData = await receivedRes.json();
      setReceivedOffers(receivedData.offers || []);

      // Fetch transactions
      const transRes = await fetch(`/api/transactions/my-transactions?wallet=${publicKey.toString()}`);
      const transData = await transRes.json();
      setTransactions(transData.transactions || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
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
                  <p className="text-sm text-gray-500">Your personal dashboard</p>
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
              Connect your Solana wallet to view your profile
            </p>
            <ClientWalletButton className="!bg-black hover:!bg-gray-800" />
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
                <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
                <p className="text-sm text-gray-500">Your personal dashboard</p>
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
                href="/community"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Community
              </Link>
              <ClientWalletButton className="!bg-black hover:!bg-gray-800" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Profile Picture */}
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-2xl">👤</span>
              </div>
              
              {/* Profile Info */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  {publicKey.toString().substring(0, 8)}...{publicKey.toString().substring(publicKey.toString().length - 8)}
                </h1>
                <p className="text-gray-600 mb-2">Member since January 2024</p>
                <div className="flex items-center gap-4">
                  <UserReputation userWallet={publicKey.toString()} compact />
                  <Link href={`/api/social/reputation/${publicKey.toString()}`} className="text-sm text-blue-600 hover:text-blue-700" target="_blank">
                    Refresh Reputation
                  </Link>
                  <Link href="/leaderboard" className="text-sm text-blue-600 hover:text-blue-700">
                    View Leaderboard →
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">$2,400</div>
                <div className="text-sm text-gray-600">Total Saved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">45</div>
                <div className="text-sm text-gray-600">Deals Used</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">#1</div>
                <div className="text-sm text-gray-600">Rank</div>
              </div>
              <button className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors">
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 mb-8">
          <div className="border-b">
            <div className="flex">
              {[
                { key: 'owned', label: 'My NFTs', count: myAssets.length },
                { key: 'listings', label: 'Listings', count: myListings.length },
                { key: 'offers', label: 'Offers', count: myOffers.length + receivedOffers.length },
                { key: 'transactions', label: 'Transactions', count: transactions.length }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-6 py-4 font-semibold text-sm border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            ) : (
              <div className="content">
                {activeTab === 'owned' && <OwnedNFTs assets={myAssets} />}
                {activeTab === 'listings' && <MyListings listings={myListings} />}
                {activeTab === 'offers' && (
                  <OffersSection 
                    offers={myOffers} 
                    receivedOffers={receivedOffers} 
                    onRespond={fetchData}
                    onPayNow={setPaymentModal}
                  />
                )}
                {activeTab === 'transactions' && <TransactionsSection transactions={transactions} />}
              </div>
            )}
          </div>
        </div>

        {/* Reputation Details */}
        <ReputationDetails wallet={publicKey.toString()} />
      </main>

      {/* Payment Modal */}
      {paymentModal.isOpen && paymentModal.offer && (
        <PaymentModal
          isOpen={paymentModal.isOpen}
          onClose={() => setPaymentModal({ isOpen: false, offer: null, amount: 0 })}
          listing={{
            id: paymentModal.offer.listing_id,
            nft_address: paymentModal.offer.nft_address,
            seller_wallet: paymentModal.offer.seller_wallet,
            price: paymentModal.offer.offer_amount,
            status: 'active'
          } as any}
          onPaymentSuccess={async (signature) => {
            // Update transaction with payment signature
            try {
              const res = await fetch('/api/transactions/update-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  offerId: paymentModal.offer?.id,
                  paymentSignature: signature
                })
              });
              
              const result = await res.json();
              
              if (res.ok) {
                alert('Payment completed! The seller will transfer the NFT soon.');
                // Add a small delay to ensure database update completes
                setTimeout(() => {
                  fetchData();
                }, 1000);
              } else {
                alert(`Payment update failed: ${result.error}`);
              }
            } catch (error) {
              console.error('Error updating payment:', error);
            }
            setPaymentModal({ isOpen: false, offer: null, amount: 0 });
          }}
        />
      )}
    </div>
  );
}

function ReputationDetails({ wallet }: { wallet: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/social/reputation/${wallet}`, { cache: 'no-store' });
      const json = await res.json();
      setData(json);
      setLoading(false);
    })();
  }, [wallet]);

  if (loading) return <div className="mt-8 text-gray-600">Loading reputation…</div>;
  if (!data || data.error) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Reputation</h2>
      <p className="text-gray-600 mb-6">
        Level: <span className="font-semibold text-gray-900">{data.level}</span> — Points: <span className="font-semibold text-gray-900">{data.points}</span>
      </p>

      {Array.isArray(data.badges) && data.badges.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Badges</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.badges.map((b: any) => (
              <div key={b.id} className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">{b.icon}</span>
                <div>
                  <div className="text-gray-900 font-semibold">{b.name}</div>
                  <div className="text-xs text-gray-600">{b.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-50 rounded-xl p-4">
            <span className="text-gray-600">Ratings: </span>
            <span className="text-gray-900 font-semibold">{data.metrics.ratings}</span>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <span className="text-gray-600">Comments: </span>
            <span className="text-gray-900 font-semibold">{data.metrics.comments.count}</span>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <span className="text-gray-600">Net Upvotes: </span>
            <span className="text-gray-900 font-semibold">{data.metrics.comments.netUpvotes}</span>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <span className="text-gray-600">Shares: </span>
            <span className="text-gray-900 font-semibold">{data.metrics.shares}</span>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <span className="text-gray-600">Transactions: </span>
            <span className="text-gray-900 font-semibold">{data.metrics.transactions}</span>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <span className="text-gray-600">Unique Merchants: </span>
            <span className="text-gray-900 font-semibold">{data.metrics.uniqueMerchantsClaimed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Components for each tab
function OwnedNFTs({ assets }: { assets: any[] }) {
  if (assets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-400 text-2xl">🎨</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No NFTs Found</h3>
        <p className="text-gray-600">You don't have any NFTs yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {assets.map(asset => (
        <div key={asset.id} className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors">
          <div className="aspect-square bg-gray-200 rounded-xl mb-4 flex items-center justify-center">
            <img 
              src={asset.content?.metadata?.image || '/placeholder-nft.png'} 
              alt={asset.content?.metadata?.name || 'NFT'}
              className="w-full h-full object-cover rounded-xl"
              onError={(e) => { e.currentTarget.src = '/placeholder-nft.png'; }}
            />
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{asset.content?.metadata?.name || 'Unnamed NFT'}</h3>
          <p className="text-sm text-gray-600 truncate">{asset.content?.metadata?.description || 'No description'}</p>
        </div>
      ))}
    </div>
  );
}

function MyListings({ listings }: { listings: any[] }) {
  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-400 text-2xl">📋</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Listings Found</h3>
        <p className="text-gray-600">You don't have any active listings.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.map(listing => (
        <div key={listing.id} className="bg-gray-50 rounded-2xl p-4">
          <div className="aspect-square bg-gray-200 rounded-xl mb-4 flex items-center justify-center">
            <img 
              src={listing.asset_data?.content?.metadata?.image || '/placeholder-nft.png'} 
              alt="NFT"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <h3 className="font-semibold text-gray-900">{listing.asset_data?.content?.metadata?.name || 'Listing'}</h3>
          <p className="text-green-600 font-bold">{listing.price} SOL</p>
          <p className="text-sm text-gray-600">Status: {listing.status}</p>
        </div>
      ))}
    </div>
  );
}

function OffersSection({ 
  offers, 
  receivedOffers, 
  onRespond,
  onPayNow 
}: { 
  offers: Offer[], 
  receivedOffers: Offer[], 
  onRespond: () => void,
  onPayNow: (modal: { isOpen: boolean, offer: Offer | null, amount: number }) => void
}) {
  const [activeSubTab, setActiveSubTab] = useState<'sent' | 'received'>('received');

  const handleRespond = async (offerId: number, action: 'accept' | 'reject') => {
    try {
      const res = await fetch('/api/offers/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId, action })
      });
      
      if (res.ok) {
        alert(action === 'accept' ? 'Offer accepted! Payment pending.' : 'Offer rejected.');
        onRespond();
      }
    } catch (error) {
      console.error('Error responding to offer:', error);
    }
  };

  const handlePayNow = (offer: Offer) => {
    // Convert offer to ResaleListing format for PaymentModal
    const listing: any = {
      id: offer.listing_id,
      nft_address: offer.nft_address,
      seller_wallet: offer.seller_wallet,
      price: offer.offer_amount,
      status: 'accepted'
    };
    
    onPayNow({ 
      isOpen: true, 
      offer, 
      amount: offer.offer_amount 
    });
  };

  const handleTransferNFT = async (offer: Offer) => {
    try {
      const res = await fetch('/api/offers/mark-transferred', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          offerId: offer.id
        })
      });
      
      if (res.ok) {
        alert('NFT transfer marked as completed!');
        onRespond();
      } else {
        const error = await res.json();
        alert(`Failed to mark as transferred: ${error.error}`);
      }
    } catch (error) {
      console.error('Error transferring NFT:', error);
      alert('Failed to transfer NFT. Please try again.');
    }
  };

  return (
    <div>
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveSubTab('received')}
          className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
            activeSubTab === 'received' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Received Offers ({receivedOffers.length})
        </button>
        <button
          onClick={() => setActiveSubTab('sent')}
          className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
            activeSubTab === 'sent' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          My Offers ({offers.length})
        </button>
      </div>

      <div className="space-y-4">
        {(activeSubTab === 'received' ? receivedOffers : offers).map(offer => (
          <div key={offer.id} className="bg-gray-50 rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-green-600 font-bold">{offer.offer_amount} SOL</p>
                <p className="text-sm text-gray-600">
                  {activeSubTab === 'received' ? 'From' : 'To'}: {offer.buyer_wallet.substring(0, 8)}...
                </p>
              </div>
              <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                offer.status === 'accepted' ? 'bg-green-100 text-green-700' :
                offer.status === 'rejected' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {offer.status}
              </span>
            </div>
            {activeSubTab === 'received' && offer.status === 'pending' && (
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => handleRespond(offer.id, 'accept')}
                  className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl text-white font-semibold transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRespond(offer.id, 'reject')}
                  className="flex-1 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl text-white font-semibold transition-colors"
                >
                  Reject
                </button>
              </div>
            )}
            {activeSubTab === 'sent' && offer.status === 'accepted' && (
              <div className="mt-4">
                <button
                  onClick={() => handlePayNow(offer)}
                  className="w-full bg-black hover:bg-gray-800 px-4 py-2 rounded-xl text-white font-semibold transition-colors"
                >
                  Pay Now ({offer.offer_amount} SOL)
                </button>
              </div>
            )}
            {activeSubTab === 'received' && offer.status === 'paid' && (
              <div className="mt-4 space-y-2">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
                  <p className="font-semibold mb-2">Buyer Wallet Address:</p>
                  <p className="font-mono break-all">{offer.buyer_wallet}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(offer.buyer_wallet);
                      alert('Wallet address copied to clipboard!');
                    }}
                    className="mt-2 bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg text-white text-xs transition-colors"
                  >
                    Copy Address
                  </button>
                </div>
                <p className="text-xs text-gray-600">
                  Please transfer the NFT to this wallet address manually.
                </p>
                <button
                  onClick={() => handleTransferNFT(offer)}
                  className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl text-white font-semibold transition-colors"
                >
                  Mark as Transferred
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TransactionsSection({ transactions }: { transactions: any[] }) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-400 text-2xl">💳</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transactions Found</h3>
        <p className="text-gray-600">You don't have any transactions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map(txn => (
        <div key={txn.id} className="bg-gray-50 rounded-2xl p-4">
          <div className="flex justify-between">
            <div>
              <p className="font-semibold text-gray-900">{txn.amount} SOL</p>
              <p className="text-sm text-gray-600">NFT: {txn.nft_address.substring(0, 8)}...</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Payment: {txn.payment_status}</p>
              <p className="text-sm text-gray-600">Transfer: {txn.nft_transfer_status}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}