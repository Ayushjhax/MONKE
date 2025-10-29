'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatRating } from '@/lib/social-helpers';

interface RatingWidgetProps {
  dealId: string;
  dealType: string;
  initialStats?: {
    avg_rating: number;
    rating_count: number;
  };
  onRatingUpdate?: (newStats: { avg_rating: number; rating_count: number }) => void;
}

export default function RatingWidget({ 
  dealId, 
  dealType, 
  initialStats,
  onRatingUpdate 
}: RatingWidgetProps) {
  const { publicKey } = useWallet();
  const [avgRating, setAvgRating] = useState(initialStats?.avg_rating || 0);
  const [ratingCount, setRatingCount] = useState(initialStats?.rating_count || 0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (publicKey) {
      fetchUserRating();
    }
  }, [publicKey, dealId]);

  const fetchUserRating = async () => {
    try {
      const response = await fetch(
        `/api/social/rate?dealId=${dealId}&userWallet=${publicKey?.toBase58()}`
      );
      const data = await response.json();
      if (data.userRating) {
        setUserRating(data.userRating.rating);
        setReviewText(data.userRating.review_text || '');
      }
    } catch (error) {
      console.error('Error fetching user rating:', error);
    }
  };

  const handleRatingClick = async (rating: number) => {
    if (!publicKey) {
      setError('Please connect your wallet to rate');
      return;
    }

    if (rating === userRating) {
      setShowReviewForm(!showReviewForm);
      return;
    }

    setUserRating(rating);
    setShowReviewForm(true);
  };

  const handleSubmitRating = async () => {
    if (!publicKey || !userRating) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/social/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          dealType,
          userWallet: publicKey.toBase58(),
          rating: userRating,
          reviewText: reviewText.trim() || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit rating');
      }

      setAvgRating(data.stats.avg_rating);
      setRatingCount(data.stats.rating_count);
      setShowReviewForm(false);

      if (onRatingUpdate) {
        onRatingUpdate(data.stats);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoverRating || userRating || 0;

  return (
    <div className="space-y-3">
      {/* Average Rating Display */}
      <div className="flex items-center gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">
            {avgRating > 0 ? formatRating(avgRating) : '—'}
          </span>
          <span className="text-gray-500">
            ({ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'})
          </span>
        </div>
      </div>

      {/* Star Rating Input */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRatingClick(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(null)}
              className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded"
              disabled={!publicKey}
              aria-label={`Rate ${star} stars`}
            >
              <svg
                className={`w-8 h-8 ${
                  star <= displayRating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-200 text-gray-200'
                } transition-colors`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </button>
          ))}
        </div>
        {userRating && (
          <span className="text-sm text-purple-600 font-medium">
            Your rating: {userRating}★
          </span>
        )}
      </div>

      {/* Review Form */}
      {showReviewForm && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Write a review (optional, max 500 characters)"
            maxLength={500}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-500"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {reviewText.length}/500
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowReviewForm(false);
                  setReviewText('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={isSubmitting || !userRating}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Connect Wallet Prompt */}
      {!publicKey && (
        <p className="text-sm text-gray-500">
          Connect your wallet to rate this deal
        </p>
      )}
    </div>
  );
}

