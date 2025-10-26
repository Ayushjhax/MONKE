'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SocialActivity, ActivityType } from '@/lib/social-types';
import { formatTimeAgo } from '@/lib/social-helpers';

interface ActivityFeedProps {
  userWallet?: string;
  activityType?: ActivityType;
  limit?: number;
}

export default function ActivityFeed({
  userWallet,
  activityType,
  limit = 20
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<SocialActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [userWallet, activityType]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      if (userWallet) params.append('userWallet', userWallet);
      if (activityType) params.append('activityType', activityType);

      const response = await fetch(`/api/social/activity?${params}`);
      const data = await response.json();

      if (response.ok) {
        setActivities(data.activities);
        setHasMore(data.activities.length >= limit);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'rated_deal': return '⭐';
      case 'commented': return '💬';
      case 'replied': return '↩️';
      case 'upvoted_deal': return '👍';
      case 'shared_deal': return '🔗';
      case 'booked_deal': return '✈️';
      case 'earned_badge': return '🏆';
      default: return '📌';
    }
  };

  const getActivityText = (activity: SocialActivity) => {
    const userName = activity.display_name || 
      `${activity.user_wallet.slice(0, 4)}...${activity.user_wallet.slice(-4)}`;

    switch (activity.activity_type) {
      case 'rated_deal':
        const rating = activity.metadata?.rating || 0;
        return `${userName} rated a ${activity.deal_type} deal ${rating}★`;
      case 'commented':
        return `${userName} commented on a ${activity.deal_type} deal`;
      case 'replied':
        return `${userName} replied to a comment`;
      case 'upvoted_deal':
        return `${userName} upvoted a ${activity.deal_type} deal`;
      case 'shared_deal':
        return `${userName} shared a ${activity.deal_type} deal`;
      case 'booked_deal':
        return `${userName} booked a ${activity.deal_type}`;
      case 'earned_badge':
        return `${userName} earned the "${activity.metadata?.badge}" badge`;
      default:
        return `${userName} performed an action`;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {/* Icon/Avatar */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
              {activity.display_name?.[0]?.toUpperCase() || activity.user_wallet.slice(0, 2)}
            </div>
          </div>

          {/* Activity Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <span className="text-lg">{getActivityIcon(activity.activity_type)}</span>
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  {getActivityText(activity)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatTimeAgo(activity.created_at)}
                </p>
              </div>
            </div>

            {/* Link to Deal */}
            {activity.deal_id && activity.deal_type && (
              <Link
                href={`/deal/${activity.deal_id}?type=${activity.deal_type}`}
                className="text-sm text-purple-600 hover:text-purple-700 mt-2 inline-block"
              >
                View Deal →
              </Link>
            )}
          </div>

          {/* Reputation Badge */}
          {activity.reputation_level && (
            <div className="flex-shrink-0">
              <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-600">
                {activity.reputation_level}
              </span>
            </div>
          )}
        </div>
      ))}

      {/* Load More */}
      {hasMore && (
        <button
          onClick={() => {
            setOffset(offset + limit);
            fetchActivities();
          }}
          className="w-full py-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          Load More
        </button>
      )}
    </div>
  );
}

