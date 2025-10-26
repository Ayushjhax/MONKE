'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DealSocialStats } from '@/lib/social-types';
import { formatRating, formatVoteCount } from '@/lib/social-helpers';

interface TrendingSectionProps {
  limit?: number;
  dealType?: 'flight' | 'hotel';
}

export default function TrendingSection({ limit = 10, dealType }: TrendingSectionProps) {
  const [trending, setTrending] = useState<DealSocialStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTrending();
  }, [dealType]);

  const fetchTrending = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ limit: limit.toString() });
      if (dealType) params.append('dealType', dealType);

      const response = await fetch(`/api/social/trending?${params}`);
      const data = await response.json();

      if (response.ok) {
        setTrending(data.trending);
      }
    } catch (error) {
      console.error('Error fetching trending deals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse p-4 bg-gray-50 rounded-lg">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (trending.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No trending deals yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {trending.map((deal, index) => {
        // Safely convert database values to numbers (PostgreSQL may return as strings)
        const avgRating = typeof deal.avg_rating === 'string' ? parseFloat(deal.avg_rating) : deal.avg_rating;
        const ratingCount = typeof deal.rating_count === 'string' ? parseInt(deal.rating_count) : deal.rating_count;
        const commentCount = typeof deal.comment_count === 'string' ? parseInt(deal.comment_count) : deal.comment_count;
        const upvoteCount = typeof deal.upvote_count === 'string' ? parseInt(deal.upvote_count) : deal.upvote_count;
        const downvoteCount = typeof deal.downvote_count === 'string' ? parseInt(deal.downvote_count) : deal.downvote_count;
        const shareCount = typeof deal.share_count === 'string' ? parseInt(deal.share_count) : deal.share_count;
        const hotnessScore = typeof deal.hotness_score === 'string' ? parseFloat(deal.hotness_score) : deal.hotness_score;

        const netVotes = upvoteCount - downvoteCount;

        return (
          <Link
            key={deal.deal_id}
            href={`/deal/${deal.deal_id}?type=${deal.deal_type}`}
            className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Rank Badge */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-white font-bold text-sm">
                    #{index + 1}
                  </span>
                  <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold">
                    🔥 HOT
                  </span>
                </div>

                {/* Deal Type */}
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  {deal.deal_type}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  {avgRating > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">⭐</span>
                      <span className="font-medium">{formatRating(avgRating)}</span>
                      <span className="text-gray-500">({ratingCount})</span>
                    </div>
                  )}
                  
                  {commentCount > 0 && (
                    <div className="flex items-center gap-1">
                      <span>💬</span>
                      <span>{commentCount}</span>
                    </div>
                  )}
                  
                  {netVotes > 0 && (
                    <div className="flex items-center gap-1">
                      <span>👍</span>
                      <span>{formatVoteCount(netVotes)}</span>
                    </div>
                  )}

                  {shareCount > 0 && (
                    <div className="flex items-center gap-1">
                      <span>🔗</span>
                      <span>{shareCount}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Hotness Score */}
              <div className="text-right">
                <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                  {hotnessScore.toFixed(0)}
                </div>
                <div className="text-xs text-gray-500">
                  hotness
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

