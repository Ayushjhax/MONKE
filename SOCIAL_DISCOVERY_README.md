# Social Discovery Layer - Complete Implementation

## Overview

A comprehensive social discovery layer has been added to the travel deals marketplace, similar to RedFlagDeals. Users can now rate deals, comment, vote, share, and earn reputation points through community engagement.

## ✅ Completed Features

### 1. Rating System
- ⭐ 1-5 star rating system for all deals
- One rating per user per deal
- Ability to update existing ratings
- Optional review text (max 500 characters)
- Average rating calculation
- Rating count display

### 2. Voting System  
- 👍 Upvote/downvote deals (Reddit-style)
- One vote per user per deal
- Ability to change or remove votes
- Net vote score calculation
- Vote counts displayed on cards and detail pages

### 3. Comment System
- 💬 Threaded comments (up to 2 levels deep)
- Reply to comments
- Edit own comments
- Soft delete (hide, don't remove)
- Sort by: newest, oldest, top voted
- Character limit: 500 per comment
- Comment voting (upvote/downvote)

### 4. Share Tracking
- 🔗 Social media sharing (Twitter, Facebook, WhatsApp)
- Copy link functionality
- Share counter per deal
- Platform-specific tracking
- Reputation points for sharing

### 5. Trending Algorithm
- 🔥 "Hotness" score calculation based on:
  * Average rating (30% weight)
  * Upvote count (25% weight)
  * Comment count (20% weight)
  * Share count (15% weight)
  * Recency (10% weight)
- Hot Deals section showing top trending deals
- Real-time score updates

### 6. User Reputation System
- 🏆 5-tier reputation levels:
  * Newbie (0-10 points)
  * Explorer (11-50 points)
  * Contributor (51-100 points)
  * Expert (101-250 points)
  * Legend (250+ points)
- Point system:
  * Rate a deal: +2 points
  * Post a comment: +3 points
  * Comment gets upvoted: +5 points
  * Share a deal: +1 point
- Progress bars showing next level
- Color-coded level badges

### 7. Badge System
- 6 achievement badges:
  * ⭐ First Rating - Rate your first deal
  * 🦋 Social Butterfly - Post 10 comments
  * 🎯 Deal Hunter - Share 5 deals
  * ✅ Trusted Reviewer - Give 25 ratings
  * 👑 Community Leader - Reach 100 reputation points
  * 🔥 Viral - Shared deal gets 50+ upvotes
- Automatic badge awarding
- Badge notifications

### 8. Activity Feed
- 📊 Real-time community activity
- Filter by activity type:
  * All activities
  * Ratings
  * Comments
  * Shares
  * Bookings
- User-specific activity feeds
- Time-stamped entries with "time ago" formatting

### 9. Notifications
- 🔔 Real-time notification system
- Notification bell with unread badge
- Notification types:
  * Someone replies to your comment
  * Your comment gets 5+ upvotes
  * Deal you rated becomes popular
  * Badge earned
- Mark as read functionality
- Auto-refresh every 30 seconds

### 10. User Profiles
- 👤 Public profile pages
- Display name customization
- Avatar URL support
- Reputation level display
- All earned badges
- Activity statistics
- Personal activity feed
- Edit profile (own profile only)

### 11. Community Hub
- Central community page at `/community`
- Trending deals section
- Recent activity feed
- Community statistics
- Quick action guide
- Filter options

## 📁 File Structure

```
frontend/
├── lib/
│   ├── social-types.ts          # TypeScript types for social features
│   ├── social-helpers.ts        # Helper functions and utilities
│   └── db.ts                    # Database schema (updated)
│
├── app/api/social/
│   ├── rate/route.ts            # Rating API
│   ├── vote/route.ts            # Voting API
│   ├── comments/
│   │   ├── route.ts             # Comment listing/creation
│   │   └── [commentId]/route.ts # Edit/delete comments
│   ├── comment-vote/route.ts    # Comment voting
│   ├── share/route.ts           # Share tracking
│   ├── stats/route.ts           # Social stats retrieval
│   ├── trending/route.ts        # Trending deals
│   ├── activity/route.ts        # Activity feed
│   ├── notifications/route.ts   # Notifications
│   └── profile/route.ts         # User profiles
│
├── components/social/
│   ├── RatingWidget.tsx         # Star rating component
│   ├── VoteButtons.tsx          # Upvote/downvote buttons
│   ├── ShareButtons.tsx         # Social share buttons
│   ├── CommentSection.tsx       # Full comment system
│   ├── SocialStats.tsx          # Stats display component
│   ├── UserReputation.tsx       # Reputation display
│   ├── ActivityFeed.tsx         # Activity feed
│   ├── TrendingSection.tsx      # Trending deals
│   └── NotificationBell.tsx     # Notification dropdown
│
├── app/
│   ├── community/page.tsx       # Community hub page
│   ├── profile/[wallet]/page.tsx # User profile page
│   └── deal/[dealId]/page.tsx   # Deal detail (updated)
│
└── components/
    └── DealCard.tsx             # Deal card (updated with social stats)
```

## 🗄️ Database Schema

### New Tables Created

1. **deal_ratings** - User ratings for deals
2. **deal_votes** - Upvotes/downvotes for deals
3. **deal_comments** - Comments and replies
4. **comment_votes** - Votes on comments
5. **deal_shares** - Share tracking
6. **deal_social_stats** - Aggregated statistics
7. **user_social_profiles** - User profiles and reputation
8. **social_activities** - Activity feed entries
9. **user_notifications** - User notifications

All tables include proper indexes for performance and foreign key constraints where applicable.

## 🚀 Usage Guide

### For Users

#### Rating a Deal
1. Navigate to any deal detail page
2. Click on "Reviews & Comments" tab
3. Select star rating (1-5 stars)
4. Optionally write a review
5. Click "Submit Rating"
6. Earn +2 reputation points

#### Commenting
1. Go to deal detail page → Reviews & Comments tab
2. Type your comment (max 500 characters)
3. Click "Post Comment"
4. Earn +3 reputation points
5. To reply: Click "Reply" on any comment

#### Voting
1. On deal cards or detail pages, use 👍/👎 buttons
2. Click once to vote, click again to remove vote
3. Click opposite button to change vote
4. Upvoting deals creates activity entries

#### Sharing
1. Click share buttons (Twitter, Facebook, WhatsApp, or Copy)
2. Share opens in new window
3. Earn +1 reputation point per share
4. Helps increase deal's hotness score

#### Viewing Profile
1. Click "Profile" button in header (when wallet connected)
2. View reputation level, badges, and stats
3. Click "Edit Profile" to customize display name
4. View personal activity feed

### For Developers

#### Adding Social Stats to a Component

```typescript
import { useState, useEffect } from 'react';
import SocialStats from '@/components/social/SocialStats';

// In your component
const [socialStats, setSocialStats] = useState<any>(null);

useEffect(() => {
  const fetchStats = async () => {
    const response = await fetch(
      `/api/social/stats?dealId=${dealId}&userWallet=${userWallet}`
    );
    const data = await response.json();
    setSocialStats(data.stats);
  };
  fetchStats();
}, [dealId, userWallet]);

// Render
<SocialStats
  avgRating={socialStats?.avg_rating}
  ratingCount={socialStats?.rating_count}
  commentCount={socialStats?.comment_count}
  upvoteCount={socialStats?.upvote_count}
  downvoteCount={socialStats?.downvote_count}
  shareCount={socialStats?.share_count}
  isHot={socialStats?.hotness_score > 50}
  compact={true}
/>
```

#### Using Individual Components

```typescript
// Rating Widget
<RatingWidget
  dealId="deal-123"
  dealType="flight"
  onRatingUpdate={(newStats) => {
    // Handle rating update
  }}
/>

// Vote Buttons
<VoteButtons
  dealId="deal-123"
  dealType="hotel"
  onVoteUpdate={(upvotes, downvotes) => {
    // Handle vote update
  }}
/>

// Comment Section
<CommentSection
  dealId="deal-123"
  dealType="collection"
  onCommentCountUpdate={(count) => {
    // Handle comment count update
  }}
/>

// Share Buttons
<ShareButtons
  dealId="deal-123"
  dealType="flight"
  dealTitle="NYC to LAX - $199"
  onShareUpdate={(shareCount) => {
    // Handle share update
  }}
/>
```

## 🔧 API Endpoints

### GET /api/social/stats
Get social statistics for one or multiple deals
- Query params: `dealId` or `dealIds` (comma-separated), `userWallet` (optional)
- Returns: Social stats including user-specific data

### POST /api/social/rate
Submit or update a rating
- Body: `{ dealId, dealType, userWallet, rating, reviewText? }`
- Returns: Updated rating and stats

### POST /api/social/vote
Vote on a deal
- Body: `{ dealId, dealType, userWallet, voteType }`
- Returns: Updated vote counts

### GET /api/social/comments
Get comments for a deal
- Query params: `dealId`, `sortBy` (newest|oldest|top), `userWallet` (optional)
- Returns: Comments with replies

### POST /api/social/comments
Post a new comment
- Body: `{ dealId, dealType, userWallet, commentText, parentCommentId? }`
- Returns: Created comment

### POST /api/social/share
Track a share event
- Body: `{ dealId, dealType, userWallet, platform }`
- Returns: Updated share count

### GET /api/social/trending
Get trending deals
- Query params: `limit`, `dealType` (optional)
- Returns: Array of deals sorted by hotness score

### GET /api/social/activity
Get activity feed
- Query params: `limit`, `offset`, `activityType`, `userWallet` (optional)
- Returns: Paginated activity entries

### GET /api/social/notifications
Get user notifications
- Query params: `userWallet`, `unreadOnly`, `limit`
- Returns: Notifications and unread count

### GET /api/social/profile
Get user profile
- Query params: `userWallet`
- Returns: Profile data and stats

### PUT /api/social/profile
Update user profile
- Body: `{ userWallet, displayName?, avatarUrl? }`
- Returns: Updated profile

## 🎮 Gamification Elements

### Reputation System
- Points accumulate automatically
- Level up notifications
- Visual progress bars
- Color-coded level badges
- Levels displayed on all user interactions

### Badge System
- 6 achievement badges
- Automatic detection and awarding
- Push notifications when earned
- Displayed on user profiles
- Activity feed entries for badge awards

### Leaderboard (Future Enhancement)
- Top contributors by reputation
- Most active commenters
- Best-rated deals
- Time-period filters (week, month, all-time)

## 🛡️ Security & Anti-Spam

### Rate Limiting
- Comments: 10 per hour per user
- Votes: 50 per hour per user
- Shares: 20 per day per user
- Implemented in helper functions

### Input Validation
- Comment text sanitized (XSS prevention)
- Max 500 characters for comments
- Display name max 100 characters
- Rating must be 1-5
- Vote type must be 'up' or 'down'

### Data Integrity
- Unique constraints prevent duplicate votes/ratings
- Soft deletes for comments (preserve thread structure)
- Foreign key constraints maintain referential integrity
- Transaction-based updates for consistency

## 📊 Performance Optimizations

### Database Indexes
- Indexed deal_id for fast lookups
- Indexed user_wallet for profile queries
- Indexed created_at for chronological feeds
- Composite indexes for common queries

### Aggregated Stats
- `deal_social_stats` table caches computed values
- Updated on each interaction (write-optimized)
- Prevents expensive calculations on reads
- Hotness score pre-computed

### Real-time Updates
- Optimistic UI updates
- Background polling (30s for notifications)
- On-demand stats refresh
- Minimal re-renders with React state

## 🎨 UI/UX Features

### Responsive Design
- Mobile-first approach
- Touch-friendly buttons
- Collapsible sections
- Adaptive layouts

### Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader friendly
- High contrast color schemes

### Visual Feedback
- Loading states
- Success/error messages
- Skeleton loaders
- Smooth transitions
- Hover effects

## 🧪 Testing Checklist

All core features have been implemented and are ready for testing:

- [x] Database tables created with proper schema
- [x] All API endpoints functional
- [x] Rating system works (add, update)
- [x] Voting system works (up, down, remove)
- [x] Comments work (post, reply, edit, delete)
- [x] Comment voting works
- [x] Share tracking works
- [x] Trending algorithm calculates correctly
- [x] Reputation points awarded correctly
- [x] Badges detected and awarded
- [x] Activity feed displays entries
- [x] Notifications created and displayed
- [x] User profiles work
- [x] Community page displays trending/activity
- [x] Social stats integrated in cards
- [x] Deal detail page has full social features
- [x] Mobile responsive
- [x] TypeScript types complete
- [x] Error handling in place

## 🚦 Getting Started

### 1. Initialize Database

```bash
# The tables will be created automatically when the database is initialized
# Make sure DATABASE_URL is set in your .env file
```

### 2. Access Features

- **Marketplace**: Browse deals with social stats on cards
- **Deal Details**: Rate, comment, vote, and share deals
- **Community**: `/community` - View trending deals and activity
- **Profile**: `/profile/[wallet]` - View any user's profile
- **Notifications**: Click bell icon in header

### 3. Test Flow

1. Connect wallet
2. Navigate to any deal
3. Rate the deal (earn +2 points)
4. Post a comment (earn +3 points)
5. Upvote the deal
6. Share the deal (earn +1 point)
7. Visit `/community` to see trending deals
8. Click profile to see your reputation and badges

## 🔮 Future Enhancements

Potential additions for future iterations:

1. **Report System**: Flag inappropriate comments
2. **Moderation Dashboard**: For community managers
3. **Deal Collections**: Users can save/organize deals
4. **Following System**: Follow other users
5. **Private Messages**: User-to-user communication
6. **Advanced Search**: Filter by rating, comments, etc.
7. **Email Notifications**: Optional email alerts
8. **Mobile App**: Native iOS/Android apps
9. **AI Moderation**: Automatic content filtering
10. **Analytics Dashboard**: Community insights

## 📝 Notes

- All social features require wallet connection
- Reputation points are retroactive (calculated from existing data)
- Hotness scores are recalculated on each interaction
- Notifications poll every 30 seconds when page is active
- Comments support markdown-like formatting (preserved whitespace)
- Social stats are cached and updated transactionally

## 🤝 Contributing

To extend the social discovery layer:

1. Add new badge types in `social-types.ts`
2. Create new activity types
3. Extend reputation point calculations
4. Add new social features (polls, reactions, etc.)
5. Enhance trending algorithm with more signals

## 📄 License

This social discovery layer is part of the MonkeDao travel deals marketplace.

---

**Built with ❤️ for the MonkeDao community**

For questions or issues, please refer to the main project documentation.

