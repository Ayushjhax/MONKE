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

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('Copied to clipboard:', text);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
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
        imageMode === 'file' ? (imageFile ?? undefined) : undefined,
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
          <span className="text-gray-600 font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Merchant</h1>
              <p className="text-sm text-gray-500">Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('setup')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'setup'
                ? 'bg-black text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span className="text-lg">⚙️</span>
            <span>Setup</span>
          </button>
          
          <button
            onClick={() => setActiveTab('mint')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'mint'
                ? 'bg-black text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span className="text-lg">🎫</span>
            <span>Mint NFTs</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('collections');
              handleLoadCollections();
            }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'collections'
                ? 'bg-black text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span className="text-lg">📚</span>
            <span>Collections</span>
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="text-center">
              <p className="font-medium text-gray-900">{currentUser.username}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <p className="text-sm text-gray-500 font-mono">
                  {currentUser.publicKey.slice(0, 8)}...{currentUser.publicKey.slice(-8)}
                </p>
                <button
                  onClick={() => copyToClipboard(currentUser.publicKey)}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs transition-colors"
                  title="Copy full wallet address"
                >
                  📋
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <button
                onClick={handleDownloadKeypair}
                className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Download Key
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {activeTab === 'setup' && 'Create NFT Collection'}
                {activeTab === 'mint' && 'Mint Discount NFT'}
                {activeTab === 'collections' && 'My Collections'}
              </h2>
              <p className="text-gray-500 mt-1">
                {activeTab === 'setup' && 'Set up your collection and merkle tree'}
                {activeTab === 'mint' && 'Create and distribute discount NFTs'}
                {activeTab === 'collections' && 'Manage your NFT collections'}
              </p>
            </div>
            <Link 
              href="/" 
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}

          {/* Setup Tab */}
          {activeTab === 'setup' && (
            <div className="max-w-4xl space-y-6">
              {/* Step 1: Collection Details */}
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Step 1: Collection Details</h3>
                  {collectionMint && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span className="text-sm font-medium">Created</span>
                    </div>
                  )}
                </div>
                
                {collectionMint ? (
                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm">✓</span>
                      </div>
                      <h4 className="font-medium text-gray-900">Collection Created Successfully</h4>
                    </div>
                    <p className="text-sm text-gray-600 font-mono break-all bg-gray-50 p-3 rounded-lg">
                      {collectionMint}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Collection Name</label>
                        <input
                          type="text"
                          value={collectionForm.name}
                          onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                          placeholder="Enter collection name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
                        <input
                          type="text"
                          value={collectionForm.symbol}
                          onChange={(e) => setCollectionForm({ ...collectionForm, symbol: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                          placeholder="Enter symbol"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={collectionForm.description}
                        onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                        rows={3}
                        placeholder="Describe your collection"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                      <input
                        type="url"
                        value={collectionForm.imageUrl}
                        onChange={(e) => setCollectionForm({ ...collectionForm, imageUrl: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                        placeholder="https://example.com/image.png"
                      />
                    </div>
                    
                    <button
                      onClick={handleCreateCollection}
                      disabled={creatingCollection}
                      className="w-full bg-black text-white font-semibold py-4 px-6 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingCollection ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Creating Collection...</span>
                        </div>
                      ) : (
                        'Create Collection'
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Merkle Tree */}
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Step 2: Merkle Tree</h3>
                  {merkleTree && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span className="text-sm font-medium">Ready</span>
                    </div>
                  )}
                </div>
                
                {merkleTree ? (
                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm">✓</span>
                      </div>
                      <h4 className="font-medium text-gray-900">Merkle Tree Created Successfully</h4>
                    </div>
                    <p className="text-sm text-gray-600 font-mono break-all bg-gray-50 p-3 rounded-lg">
                      {merkleTree}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-3">Configuration</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Max Depth</span>
                          <span className="text-sm font-medium text-gray-900">14</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Max Buffer Size</span>
                          <span className="text-sm font-medium text-gray-900">64</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Max NFTs</span>
                          <span className="text-sm font-medium text-gray-900">16,384</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleCreateMerkleTree}
                      disabled={creatingTree}
                      className="w-full bg-green-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingTree ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Creating Merkle Tree...</span>
                        </div>
                      ) : (
                        'Create Merkle Tree'
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Status Overview */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Setup Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                      collectionMint ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <span className={`text-lg ${collectionMint ? 'text-green-600' : 'text-gray-400'}`}>
                        {collectionMint ? '✓' : '1'}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900">Collection</h4>
                    <p className={`text-sm ${collectionMint ? 'text-green-600' : 'text-gray-500'}`}>
                      {collectionMint ? 'Created' : 'Pending'}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                      merkleTree ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <span className={`text-lg ${merkleTree ? 'text-green-600' : 'text-gray-400'}`}>
                        {merkleTree ? '✓' : '2'}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900">Merkle Tree</h4>
                    <p className={`text-sm ${merkleTree ? 'text-green-600' : 'text-gray-500'}`}>
                      {merkleTree ? 'Ready' : 'Pending'}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                      collectionMint && merkleTree ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <span className={`text-lg ${collectionMint && merkleTree ? 'text-green-600' : 'text-gray-400'}`}>
                        {collectionMint && merkleTree ? '✓' : '3'}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900">Ready to Mint</h4>
                    <p className={`text-sm ${collectionMint && merkleTree ? 'text-green-600' : 'text-gray-500'}`}>
                      {collectionMint && merkleTree ? 'Complete' : 'Pending'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mint Tab */}
          {activeTab === 'mint' && (
            <div className="max-w-4xl">
              {!collectionMint || !merkleTree ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-yellow-600 text-sm">⚠</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-yellow-800">Setup Required</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Please complete the Setup first (create collection and merkle tree)
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">Mint Discount NFT</h3>
                  
                  <div className="space-y-6">
                    {/* Basic Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          NFT Name
                          <span className="text-xs text-gray-500 ml-2">
                            ({discountForm.name.length}/32 characters)
                          </span>
                        </label>
                        <input
                          type="text"
                          value={discountForm.name}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length <= 32) {
                              setDiscountForm({ ...discountForm, name: value });
                            }
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                          maxLength={32}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Redemption Code</label>
                        <input
                          type="text"
                          value={discountForm.redemptionCode}
                          onChange={(e) => setDiscountForm({ ...discountForm, redemptionCode: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={discountForm.description}
                        onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                        rows={3}
                      />
                    </div>

                    {/* Pricing */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Discount %</label>
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Original Price ($)</label>
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Discounted Price ($)</label>
                        <input
                          type="number"
                          value={discountForm.discountedPrice}
                          disabled
                          className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl text-gray-500"
                        />
                      </div>
                    </div>

                    {/* Merchant & Category */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Merchant Name</label>
                        <input
                          type="text"
                          value={discountForm.merchantName}
                          onChange={(e) => setDiscountForm({ ...discountForm, merchantName: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <select
                          value={discountForm.category}
                          onChange={(e) => setDiscountForm({ ...discountForm, category: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all text-black"
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

                    {/* Location & Expiry */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                        <input
                          type="text"
                          value={discountForm.location}
                          onChange={(e) => setDiscountForm({ ...discountForm, location: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                        <input
                          type="date"
                          value={discountForm.expiryDate}
                          onChange={(e) => setDiscountForm({ ...discountForm, expiryDate: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all text-black"
                        />
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Image (Optional)</label>
                      
                      <div className="flex space-x-3 mb-4">
                        <button
                          onClick={() => setImageMode('file')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            imageMode === 'file' 
                              ? 'bg-black text-white' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Upload File
                        </button>
                        <button
                          onClick={() => setImageMode('url')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            imageMode === 'url' 
                              ? 'bg-black text-white' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Image URL
                        </button>
                      </div>

                      {imageMode === 'file' && (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                          />
                          {imageFile && (
                            <p className="text-green-600 text-sm mt-2">✓ {imageFile.name}</p>
                          )}
                        </div>
                      )}

                      {imageMode === 'url' && (
                        <div>
                          <input
                            type="url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://example.com/image.png"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                          />
                          {imageUrl && (
                            <div className="mt-3">
                              <p className="text-green-600 text-sm mb-2">✓ Image URL set</p>
                              <img 
                                src={imageUrl} 
                                alt="Preview" 
                                className="w-32 h-32 object-cover rounded-xl border border-gray-200"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Recipients */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Send To:</label>
                      
                      <div className="flex space-x-3 mb-4">
                        <button
                          onClick={() => setRecipientMode('single')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            recipientMode === 'single' 
                              ? 'bg-black text-white' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Single Address
                        </button>
                        <button
                          onClick={() => setRecipientMode('multiple')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            recipientMode === 'multiple' 
                              ? 'bg-black text-white' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Multiple Addresses
                        </button>
                        <button
                          onClick={() => setRecipientMode('self')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            recipientMode === 'self' 
                              ? 'bg-black text-white' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                        />
                      )}

                      {recipientMode === 'multiple' && (
                        <textarea
                          value={multipleRecipients}
                          onChange={(e) => setMultipleRecipients(e.target.value)}
                          placeholder="Enter wallet addresses (one per line)"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                          rows={5}
                        />
                      )}

                      {recipientMode === 'self' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <p className="text-blue-800 text-sm">
                            NFT will be sent to: <span className="font-mono">{currentUser.publicKey}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-gray-200">
                      <button
                        onClick={handleMintNFT}
                        disabled={mintingNFT}
                        className="bg-black text-white font-semibold py-4 px-6 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {mintingNFT ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Minting...</span>
                          </div>
                        ) : (
                          'Mint NFT'
                        )}
                      </button>
                      
                      <button
                        onClick={handleAddToMarketplace}
                        disabled={addingToMarketplace || !collectionMint || !merkleTree}
                        className="bg-purple-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingToMarketplace ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Adding...</span>
                          </div>
                        ) : (
                          'Add to Marketplace'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Collections Tab */}
          {activeTab === 'collections' && (
            <div className="max-w-4xl">
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">My Collections</h3>

                {loadingCollections ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                      <span className="text-gray-600">Loading collections...</span>
                    </div>
                  </div>
                ) : myCollections.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-gray-400 text-2xl">📚</span>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No collections found</h4>
                    <p className="text-gray-500 mb-6">Create your first collection in the Setup tab!</p>
                    <button
                      onClick={() => setActiveTab('setup')}
                      className="bg-black text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors"
                    >
                      Go to Setup
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {myCollections.map((collection, idx) => (
                      <div key={idx} className="bg-white rounded-xl p-6 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">
                              {collection.content?.metadata?.name || 'Unknown Collection'}
                            </h4>
                            <p className="text-gray-600 mb-3">
                              {collection.content?.metadata?.description || 'No description available'}
                            </p>
                            <p className="text-sm text-gray-500 font-mono">
                              {collection.id}
                            </p>
                          </div>
                          <div className="ml-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                              <span className="text-gray-400 text-lg">🎨</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}