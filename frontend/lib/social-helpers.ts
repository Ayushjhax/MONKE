// Helper functions for social discovery layer

import { 
  DealSocialStats, 
  ReputationLevel, 
  REPUTATION_LEVELS,
  REPUTATION_POINTS,
  Badge,
  BADGE_DEFINITIONS
} from './social-types';

/**
 * Calculate hotness score for trending algorithm
 * Formula:
 * - Average rating (weight: 30%)
 * - Number of upvotes (weight: 25%)
 * - Comment count (weight: 20%)
 * - Share count (weight: 15%)
 * - Recency (weight: 10%)
 */
export function calculateHotnessScore(
  stats: DealSocialStats,
  createdAt: Date
): number {
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  
  // Convert database values to numbers (PostgreSQL may return as strings)
  const avgRating = typeof stats.avg_rating === 'string' ? parseFloat(stats.avg_rating) : stats.avg_rating;
  const upvoteCount = typeof stats.upvote_count === 'string' ? parseInt(stats.upvote_count) : stats.upvote_count;
  const commentCount = typeof stats.comment_count === 'string' ? parseInt(stats.comment_count) : stats.comment_count;
  const shareCount = typeof stats.share_count === 'string' ? parseInt(stats.share_count) : stats.share_count;
  
  // Normalize values to 0-100 scale
  const ratingScore = (avgRating / 5) * 100;
  const upvoteScore = Math.min(upvoteCount * 2, 100); // Max 100 at 50 upvotes
  const commentScore = Math.min(commentCount * 5, 100); // Max 100 at 20 comments
  const shareScore = Math.min(shareCount * 10, 100); // Max 100 at 10 shares
  
  // Recency decay: 100 points for brand new, decays over 7 days
  const recencyScore = Math.max(0, 100 - (hoursSinceCreation / 168) * 100);
  
  // Apply weights
  const hotnessScore = 
    (ratingScore * 0.30) +
    (upvoteScore * 0.25) +
    (commentScore * 0.20) +
    (shareScore * 0.15) +
    (recencyScore * 0.10);
  
  return Math.round(hotnessScore * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate user reputation level based on points
 */
export function calculateReputationLevel(points: number): ReputationLevel {
  if (points >= REPUTATION_LEVELS.Legend.min) return 'Legend';
  if (points >= REPUTATION_LEVELS.Expert.min) return 'Expert';
  if (points >= REPUTATION_LEVELS.Contributor.min) return 'Contributor';
  if (points >= REPUTATION_LEVELS.Explorer.min) return 'Explorer';
  return 'Newbie';
}

/**
 * Get next reputation level and progress
 */
export function getReputationProgress(points: number): {
  currentLevel: ReputationLevel;
  nextLevel?: ReputationLevel;
  pointsToNext?: number;
  progressPercent: number;
} {
  const currentLevel = calculateReputationLevel(points);
  const currentLevelData = REPUTATION_LEVELS[currentLevel];
  
  if (currentLevel === 'Legend') {
    return {
      currentLevel,
      progressPercent: 100
    };
  }
  
  const nextLevel = Object.keys(REPUTATION_LEVELS).find(
    level => REPUTATION_LEVELS[level as ReputationLevel].min > points
  ) as ReputationLevel | undefined;
  
  if (!nextLevel) {
    return {
      currentLevel,
      progressPercent: 100
    };
  }
  
  const nextLevelData = REPUTATION_LEVELS[nextLevel];
  const pointsInCurrentLevel = points - currentLevelData.min;
  const pointsNeededForNext = nextLevelData.min - currentLevelData.min;
  const progressPercent = (pointsInCurrentLevel / pointsNeededForNext) * 100;
  
  return {
    currentLevel,
    nextLevel,
    pointsToNext: nextLevelData.min - points,
    progressPercent: Math.round(progressPercent)
  };
}

/**
 * Format time ago (e.g., "2 hours ago")
 */
export function formatTimeAgo(timestamp: string | Date): string {
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }
  
  return 'just now';
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Sanitize comment text to prevent XSS
 */
export function sanitizeCommentText(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate comment text
 */
export function validateCommentText(text: string): { valid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: 'Comment cannot be empty' };
  }
  
  if (text.length > 500) {
    return { valid: false, error: 'Comment must be 500 characters or less' };
  }
  
  return { valid: true };
}

/**
 * Get badge eligibility based on user stats
 */
export function checkBadgeEligibility(
  userProfile: {
    reputation_points: number;
    badges: Badge[];
  },
  stats: {
    rating_count: number;
    comment_count: number;
    share_count: number;
    viral_shares: number;
  }
): Badge[] {
  const earnedBadgeIds = new Set(userProfile.badges.map(b => b.id));
  const newBadges: Badge[] = [];
  const now = new Date().toISOString();
  
  // First Rating
  if (!earnedBadgeIds.has('first-rating') && stats.rating_count >= 1) {
    newBadges.push({ ...BADGE_DEFINITIONS['first-rating'], earned_at: now });
  }
  
  // Social Butterfly
  if (!earnedBadgeIds.has('social-butterfly') && stats.comment_count >= 10) {
    newBadges.push({ ...BADGE_DEFINITIONS['social-butterfly'], earned_at: now });
  }
  
  // Deal Hunter
  if (!earnedBadgeIds.has('deal-hunter') && stats.share_count >= 5) {
    newBadges.push({ ...BADGE_DEFINITIONS['deal-hunter'], earned_at: now });
  }
  
  // Trusted Reviewer
  if (!earnedBadgeIds.has('trusted-reviewer') && stats.rating_count >= 25) {
    newBadges.push({ ...BADGE_DEFINITIONS['trusted-reviewer'], earned_at: now });
  }
  
  // Community Leader
  if (!earnedBadgeIds.has('community-leader') && userProfile.reputation_points >= 100) {
    newBadges.push({ ...BADGE_DEFINITIONS['community-leader'], earned_at: now });
  }
  
  // Viral
  if (!earnedBadgeIds.has('viral') && stats.viral_shares >= 1) {
    newBadges.push({ ...BADGE_DEFINITIONS['viral'], earned_at: now });
  }
  
  return newBadges;
}

/**
 * Generate share URLs for social media
 */
export function generateShareUrls(dealId: string, dealType: string, dealTitle: string): {
  twitter: string;
  facebook: string;
  whatsapp: string;
  copyLink: string;
} {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const dealUrl = `${baseUrl}/deal/${dealId}?type=${dealType}`;
  const encodedUrl = encodeURIComponent(dealUrl);
  const encodedTitle = encodeURIComponent(`Check out this ${dealType} deal: ${dealTitle}`);
  
  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    copyLink: dealUrl
  };
}

/**
 * Format rating display (e.g., "4.5")
 */
export function formatRating(rating: number | string): string {
  const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
  if (isNaN(numRating)) return '0.0';
  return numRating.toFixed(1);
}

/**
 * Get vote count display (e.g., "45" or "1.2k")
 */
export function formatVoteCount(count: number | string): string {
  const numCount = typeof count === 'string' ? parseInt(count) : count;
  if (isNaN(numCount)) return '0';
  if (numCount < 1000) return numCount.toString();
  if (numCount < 10000) return `${(numCount / 1000).toFixed(1)}k`;
  return `${Math.floor(numCount / 1000)}k`;
}

/**
 * Check if user can perform action (rate limiting)
 */
export interface RateLimitCheck {
  allowed: boolean;
  remaining?: number;
  resetIn?: number;
}

export function checkRateLimit(
  action: 'comment' | 'vote' | 'share',
  recentActions: Date[]
): RateLimitCheck {
  const now = new Date();
  const limits = {
    comment: { max: 10, windowHours: 1 },
    vote: { max: 50, windowHours: 1 },
    share: { max: 20, windowHours: 24 }
  };
  
  const limit = limits[action];
  const windowMs = limit.windowHours * 60 * 60 * 1000;
  const cutoffTime = now.getTime() - windowMs;
  
  const actionsInWindow = recentActions.filter(
    date => date.getTime() > cutoffTime
  ).length;
  
  if (actionsInWindow >= limit.max) {
    const oldestAction = recentActions[0];
    const resetIn = Math.ceil((oldestAction.getTime() + windowMs - now.getTime()) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetIn
    };
  }
  
  return {
    allowed: true,
    remaining: limit.max - actionsInWindow
  };
}

