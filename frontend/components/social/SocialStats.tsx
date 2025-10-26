'use client';

import { formatRating, formatVoteCount } from '@/lib/social-helpers';

interface SocialStatsProps {
  avgRating?: number;
  ratingCount?: number;
  commentCount?: number;
  upvoteCount?: number;
  downvoteCount?: number;
  shareCount?: number;
  isHot?: boolean;
  compact?: boolean;
}

export default function SocialStats({
  avgRating = 0,
  ratingCount = 0,
  commentCount = 0,
  upvoteCount = 0,
  downvoteCount = 0,
  shareCount = 0,
  isHot = false,
  compact = false
}: SocialStatsProps) {
  // Safely convert to numbers (database may return strings)
  const safeAvgRating = typeof avgRating === 'number' ? avgRating : parseFloat(avgRating as any) || 0;
  const safeRatingCount = typeof ratingCount === 'number' ? ratingCount : parseInt(ratingCount as any) || 0;
  const safeCommentCount = typeof commentCount === 'number' ? commentCount : parseInt(commentCount as any) || 0;
  const safeUpvoteCount = typeof upvoteCount === 'number' ? upvoteCount : parseInt(upvoteCount as any) || 0;
  const safeDownvoteCount = typeof downvoteCount === 'number' ? downvoteCount : parseInt(downvoteCount as any) || 0;
  const safeShareCount = typeof shareCount === 'number' ? shareCount : parseInt(shareCount as any) || 0;
  
  const netVotes = safeUpvoteCount - safeDownvoteCount;

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm text-gray-600">
        {safeAvgRating > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-yellow-500">⭐</span>
            <span className="font-medium">{formatRating(safeAvgRating)}</span>
            <span className="text-gray-400">({safeRatingCount})</span>
          </div>
        )}
        
        {safeCommentCount > 0 && (
          <div className="flex items-center gap-1">
            <span>💬</span>
            <span>{safeCommentCount}</span>
          </div>
        )}
        
        {netVotes > 0 && (
          <div className="flex items-center gap-1">
            <span>👍</span>
            <span>{formatVoteCount(netVotes)}</span>
          </div>
        )}

        {isHot && (
          <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-bold">
            🔥 HOT
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Rating */}
      <div className="flex flex-col items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-2xl">⭐</span>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">
            {safeAvgRating > 0 ? formatRating(safeAvgRating) : '—'}
          </div>
          <div className="text-xs text-gray-500">
            {safeRatingCount} {safeRatingCount === 1 ? 'rating' : 'ratings'}
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-2xl">💬</span>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">
            {safeCommentCount}
          </div>
          <div className="text-xs text-gray-500">
            {safeCommentCount === 1 ? 'comment' : 'comments'}
          </div>
        </div>
      </div>

      {/* Votes */}
      <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-2xl">👍</span>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">
            {netVotes >= 0 ? '+' : ''}{formatVoteCount(netVotes)}
          </div>
          <div className="text-xs text-gray-500">
            {safeUpvoteCount} up / {safeDownvoteCount} down
          </div>
        </div>
      </div>

      {/* Shares */}
      <div className="flex flex-col items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-2xl">🔗</span>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">
            {safeShareCount}
          </div>
          <div className="text-xs text-gray-500">
            {safeShareCount === 1 ? 'share' : 'shares'}
          </div>
        </div>
      </div>
    </div>
  );
}

