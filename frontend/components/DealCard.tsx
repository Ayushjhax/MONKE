'use client';

import { useState } from 'react';
import { Collection } from '@/lib/db';

interface DealCardProps {
  collection: Collection;
  userWallet: string;
  onMintSuccess: () => void;
}

export default function DealCard({ collection, userWallet, onMintSuccess }: DealCardProps) {
  const [isMinting, setIsMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [hasClaimed, setHasClaimed] = useState(false);

  const getImageUrl = (category: string) => {
    switch (category.toLowerCase()) {
      case 'flight':
        return 'https://ayushjhax.github.io/flight-discount.png';
      case 'hotel':
        return 'https://ayushjhax.github.io/hotel-discount.jpg';
      case 'restaurant':
        return 'https://ayushjhax.github.io/restaurant-discount.jpg';
      default:
        return collection.image_url || 'https://ayushjhax.github.io/restaurant-discount.jpg';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'flight':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      case 'hotel':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'restaurant':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        );
    }
  };

  const handleMint = async () => {
    if (!userWallet) {
      setErrorMessage('Please connect your wallet first');
      setMintStatus('error');
      return;
    }

    if (hasClaimed) {
      setErrorMessage('You have already claimed this NFT');
      setMintStatus('error');
      return;
    }

    setIsMinting(true);
    setMintStatus('idle');
    setErrorMessage('');

    try {
      // Process mint request immediately

      const response = await fetch('/api/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collectionId: collection.id,
          userWallet: userWallet,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMintStatus('success');
        setHasClaimed(true);
        onMintSuccess();
      } else {
        setErrorMessage(data.error || 'Failed to mint NFT');
        setMintStatus('error');
      }
    } catch (error) {
      setErrorMessage('Network error. Please try again.');
      setMintStatus('error');
      console.error('Mint error:', error);
    } finally {
      setIsMinting(false);
    }
  };

  const savings = Number(collection.original_price) - Number(collection.discounted_price);
  const isExpired = new Date(collection.expiry_date) < new Date();
  const isFullyRedeemed = false; // Unlimited minting - never fully redeemed

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Image */}
      <div className="relative h-48 bg-gray-200">
        <img
          src={getImageUrl(collection.category)}
          alt={collection.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4">
          <div className="flex items-center space-x-1 bg-white bg-opacity-90 px-2 py-1 rounded-full text-sm font-medium text-gray-700">
            {getCategoryIcon(collection.category)}
            <span className="capitalize">{collection.category}</span>
          </div>
        </div>
        <div className="absolute top-4 right-4">
          <div className="bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">
            {collection.discount_percent}% OFF
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {collection.name}
          </h3>
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {collection.description}
        </p>

        <div className="flex items-center text-sm text-gray-500 mb-3">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{collection.location}</span>
        </div>

        <div className="flex items-center text-sm text-gray-500 mb-4">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>{collection.merchant_name}</span>
        </div>

        {/* Pricing */}
        <div className="mb-4">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              ${Number(collection.discounted_price).toFixed(2)}
            </span>
            <span className="text-lg text-gray-500 line-through">
              ${Number(collection.original_price).toFixed(2)}
            </span>
          </div>
          <p className="text-sm text-green-600 font-medium">
            Save ${savings.toFixed(2)}
          </p>
        </div>

        {/* Status */}
        <div className="mb-4">
          {isExpired ? (
            <div className="text-sm text-red-600 font-medium">
              Expired
            </div>
          ) : hasClaimed ? (
            <div className="text-sm text-green-600 font-medium">
              ✅ You've claimed this NFT
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              Available to claim
            </div>
          )}
        </div>

        {/* Mint Button */}
        <button
          onClick={handleMint}
          disabled={isMinting || isExpired || hasClaimed || !userWallet}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            isMinting || isExpired || hasClaimed || !userWallet
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : mintStatus === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isMinting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Minting NFT...
            </div>
          ) : mintStatus === 'success' ? (
            <div className="flex items-center justify-center">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Minted!
            </div>
          ) : isExpired ? (
            'Expired'
          ) : hasClaimed ? (
            'Already Claimed'
          ) : !userWallet ? (
            'Connect Wallet'
          ) : (
            'Claim NFT'
          )}
        </button>

        {/* Error Message */}
        {mintStatus === 'error' && errorMessage && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
            {errorMessage}
          </div>
        )}

        {/* Success Message */}
        {mintStatus === 'success' && (
          <div className="mt-3 text-sm text-green-600 bg-green-50 p-2 rounded">
            NFT minted successfully! Check your wallet.
          </div>
        )}
      </div>
    </div>
  );
}
