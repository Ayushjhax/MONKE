'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import ClientWalletButton from '../../components/ClientWalletButton';
import PaymentModal from '@/components/PaymentModal';

interface CNFTAsset {
  id: string;
  content: {
    metadata: {
      name: string;
      symbol: string;
      description: string;
      image: string;
      attributes: Array<{
        trait_type: string;
        value: string | number;
      }>;
    };
  };
  ownership: {
    owner: string;
    frozen: boolean;
  };
  supply: {
    print_max_supply: number;
    print_current_supply: number;
  };
  interface: string;
  burnt: boolean;
  collectionData?: {
    id: number;
    name: string;
    merchant_name: string;
    collection_mint: string;
  };
}

interface ResaleListing {
  id: number;
  nft_address: string;
  seller_wallet: string;
  price: number;
  status: 'active' | 'sold' | 'cancelled';
  created_at: string;
  asset_data?: CNFTAsset;
}

export default function ResellPage() {
  const { connected, publicKey } = useWallet();
  const [myAssets, setMyAssets] = useState<CNFTAsset[]>([]);
  const [listings, setListings] = useState<ResaleListing[]>([]);
  const [marketplaceListings, setMarketplaceListings] = useState<ResaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my-nfts' | 'marketplace'>('my-nfts');
  const [selectedAsset, setSelectedAsset] = useState<CNFTAsset | null>(null);
  const [selectedListing, setSelectedListing] = useState<ResaleListing | null>(null);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    listing: ResaleListing | null;
  }>({ isOpen: false, listing: null });
  const [listingPrice, setListingPrice] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [isListing, setIsListing] = useState(false);
  const [isMakingOffer, setIsMakingOffer] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      fetchMyAssets();
      fetchListings();
    }
    fetchMarketplaceListings();
  }, [connected, publicKey]);

  const fetchMyAssets = async () => {
    if (!publicKey) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/resell/my-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        console.log('Fetched assets:', data.assets);
        console.log('Total assets:', data.assets.length);
        console.log('Debug mode:', data.debug);
        console.log('Fallback mode:', data.fallback);
        setMyAssets(data.assets);
        
        if (data.debug) {
          // Debug mode is working correctly - show success message instead of error
          console.log(`Debug mode: Successfully loaded ${data.assets.length} NFTs for resale`);
        }
      } else {
        setError(data.error || 'Failed to fetch assets');
      }
    } catch (err) {
      setError('Failed to fetch assets');
      console.error('Error fetching assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchListings = async () => {
    try {
      const response = await fetch('/api/resell/listings');
      const data = await response.json();
      if (data.success) {
        setListings(data.listings);
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
    }
  };

  const fetchMarketplaceListings = async () => {
    setMarketplaceLoading(true);
    try {
      const response = await fetch('/api/resell/marketplace');
      const data = await response.json();
      if (data.success) {
        setMarketplaceListings(data.listings);
      }
    } catch (err) {
      console.error('Error fetching marketplace listings:', err);
    } finally {
      setMarketplaceLoading(false);
    }
  };

  const handleListAsset = async () => {
    if (!selectedAsset || !listingPrice || !publicKey) return;

    setIsListing(true);
    try {
      const response = await fetch('/api/resell/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetId: selectedAsset.id,
          sellerWallet: publicKey.toString(),
          priceSol: parseFloat(listingPrice),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSelectedAsset(null);
        setListingPrice('');
        fetchListings();
        fetchMarketplaceListings();
        alert('Asset listed successfully!');
      } else {
        setError(data.error || 'Failed to list asset');
      }
    } catch (err) {
      setError('Failed to list asset');
      console.error('Error listing asset:', err);
    } finally {
      setIsListing(false);
    }
  };

  const handlePurchase = (listing: ResaleListing) => {
    setPaymentModal({ isOpen: true, listing });
  };

  const handleMakeOffer = async () => {
    if (!selectedListing || !offerAmount || !publicKey) return;

    setIsMakingOffer(true);
    try {
      const response = await fetch('/api/offers/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId: selectedListing.id,
          buyerWallet: publicKey.toString(),
          offerAmount: parseFloat(offerAmount),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSelectedListing(null);
        setOfferAmount('');
        alert('Offer made successfully! Check your profile to track it.');
      } else {
        setError(data.error || 'Failed to make offer');
      }
    } catch (err) {
      setError('Failed to make offer');
      console.error('Error making offer:', err);
    } finally {
      setIsMakingOffer(false);
    }
  };

  const handlePaymentSuccess = async (signature: string) => {
    if (!paymentModal.listing || !publicKey) return;

    try {
      const response = await fetch('/api/resell/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId: paymentModal.listing.id,
          buyerWallet: publicKey.toString(),
          paymentSignature: signature,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Purchase successful! NFT transfer will be processed in 20 seconds.');
        fetchListings();
        fetchMyAssets();
        fetchMarketplaceListings();
      } else {
        setError(data.error || 'Purchase failed');
      }
    } catch (err) {
      setError('Purchase failed');
      console.error('Error purchasing:', err);
    }
  };

  // Assets are now pre-filtered by the API based on database collections
  const filteredAssets = myAssets;
  
  console.log('Filtered assets count:', filteredAssets.length);
  console.log('Total myAssets count:', myAssets.length);

  const activeListings = listings.filter(listing => listing.status === 'active');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🎫 NFT Resale Marketplace
          </h1>
          <p className="text-xl text-gray-300 mb-6">
            List your DealCoin NFTs for resale or discover amazing deals
          </p>
          <ClientWalletButton className="!bg-blue-600 hover:!bg-blue-700" />
        </div>

        {!connected ? (
          <div className="text-center py-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 max-w-md mx-auto">
              <h2 className="text-2xl font-semibold text-white mb-4">
                Connect Your Wallet
              </h2>
              <p className="text-gray-300 mb-6">
                Connect your wallet to view your NFTs and start trading
              </p>
              <ClientWalletButton className="!bg-blue-600 hover:!bg-blue-700" />
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex justify-center mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('my-nfts')}
                  className={`px-6 py-2 rounded-md transition-colors ${
                    activeTab === 'my-nfts'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  My NFTs
                </button>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className={`px-6 py-2 rounded-md transition-colors ${
                    activeTab === 'marketplace'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Marketplace
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* My NFTs Tab */}
            {activeTab === 'my-nfts' && (
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">
                  Your DealCoin NFTs ({filteredAssets.length})
                </h2>
                
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                    <p className="text-gray-300 mt-4">Loading your NFTs...</p>
                  </div>
                ) : filteredAssets.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 max-w-md mx-auto">
                      <h3 className="text-xl font-semibold text-white mb-2">
                        No NFTs Found
                      </h3>
                      <p className="text-gray-300">
                        {error ? error : "You don't have any NFTs to resell yet. Visit the marketplace to claim some!"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAssets.map((asset) => (
                      <div key={asset.id} className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden">
                        <div className="relative h-48 bg-gray-200">
                          <img
                            src={asset.content?.metadata?.image || '/placeholder-nft.png'}
                            alt={asset.content?.metadata?.name || 'NFT'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.log('Image failed to load:', asset.content?.metadata?.image);
                              e.currentTarget.src = '/placeholder-nft.png';
                            }}
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="text-lg font-semibold text-white mb-2">
                            {asset.content?.metadata?.name || 'Unnamed NFT'}
                          </h3>
                          <p className="text-gray-300 text-sm mb-2 line-clamp-2">
                            {asset.content?.metadata?.description || 'No description'}
                          </p>
                        {asset.collectionData ? (
                          <div className="text-xs text-blue-300 mb-3">
                            Collection: {asset.collectionData.name}
                            <br />
                            Merchant: {asset.collectionData.merchant_name}
                          </div>
                        ) : (
                          <div className="text-xs text-yellow-300 mb-3">
                            Collection: Not matched
                            <br />
                            Merchant: {asset.content?.metadata?.attributes?.find(attr => attr.trait_type === 'Merchant')?.value || 'Unknown'}
                          </div>
                        )}
                          <button
                            onClick={() => setSelectedAsset(asset)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                          >
                            List for Sale
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Marketplace Tab */}
            {activeTab === 'marketplace' && (
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">
                  Resale Marketplace ({marketplaceListings.length} listings)
                </h2>
                
                {marketplaceLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                    <p className="text-gray-300 mt-4">Loading marketplace...</p>
                  </div>
                ) : marketplaceListings.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 max-w-md mx-auto">
                      <h3 className="text-xl font-semibold text-white mb-2">
                        No Listings Available
                      </h3>
                      <p className="text-gray-300">
                        No NFTs are currently listed for resale. Check back later!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {marketplaceListings.map((listing) => (
                      <div key={listing.id} className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden">
                        <div className="relative h-48 bg-gray-200">
                          <img
                            src={listing.asset_data?.content?.metadata?.image || '/placeholder-nft.png'}
                            alt={listing.asset_data?.content?.metadata?.name || 'NFT'}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-4 right-4">
                            <div className="bg-green-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                              {listing.price} SOL
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="text-lg font-semibold text-white mb-2">
                            {listing.asset_data?.content?.metadata?.name || 'Unnamed NFT'}
                          </h3>
                          <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                            {listing.asset_data?.content?.metadata?.description || 'No description'}
                          </p>
                          <div className="flex flex-col space-y-2">
                            <span className="text-sm text-gray-400">
                              Seller: {listing.seller_wallet.slice(0, 8)}...
                            </span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setSelectedListing(listing)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm"
                              >
                                Make Offer
                              </button>
                              <button
                                onClick={() => handlePurchase(listing)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors text-sm"
                              >
                                Buy Now
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Listing Modal */}
            {selectedAsset && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-xl font-semibold mb-4">List NFT for Sale</h3>
                  <div className="mb-4">
                    <img
                      src={selectedAsset.content?.metadata?.image || '/placeholder-nft.png'}
                      alt={selectedAsset.content?.metadata?.name || 'NFT'}
                      className="w-full h-32 object-cover rounded-lg mb-2"
                    />
                    <p className="font-medium">{selectedAsset.content?.metadata?.name}</p>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Price (SOL)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={listingPrice}
                      onChange={(e) => setListingPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.01"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setSelectedAsset(null)}
                      className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleListAsset}
                      disabled={isListing || !listingPrice}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg"
                    >
                      {isListing ? 'Listing...' : 'List for Sale'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Make Offer Modal */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Make Offer</h3>
            <div className="mb-4">
              <img
                src={selectedListing.asset_data?.content?.metadata?.image || '/placeholder-nft.png'}
                alt={selectedListing.asset_data?.content?.metadata?.name || 'NFT'}
                className="w-full h-32 object-cover rounded-lg mb-2"
              />
              <p className="font-medium">{selectedListing.asset_data?.content?.metadata?.name || 'NFT'}</p>
              <p className="text-sm text-gray-500">Listed at: {selectedListing.price} SOL</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Your Offer (SOL)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.8"
              />
              <p className="text-xs text-gray-500 mt-1">Enter your offer amount in SOL</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setSelectedListing(null)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMakeOffer}
                disabled={isMakingOffer || !offerAmount || parseFloat(offerAmount) <= 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg"
              >
                {isMakingOffer ? 'Submitting...' : 'Submit Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal.listing && (
        <PaymentModal
          isOpen={paymentModal.isOpen}
          onClose={() => setPaymentModal({ isOpen: false, listing: null })}
          listing={paymentModal.listing}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
