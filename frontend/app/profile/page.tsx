'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import PaymentModal from '@/components/PaymentModal';

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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold text-white mb-4">Profile Dashboard</h1>
            <p className="text-gray-400 mb-8">Please connect your wallet to view your profile</p>
            <Link href="/" className="text-blue-400 hover:text-blue-300">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-gray-400">Wallet: {publicKey.toString().substring(0, 8)}...{publicKey.toString().substring(publicKey.toString().length - 8)}</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b border-gray-700">
          {[
            { key: 'owned', label: 'My NFTs', count: myAssets.length },
            { key: 'listings', label: 'Listings', count: myListings.length },
            { key: 'offers', label: 'Offers', count: myOffers.length + receivedOffers.length },
            { key: 'transactions', label: 'Transactions', count: transactions.length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 px-6 font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
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

// Components for each tab
function OwnedNFTs({ assets }: { assets: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {assets.map(asset => (
        <div key={asset.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition">
          <div className="aspect-square bg-gray-700 rounded mb-4 flex items-center justify-center">
            <img 
              src={asset.content?.metadata?.image || '/placeholder-nft.png'} 
              alt={asset.content?.metadata?.name || 'NFT'}
              className="w-full h-full object-cover rounded"
              onError={(e) => { e.currentTarget.src = '/placeholder-nft.png'; }}
            />
          </div>
          <h3 className="font-semibold text-white truncate">{asset.content?.metadata?.name || 'Unnamed NFT'}</h3>
          <p className="text-sm text-gray-400 truncate">{asset.content?.metadata?.description || 'No description'}</p>
        </div>
      ))}
    </div>
  );
}

function MyListings({ listings }: { listings: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.map(listing => (
        <div key={listing.id} className="bg-gray-800 rounded-lg p-4">
          <div className="aspect-square bg-gray-700 rounded mb-4 flex items-center justify-center">
            <img 
              src={listing.asset_data?.content?.metadata?.image || '/placeholder-nft.png'} 
              alt="NFT"
              className="w-full h-full object-cover rounded"
            />
          </div>
          <h3 className="font-semibold text-white">{listing.asset_data?.content?.metadata?.name || 'Listing'}</h3>
          <p className="text-green-400 font-bold">{listing.price} SOL</p>
          <p className="text-sm text-gray-400">Status: {listing.status}</p>
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
          className={`px-4 py-2 rounded ${activeSubTab === 'received' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          Received Offers ({receivedOffers.length})
        </button>
        <button
          onClick={() => setActiveSubTab('sent')}
          className={`px-4 py-2 rounded ${activeSubTab === 'sent' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          My Offers ({offers.length})
        </button>
      </div>

      <div className="space-y-4">
        {(activeSubTab === 'received' ? receivedOffers : offers).map(offer => (
          <div key={offer.id} className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-green-400 font-bold">{offer.offer_amount} SOL</p>
                <p className="text-sm text-gray-400">
                  {activeSubTab === 'received' ? 'From' : 'To'}: {offer.buyer_wallet.substring(0, 8)}...
                </p>
              </div>
              <span className={`px-3 py-1 rounded text-sm ${
                offer.status === 'accepted' ? 'bg-green-600' :
                offer.status === 'rejected' ? 'bg-red-600' :
                'bg-yellow-600'
              }`}>
                {offer.status}
              </span>
            </div>
            {activeSubTab === 'received' && offer.status === 'pending' && (
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => handleRespond(offer.id, 'accept')}
                  className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-semibold"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRespond(offer.id, 'reject')}
                  className="flex-1 bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white font-semibold"
                >
                  Reject
                </button>
              </div>
            )}
            {activeSubTab === 'sent' && offer.status === 'accepted' && (
              <div className="mt-4">
                <button
                  onClick={() => handlePayNow(offer)}
                  className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white font-semibold"
                >
                  Pay Now ({offer.offer_amount} SOL)
                </button>
              </div>
            )}
            {activeSubTab === 'received' && offer.status === 'paid' && (
              <div className="mt-4 space-y-2">
                <div className="bg-blue-900 text-blue-200 p-3 rounded text-sm">
                  <p className="font-semibold mb-2">Buyer Wallet Address:</p>
                  <p className="font-mono break-all">{offer.buyer_wallet}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(offer.buyer_wallet);
                      alert('Wallet address copied to clipboard!');
                    }}
                    className="mt-2 bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white text-xs"
                  >
                    Copy Address
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  Please transfer the NFT to this wallet address manually.
                </p>
                <button
                  onClick={() => handleTransferNFT(offer)}
                  className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-semibold"
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
  return (
    <div className="space-y-4">
      {transactions.map(txn => (
        <div key={txn.id} className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between">
            <div>
              <p className="font-semibold text-white">{txn.amount} SOL</p>
              <p className="text-sm text-gray-400">NFT: {txn.nft_address.substring(0, 8)}...</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Payment: {txn.payment_status}</p>
              <p className="text-sm text-gray-400">Transfer: {txn.nft_transfer_status}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

