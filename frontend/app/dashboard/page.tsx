'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  loadCurrentMerchant,
  loadMerchantUsers,
  clearCurrentMerchant,
  downloadKeypair,
  getKeypairFromUser,
  type MerchantUser
} from '../../lib/pinata';
import {
  createCollection,
  createMerkleTree,
  mintDiscountNFT,
  getMerchantCollections,
  getCollectionAssets,
  type CollectionData,
  type DiscountMetadata
} from '../../lib/merchant-mint';
import { uploadImageToPinata } from '../../lib/pinata';

export default function MerchantDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<MerchantUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'setup' | 'mint' | 'collections'>('setup');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Collection state
  const [collectionMint, setCollectionMint] = useState('');
  const [merkleTree, setMerkleTree] = useState('');
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [creatingTree, setCreatingTree] = useState(false);
  
  // Minting state
  const [mintingNFT, setMintingNFT] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageMode, setImageMode] = useState<'file' | 'url'>('file');
  const [recipientMode, setRecipientMode] = useState<'single' | 'multiple' | 'self'>('single');
  const [singleRecipient, setSingleRecipient] = useState('');
  const [multipleRecipients, setMultipleRecipients] = useState('');
  
  // Collections
  const [myCollections, setMyCollections] = useState<any[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [addingToMarketplace, setAddingToMarketplace] = useState(false);

  // Form data
  const [collectionForm, setCollectionForm] = useState<CollectionData>({
    name: 'DealCoin Discounts',
    symbol: 'DEAL',
    description: 'Exclusive discount coupons powered by Solana',
    imageUrl: '',
    externalUrl: 'https://dealcoin.app',
    sellerFeeBasisPoints: 0
  });

  const [discountForm, setDiscountForm] = useState<DiscountMetadata>({
    name: '20% Off Hotel Stay',
    symbol: 'DEAL',
    description: 'Experience luxury with exclusive savings',
    discountPercent: 20,
    originalPrice: 800,
    discountedPrice: 640,
    merchantName: 'Luxury Hotels',
    merchantId: 'luxury-hotels',
    category: 'Hotel',
    location: 'Singapore',
    expiryDate: '2025-12-31',
    redemptionCode: 'HOTEL20-2024',
    maxUses: 999999
  });

  // Check authentication
  useEffect(() => {
    const username = loadCurrentMerchant();
    if (!username) {
      router.push('/dashboard/login');
      return;
    }

    const users = loadMerchantUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) {
      router.push('/dashboard/login');
      return;
    }

    setCurrentUser(user);
    setLoading(false);

    // Load saved collection/tree from localStorage
    const savedCollection = localStorage.getItem(`merchant_${username}_collection`);
    const savedTree = localStorage.getItem(`merchant_${username}_merkleTree`);
    if (savedCollection) setCollectionMint(savedCollection);
    if (savedTree) setMerkleTree(savedTree);
  }, [router]);

  const handleLogout = () => {
    clearCurrentMerchant();
    router.push('/dashboard/login');
  };

  const handleDownloadKeypair = () => {
    if (!currentUser) return;
    downloadKeypair(currentUser);
    setSuccess('Private key downloaded! Import it into Phantom wallet.');
  };

  const handleCreateCollection = async () => {
    if (!currentUser) return;
    setCreatingCollection(true);
    setError('');
    setSuccess('');

    try {
      const keypair = getKeypairFromUser(currentUser);
      const result = await createCollection(keypair, collectionForm);
      
      setCollectionMint(result.collectionMint);
      localStorage.setItem(`merchant_${currentUser.username}_collection`, result.collectionMint);
      
      setSuccess(`Collection created! Address: ${result.collectionMint}`);
      window.open(result.explorerUrl, '_blank');
    } catch (err) {
      setError(`Failed to create collection: ${err instanceof Error ? err.message : String(err)}`);
      console.error(err);
    } finally {
      setCreatingCollection(false);
    }
  };

  const handleCreateMerkleTree = async () => {
    if (!currentUser) return;
    setCreatingTree(true);
    setError('');
    setSuccess('');

    try {
      const keypair = getKeypairFromUser(currentUser);
      const result = await createMerkleTree(keypair, {
        maxDepth: 14,
        maxBufferSize: 64
      });
      
      setMerkleTree(result.merkleTree);
      localStorage.setItem(`merchant_${currentUser.username}_merkleTree`, result.merkleTree);
      
      setSuccess(`Merkle Tree created! Address: ${result.merkleTree}`);
      window.open(result.explorerUrl, '_blank');
    } catch (err) {
      setError(`Failed to create merkle tree: ${err instanceof Error ? err.message : String(err)}`);
      console.error(err);
    } finally {
      setCreatingTree(false);
    }
  };

  const handleMintNFT = async () => {
    if (!currentUser) return;
    if (!collectionMint || !merkleTree) {
      setError('Please create collection and merkle tree first!');
      return;
    }

    setMintingNFT(true);
    setError('');
    setSuccess('');

    try {
      // Determine recipients
      let recipients: string[] = [];
      
      if (recipientMode === 'single') {
        if (!singleRecipient.trim()) {
          setError('Please enter a recipient address');
          setMintingNFT(false);
          return;
        }
        recipients = [singleRecipient.trim()];
      } else if (recipientMode === 'multiple') {
        recipients = multipleRecipients
          .split('\n')
          .map(addr => addr.trim())
          .filter(addr => addr.length > 0);
        
        if (recipients.length === 0) {
          setError('Please enter at least one recipient address');
          setMintingNFT(false);
          return;
        }
      } else {
        // self
        recipients = [currentUser.publicKey];
      }

      const keypair = getKeypairFromUser(currentUser);
      const result = await mintDiscountNFT(
        keypair,
        collectionMint,
        merkleTree,
        discountForm,
        recipients,
        imageMode === 'file' ? imageFile : undefined,
        imageMode === 'url' ? imageUrl : undefined
      );
      
      setSuccess(`Successfully minted ${result.signatures.length} NFT(s)!`);
      
      // Open first transaction in explorer
      if (result.explorerUrls.length > 0) {
        window.open(result.explorerUrls[0], '_blank');
      }
    } catch (err) {
      setError(`Failed to mint NFT: ${err instanceof Error ? err.message : String(err)}`);
      console.error(err);
    } finally {
      setMintingNFT(false);
    }
  };

  const handleLoadCollections = async () => {
    if (!currentUser) return;
    setLoadingCollections(true);

    try {
      const collections = await getMerchantCollections(currentUser.publicKey);
      setMyCollections(collections);
    } catch (err) {
      console.error('Error loading collections:', err);
    } finally {
      setLoadingCollections(false);
    }
  };

  const handleAddToMarketplace = async () => {
    if (!currentUser || !collectionMint || !merkleTree) {
      setError('Please create collection and merkle tree first!');
      return;
    }

    setAddingToMarketplace(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/collections/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: collectionForm.name,
          symbol: collectionForm.symbol,
          description: collectionForm.description,
          imageUrl: collectionForm.imageUrl,
          collectionMint: collectionMint,
          merkleTree: merkleTree,
          merchantId: currentUser.username,
          merchantName: currentUser.username,
          merchantWallet: currentUser.publicKey,
          category: discountForm.category,
          discountPercent: discountForm.discountPercent,
          originalPrice: discountForm.originalPrice,
          discountedPrice: discountForm.discountedPrice,
          location: discountForm.location,
          expiryDate: discountForm.expiryDate,
          maxUses: discountForm.maxUses
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.isExisting) {
          setSuccess('✅ Collection already exists in marketplace! Users can discover and claim your deals.');
        } else {
          setSuccess('✅ Collection added to marketplace! Users can now discover and claim your deals.');
        }
      } else {
        setError(`Failed to add to marketplace: ${data.error}`);
      }
    } catch (err) {
      setError(`Failed to add to marketplace: ${err instanceof Error ? err.message : String(err)}`);
      console.error(err);
    } finally {
      setAddingToMarketplace(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Navigation */}
      <nav className="p-6 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">🏪 Merchant Dashboard</h1>
            <p className="text-gray-300 text-sm">Welcome, {currentUser.username}</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-right">
              <p className="text-xs text-gray-400">Your Wallet</p>
              <p className="text-white font-mono text-xs">{currentUser.publicKey.slice(0, 8)}...{currentUser.publicKey.slice(-8)}</p>
            </div>
            <button
              onClick={handleDownloadKeypair}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
            >
              📥 Download Key
            </button>
            <Link href="/" className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition">
              🏠 Home
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'setup'
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            ⚙️ Setup
          </button>
          <button
            onClick={() => setActiveTab('mint')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'mint'
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            🎫 Mint NFTs
          </button>
          <button
            onClick={() => {
              setActiveTab('collections');
              handleLoadCollections();
            }}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'collections'
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            📚 My Collections
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
            <p className="text-green-200">{success}</p>
          </div>
        )}

        {/* Setup Tab */}
        {activeTab === 'setup' && (
          <div className="space-y-8">
            {/* Step 1: Create Collection */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">
                Step 1: Create NFT Collection
              </h2>
              
              {collectionMint ? (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                  <p className="text-green-200 mb-2">✅ Collection created!</p>
                  <p className="text-white font-mono text-sm break-all">{collectionMint}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white font-medium mb-2">Collection Name</label>
                      <input
                        type="text"
                        value={collectionForm.name}
                        onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-medium mb-2">Symbol</label>
                      <input
                        type="text"
                        value={collectionForm.symbol}
                        onChange={(e) => setCollectionForm({ ...collectionForm, symbol: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-white font-medium mb-2">Description</label>
                    <textarea
                      value={collectionForm.description}
                      onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-medium mb-2">Image URL</label>
                    <input
                      type="text"
                      value={collectionForm.imageUrl}
                      onChange={(e) => setCollectionForm({ ...collectionForm, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.png"
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  
                  <button
                    onClick={handleCreateCollection}
                    disabled={creatingCollection}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-600 transition disabled:opacity-50"
                  >
                    {creatingCollection ? 'Creating Collection...' : '🎨 Create Collection'}
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Create Merkle Tree */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">
                Step 2: Create Merkle Tree
              </h2>
              
              {merkleTree ? (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                  <p className="text-green-200 mb-2">✅ Merkle Tree created!</p>
                  <p className="text-white font-mono text-sm break-all">{merkleTree}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-300">
                    Merkle Tree is required for minting compressed NFTs (cNFTs). This will be created with:
                  </p>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Max Depth: 14 (supports 16,384 NFTs)</li>
                    <li>• Max Buffer Size: 64</li>
                  </ul>
                  
                  <button
                    onClick={handleCreateMerkleTree}
                    disabled={creatingTree}
                    className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-3 px-6 rounded-lg hover:from-green-600 hover:to-teal-600 transition disabled:opacity-50"
                  >
                    {creatingTree ? 'Creating Merkle Tree...' : '🌳 Create Merkle Tree'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mint Tab */}
        {activeTab === 'mint' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">
              🎫 Mint Discount NFT
            </h2>

            {!collectionMint || !merkleTree ? (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
                <p className="text-yellow-200">⚠️ Please complete the Setup first (create collection and merkle tree)</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Discount Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">NFT Name</label>
                    <input
                      type="text"
                      value={discountForm.name}
                      onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-white font-medium mb-2">Redemption Code</label>
                    <input
                      type="text"
                      value={discountForm.redemptionCode}
                      onChange={(e) => setDiscountForm({ ...discountForm, redemptionCode: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Description</label>
                  <textarea
                    value={discountForm.description}
                    onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">Discount %</label>
                    <input
                      type="number"
                      value={discountForm.discountPercent}
                      onChange={(e) => {
                        const percent = parseInt(e.target.value) || 0;
                        const discounted = discountForm.originalPrice * (1 - percent / 100);
                        setDiscountForm({ 
                          ...discountForm, 
                          discountPercent: percent,
                          discountedPrice: Math.round(discounted)
                        });
                      }}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-white font-medium mb-2">Original Price ($)</label>
                    <input
                      type="number"
                      value={discountForm.originalPrice}
                      onChange={(e) => {
                        const original = parseInt(e.target.value) || 0;
                        const discounted = original * (1 - discountForm.discountPercent / 100);
                        setDiscountForm({ 
                          ...discountForm, 
                          originalPrice: original,
                          discountedPrice: Math.round(discounted)
                        });
                      }}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-white font-medium mb-2">Discounted Price ($)</label>
                    <input
                      type="number"
                      value={discountForm.discountedPrice}
                      disabled
                      className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-gray-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">Merchant Name</label>
                    <input
                      type="text"
                      value={discountForm.merchantName}
                      onChange={(e) => setDiscountForm({ ...discountForm, merchantName: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-white font-medium mb-2">Category</label>
                    <select
                      value={discountForm.category}
                      onChange={(e) => setDiscountForm({ ...discountForm, category: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    >
                      <option value="Hotel">Hotel</option>
                      <option value="Flight">Flight</option>
                      <option value="Restaurant">Restaurant</option>
                      <option value="Retail">Retail</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">Location</label>
                    <input
                      type="text"
                      value={discountForm.location}
                      onChange={(e) => setDiscountForm({ ...discountForm, location: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-white font-medium mb-2">Expiry Date</label>
                    <input
                      type="date"
                      value={discountForm.expiryDate}
                      onChange={(e) => setDiscountForm({ ...discountForm, expiryDate: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-white font-medium mb-2">Image (Optional)</label>
                  
                  {/* Image Mode Toggle */}
                  <div className="flex gap-4 mb-4">
                    <button
                      onClick={() => setImageMode('file')}
                      className={`px-4 py-2 rounded-lg ${imageMode === 'file' ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300'}`}
                    >
                      📁 Upload File
                    </button>
                    <button
                      onClick={() => setImageMode('url')}
                      className={`px-4 py-2 rounded-lg ${imageMode === 'url' ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300'}`}
                    >
                      🔗 Image URL
                    </button>
                  </div>

                  {/* File Upload */}
                  {imageMode === 'file' && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      />
                      {imageFile && (
                        <p className="text-green-300 text-sm mt-2">✓ {imageFile.name}</p>
                      )}
                    </div>
                  )}

                  {/* URL Input */}
                  {imageMode === 'url' && (
                    <div>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.png"
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      />
                      {imageUrl && (
                        <div className="mt-2">
                          <p className="text-green-300 text-sm">✓ Image URL set</p>
                          <img 
                            src={imageUrl} 
                            alt="Preview" 
                            className="mt-2 w-32 h-32 object-cover rounded-lg border border-white/20"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Recipient Mode */}
                <div>
                  <label className="block text-white font-medium mb-2">Send To:</label>
                  <div className="flex gap-4 mb-4">
                    <button
                      onClick={() => setRecipientMode('single')}
                      className={`px-4 py-2 rounded-lg ${recipientMode === 'single' ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300'}`}
                    >
                      Single Address
                    </button>
                    <button
                      onClick={() => setRecipientMode('multiple')}
                      className={`px-4 py-2 rounded-lg ${recipientMode === 'multiple' ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300'}`}
                    >
                      Multiple Addresses
                    </button>
                    <button
                      onClick={() => setRecipientMode('self')}
                      className={`px-4 py-2 rounded-lg ${recipientMode === 'self' ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300'}`}
                    >
                      Send to Self
                    </button>
                  </div>

                  {recipientMode === 'single' && (
                    <input
                      type="text"
                      value={singleRecipient}
                      onChange={(e) => setSingleRecipient(e.target.value)}
                      placeholder="Enter wallet address"
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  )}

                  {recipientMode === 'multiple' && (
                    <textarea
                      value={multipleRecipients}
                      onChange={(e) => setMultipleRecipients(e.target.value)}
                      placeholder="Enter wallet addresses (one per line)"
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      rows={5}
                    />
                  )}

                  {recipientMode === 'self' && (
                    <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                      <p className="text-blue-200">NFT will be sent to: {currentUser.publicKey}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleMintNFT}
                    disabled={mintingNFT}
                    className="bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-4 px-6 rounded-lg hover:from-green-600 hover:to-blue-600 transition disabled:opacity-50"
                  >
                    {mintingNFT ? 'Minting... (this may take a while)' : '🎫 Mint NFT'}
                  </button>
                  
                  <button
                    onClick={handleAddToMarketplace}
                    disabled={addingToMarketplace || !collectionMint || !merkleTree}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-lg hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
                  >
                    {addingToMarketplace ? 'Adding to Marketplace...' : '🛒 Add to Marketplace'}
                  </button>
                </div>

                {/* Marketplace Info */}
                <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mt-4">
                  <h4 className="text-white font-bold mb-2">🛒 Marketplace Integration</h4>
                  <p className="text-sm text-gray-300 mb-2">
                    Click "Add to Marketplace" to make your collection discoverable by users. 
                    Users will be able to browse and claim your discount NFTs directly from the marketplace.
                  </p>
                  <div className="text-xs text-gray-400">
                    <p>• Collection: {collectionMint ? '✅ Created' : '❌ Not created'}</p>
                    <p>• Merkle Tree: {merkleTree ? '✅ Created' : '❌ Not created'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Collections Tab */}
        {activeTab === 'collections' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">
              📚 My Collections
            </h2>

            {loadingCollections ? (
              <p className="text-white">Loading collections...</p>
            ) : myCollections.length === 0 ? (
              <p className="text-gray-300">No collections found. Create one in the Setup tab!</p>
            ) : (
              <div className="grid gap-4">
                {myCollections.map((collection, idx) => (
                  <div key={idx} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h3 className="text-white font-bold mb-2">{collection.content?.metadata?.name || 'Unknown'}</h3>
                    <p className="text-gray-300 text-sm mb-2">{collection.content?.metadata?.description || 'No description'}</p>
                    <p className="text-gray-400 text-xs font-mono">{collection.id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

