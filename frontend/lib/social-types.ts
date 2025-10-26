// TypeScript types for social discovery layer

export interface DealRating {
  id: number;
  deal_id: string;
  deal_type: 'flight' | 'hotel' | 'collection';
  user_wallet: string;
  rating: number;
  review_text?: string;
  created_at: string;
  updated_at: string;
}

export interface DealVote {
  id: number;
  deal_id: string;
  deal_type: string;
  user_wallet: string;
  vote_type: 'up' | 'down';
  created_at: string;
}

export interface DealComment {
  id: number;
  deal_id: string;
  deal_type: string;
  user_wallet: string;
  parent_comment_id?: number;
  comment_text: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
  deleted: boolean;
  // Extended properties from joins
  display_name?: string;
  avatar_url?: string;
  reputation_level?: string;
  user_vote?: 'up' | 'down';
  replies?: DealComment[];
}

export interface CommentVote {
  id: number;
  comment_id: number;
  user_wallet: string;
  vote_type: 'up' | 'down';
  created_at: string;
}

export interface DealShare {
  id: number;
  deal_id: string;
  deal_type: string;
  user_wallet: string;
  platform: string;
  created_at: string;
}

export interface DealSocialStats {
  deal_id: string;
  deal_type: string;
  avg_rating: number;
  rating_count: number;
  comment_count: number;
  upvote_count: number;
  downvote_count: number;
  share_count: number;
  hotness_score: number;
  last_updated: string;
  // User-specific fields
  user_rating?: number;
  user_vote?: 'up' | 'down';
}

export interface UserSocialProfile {
  user_wallet: string;
  display_name?: string;
  avatar_url?: string;
  reputation_points: number;
  reputation_level: ReputationLevel;
  badges: Badge[];
  created_at: string;
  updated_at: string;
}

export type ReputationLevel = 'Newbie' | 'Explorer' | 'Contributor' | 'Expert' | 'Legend';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

export interface SocialActivity {
  id: number;
  user_wallet: string;
  activity_type: ActivityType;
  deal_id?: string;
  deal_type?: string;
  metadata?: Record<string, any>;
  created_at: string;
  // Extended from joins
  display_name?: string;
  avatar_url?: string;
  reputation_level?: string;
}

export type ActivityType = 
  | 'rated_deal' 
  | 'commented' 
  | 'replied' 
  | 'upvoted_deal' 
  | 'shared_deal' 
  | 'booked_deal'
  | 'earned_badge';

export interface UserNotification {
  id: number;
  user_wallet: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export type NotificationType = 
  | 'comment_reply' 
  | 'comment_upvoted' 
  | 'deal_popular' 
  | 'badge_earned';

export interface CommentSortOption {
  label: string;
  value: 'newest' | 'oldest' | 'top';
}

export const COMMENT_SORT_OPTIONS: CommentSortOption[] = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Top Voted', value: 'top' }
];

export const REPUTATION_LEVELS: Record<ReputationLevel, { min: number; max: number; color: string }> = {
  'Newbie': { min: 0, max: 10, color: '#9ca3af' },
  'Explorer': { min: 11, max: 50, color: '#60a5fa' },
  'Contributor': { min: 51, max: 100, color: '#34d399' },
  'Expert': { min: 101, max: 250, color: '#f59e0b' },
  'Legend': { min: 251, max: Infinity, color: '#a855f7' }
};

export const BADGE_DEFINITIONS: Record<string, Omit<Badge, 'earned_at'>> = {
  'first-rating': {
    id: 'first-rating',
    name: 'First Rating',
    description: 'Rated your first deal',
    icon: '⭐'
  },
  'social-butterfly': {
    id: 'social-butterfly',
    name: 'Social Butterfly',
    description: 'Posted 10 comments',
    icon: '🦋'
  },
  'deal-hunter': {
    id: 'deal-hunter',
    name: 'Deal Hunter',
    description: 'Shared 5 deals',
    icon: '🎯'
  },
  'trusted-reviewer': {
    id: 'trusted-reviewer',
    name: 'Trusted Reviewer',
    description: 'Gave 25 ratings',
    icon: '✅'
  },
  'community-leader': {
    id: 'community-leader',
    name: 'Community Leader',
    description: 'Reached 100 reputation points',
    icon: '👑'
  },
  'viral': {
    id: 'viral',
    name: 'Viral',
    description: 'Shared deal got 50+ upvotes',
    icon: '🔥'
  }
};

export const REPUTATION_POINTS = {
  RATE_DEAL: 2,
  COMMENT: 3,
  COMMENT_UPVOTED: 5,
  SHARE_DEAL: 1
};

