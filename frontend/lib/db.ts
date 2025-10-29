// Database connection and operations
import { Pool } from 'pg';

// Database connection
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Ensure initializeDatabase runs only once per process
let __dbInitialized = false;

// Types
export interface Collection {
  id: number;
  name: string;
  symbol: string;
  description: string;
  image_url: string;
  collection_mint: string;
  merkle_tree: string;
  merchant_id: string;
  merchant_name: string;
  merchant_wallet: string;
  category: string;
  discount_percent: number;
  original_price: number;
  discounted_price: number;
  location: string;
  expiry_date: string;
  max_uses: number;
  current_uses: number;
  status: 'Active' | 'Inactive' | 'Expired';
  created_at: string;
  updated_at: string;
}

export interface Merchant {
  id: number;
  username: string;
  public_key: string;
  secret_key: number[];
  created_at: string;
}

export interface UserClaim {
  id?: number;
  buyer_wallet: string;
  merchant_id: string;
  collection_mint: string;
  tx_signature: string;
  claimed_at?: string;
}

export interface ResaleListing {
  id: number;
  nft_address: string;
  seller_wallet: string;
  buyer_wallet?: string;
  price: number;
  status: 'active' | 'sold' | 'cancelled';
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: number;
  listing_id: number;
  nft_address: string;
  buyer_wallet: string;
  seller_wallet: string;
  offer_amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  payment_signature?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  offer_id?: number;
  listing_id?: number;
  nft_address: string;
  buyer_wallet: string;
  seller_wallet: string;
  amount: number;
  payment_signature?: string;
  nft_transfer_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  payment_status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

// Initialize database and create tables
export async function initializeDatabase() {
  try {
    if (__dbInitialized) {
      return;
    }
    const client = await pool.connect();
    
    // Create merchants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS merchants (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        public_key VARCHAR(44) UNIQUE NOT NULL,
        secret_key INTEGER[] NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create collections table
    await client.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        symbol VARCHAR(10) NOT NULL DEFAULT 'DEAL',
        description TEXT,
        image_url TEXT,
        collection_mint VARCHAR(44) UNIQUE NOT NULL,
        merkle_tree VARCHAR(44) NOT NULL,
        merchant_id VARCHAR(255) NOT NULL,
        merchant_name VARCHAR(255) NOT NULL,
        merchant_wallet VARCHAR(44) NOT NULL,
        category VARCHAR(50) DEFAULT 'General',
        discount_percent INTEGER DEFAULT 0,
        original_price DECIMAL(10,2) DEFAULT 0,
        discounted_price DECIMAL(10,2) DEFAULT 0,
        location VARCHAR(255) DEFAULT 'Global',
        expiry_date TIMESTAMP NOT NULL,
        max_uses INTEGER DEFAULT 1,
        current_uses INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_claims table to track which users have claimed from which collections
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_claims (
        id SERIAL PRIMARY KEY,
        buyer_wallet VARCHAR(44) NOT NULL,
        merchant_id VARCHAR(255) NOT NULL,
        collection_mint VARCHAR(44) NOT NULL,
        tx_signature VARCHAR(88) NOT NULL,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(buyer_wallet, merchant_id, collection_mint),
        FOREIGN KEY (merchant_id) REFERENCES merchants(username) ON DELETE CASCADE
      )
    `);

    // Create resale_listings table for NFT resale marketplace
    await client.query(`
      CREATE TABLE IF NOT EXISTS resale_listings (
        id SERIAL PRIMARY KEY,
        nft_address VARCHAR(255) UNIQUE NOT NULL,
        seller_wallet VARCHAR(44) NOT NULL,
        buyer_wallet VARCHAR(44),
        price DECIMAL(10,6) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create offers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS offers (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER NOT NULL,
        nft_address VARCHAR(255) NOT NULL,
        buyer_wallet VARCHAR(44) NOT NULL,
        seller_wallet VARCHAR(44) NOT NULL,
        offer_amount DECIMAL(10,6) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        payment_signature VARCHAR(88),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (listing_id) REFERENCES resale_listings(id) ON DELETE CASCADE
      )
    `);

    // Create transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        offer_id INTEGER,
        listing_id INTEGER,
        nft_address VARCHAR(255) NOT NULL,
        buyer_wallet VARCHAR(44) NOT NULL,
        seller_wallet VARCHAR(44) NOT NULL,
        amount DECIMAL(10,6) NOT NULL,
        payment_signature VARCHAR(88),
        nft_transfer_status VARCHAR(20) DEFAULT 'pending',
        payment_status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE SET NULL,
        FOREIGN KEY (listing_id) REFERENCES resale_listings(id) ON DELETE CASCADE
      )
    `);

    // Create coupon_redemptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS coupon_redemptions (
        id SERIAL PRIMARY KEY,
        nft_mint VARCHAR(255) UNIQUE NOT NULL,
        wallet_address VARCHAR(44) NOT NULL,
        coupon_code VARCHAR(50) NOT NULL,
        tx_signature VARCHAR(88) NOT NULL,
        discount_value INTEGER DEFAULT 0,
        merchant_name VARCHAR(255),
        redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create amadeus_deals table for caching Amadeus API results
    await client.query(`
      CREATE TABLE IF NOT EXISTS amadeus_deals (
        id SERIAL PRIMARY KEY,
        deal_type VARCHAR(20) NOT NULL,
        amadeus_offer_id VARCHAR(255) UNIQUE NOT NULL,
        origin VARCHAR(100),
        destination VARCHAR(100),
        departure_date DATE,
        return_date DATE,
        price DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        provider_name VARCHAR(255),
        details JSONB,
        cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_amadeus_deals_type_cached 
      ON amadeus_deals(deal_type, cached_at)
    `);

    // Create deal_bookings table for simulated bookings
    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_bookings (
        id SERIAL PRIMARY KEY,
        user_wallet VARCHAR(44) NOT NULL,
        deal_type VARCHAR(20) NOT NULL,
        amadeus_offer_id VARCHAR(255),
        original_price DECIMAL(10,2) NOT NULL,
        discount_applied DECIMAL(10,2) DEFAULT 0,
        final_price DECIMAL(10,2) NOT NULL,
        coupon_code VARCHAR(50),
        booking_reference VARCHAR(20) UNIQUE,
        status VARCHAR(20) DEFAULT 'confirmed',
        booking_details JSONB,
        booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deal_bookings_user_wallet 
      ON deal_bookings(user_wallet, booked_at DESC)
    `);

    // Create user_coupons_applied table to track coupon usage
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_coupons_applied (
        id SERIAL PRIMARY KEY,
        user_wallet VARCHAR(44) NOT NULL,
        coupon_code VARCHAR(50) NOT NULL UNIQUE,
        deal_booking_id INTEGER REFERENCES deal_bookings(id),
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // SOCIAL DISCOVERY LAYER TABLES

    // Deal ratings
    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_ratings (
        id SERIAL PRIMARY KEY,
        deal_id VARCHAR(255) NOT NULL,
        deal_type VARCHAR(20) NOT NULL,
        user_wallet VARCHAR(44) NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        review_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(deal_id, user_wallet)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deal_ratings_deal ON deal_ratings(deal_id, deal_type)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deal_ratings_user ON deal_ratings(user_wallet)
    `);

    // Deal votes (upvote/downvote)
    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_votes (
        id SERIAL PRIMARY KEY,
        deal_id VARCHAR(255) NOT NULL,
        deal_type VARCHAR(20) NOT NULL,
        user_wallet VARCHAR(44) NOT NULL,
        vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(deal_id, user_wallet)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deal_votes_deal ON deal_votes(deal_id, deal_type)
    `);

    // Comments
    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_comments (
        id SERIAL PRIMARY KEY,
        deal_id VARCHAR(255) NOT NULL,
        deal_type VARCHAR(20) NOT NULL,
        user_wallet VARCHAR(44) NOT NULL,
        parent_comment_id INTEGER REFERENCES deal_comments(id) ON DELETE CASCADE,
        comment_text TEXT NOT NULL,
        upvotes INTEGER DEFAULT 0,
        downvotes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted BOOLEAN DEFAULT FALSE
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_deal ON deal_comments(deal_id, deal_type)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_parent ON deal_comments(parent_comment_id)
    `);

    // Comment votes
    await client.query(`
      CREATE TABLE IF NOT EXISTS comment_votes (
        id SERIAL PRIMARY KEY,
        comment_id INTEGER REFERENCES deal_comments(id) ON DELETE CASCADE,
        user_wallet VARCHAR(44) NOT NULL,
        vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(comment_id, user_wallet)
      )
    `);

    // Share tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_shares (
        id SERIAL PRIMARY KEY,
        deal_id VARCHAR(255) NOT NULL,
        deal_type VARCHAR(20) NOT NULL,
        user_wallet VARCHAR(44) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shares_deal ON deal_shares(deal_id, deal_type)
    `);

    // Social stats (aggregated)
    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_social_stats (
        deal_id VARCHAR(255) PRIMARY KEY,
        deal_type VARCHAR(20) NOT NULL,
        avg_rating DECIMAL(3,2) DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        comment_count INTEGER DEFAULT 0,
        upvote_count INTEGER DEFAULT 0,
        downvote_count INTEGER DEFAULT 0,
        share_count INTEGER DEFAULT 0,
        hotness_score DECIMAL(10,2) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User social profiles
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_social_profiles (
        user_wallet VARCHAR(44) PRIMARY KEY,
        display_name VARCHAR(100),
        avatar_url TEXT,
        reputation_points INTEGER DEFAULT 0,
        reputation_level VARCHAR(20) DEFAULT 'Newbie',
        badges JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Activity feed
    await client.query(`
      CREATE TABLE IF NOT EXISTS social_activities (
        id SERIAL PRIMARY KEY,
        user_wallet VARCHAR(44) NOT NULL,
        activity_type VARCHAR(50) NOT NULL,
        deal_id VARCHAR(255),
        deal_type VARCHAR(20),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_created ON social_activities(created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_user ON social_activities(user_wallet)
    `);

    // Notifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_notifications (
        id SERIAL PRIMARY KEY,
        user_wallet VARCHAR(44) NOT NULL,
        notification_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(500),
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON user_notifications(user_wallet, read, created_at DESC)
    `);

    // GEO-BASED DISCOVERY TABLES

    // User location proofs (on-chain verified)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_location_proofs (
        id SERIAL PRIMARY KEY,
        user_wallet VARCHAR(44) NOT NULL,
        latitude DECIMAL(10, 7) NOT NULL,
        longitude DECIMAL(10, 7) NOT NULL,
        city VARCHAR(100),
        country VARCHAR(100),
        proof_signature VARCHAR(88) NOT NULL,
        proof_message TEXT NOT NULL,
        proof_timestamp BIGINT NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        UNIQUE(user_wallet, proof_timestamp)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_location_wallet 
      ON user_location_proofs(user_wallet, verified)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_location_geo 
      ON user_location_proofs(latitude, longitude)
    `);

    // Add geo columns to existing amadeus_deals table
    await client.query(`
      ALTER TABLE amadeus_deals 
      ADD COLUMN IF NOT EXISTS origin_lat DECIMAL(10, 7),
      ADD COLUMN IF NOT EXISTS origin_lng DECIMAL(10, 7),
      ADD COLUMN IF NOT EXISTS dest_lat DECIMAL(10, 7),
      ADD COLUMN IF NOT EXISTS dest_lng DECIMAL(10, 7)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_amadeus_deals_origin_geo 
      ON amadeus_deals(origin_lat, origin_lng)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_amadeus_deals_dest_geo 
      ON amadeus_deals(dest_lat, dest_lng)
    `);

    // Track geo-based interactions for analytics
    await client.query(`
      CREATE TABLE IF NOT EXISTS geo_deal_interactions (
        id SERIAL PRIMARY KEY,
        user_wallet VARCHAR(44) NOT NULL,
        deal_id VARCHAR(255) NOT NULL,
        user_lat DECIMAL(10, 7),
        user_lng DECIMAL(10, 7),
        distance_km INTEGER,
        interaction_type VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_geo_interactions_deal 
      ON geo_deal_interactions(deal_id)
    `);

    // Crypto/NFT events calendar
    await client.query(`
      CREATE TABLE IF NOT EXISTS crypto_events (
        id SERIAL PRIMARY KEY,
        event_name VARCHAR(255) NOT NULL,
        event_type VARCHAR(50),
        city VARCHAR(100) NOT NULL,
        country VARCHAR(100) NOT NULL,
        venue_address TEXT,
        latitude DECIMAL(10, 7),
        longitude DECIMAL(10, 7),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        expected_attendees INTEGER,
        blockchain VARCHAR(50),
        official_website TEXT,
        twitter_handle VARCHAR(100),
        logo_url TEXT,
        description TEXT,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_crypto_events_dates 
      ON crypto_events(start_date, end_date)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_crypto_events_location 
      ON crypto_events(city, country)
    `);

    // Link deals to events
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_linked_deals (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES crypto_events(id) ON DELETE CASCADE,
        deal_id VARCHAR(255) NOT NULL,
        deal_type VARCHAR(20),
        discount_percent INTEGER DEFAULT 0,
        auto_matched BOOLEAN DEFAULT FALSE,
        relevance_score DECIMAL(3,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_event_deals 
      ON event_linked_deals(event_id, deal_type)
    `);

    // User event interests (follow events)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_event_interests (
        id SERIAL PRIMARY KEY,
        user_wallet VARCHAR(44) NOT NULL,
        event_id INTEGER REFERENCES crypto_events(id) ON DELETE CASCADE,
        interest_level VARCHAR(20) DEFAULT 'watching',
        notification_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_wallet, event_id)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_interests 
      ON user_event_interests(user_wallet)
    `);

    // GROUP DEALS (CrowdBoost)
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_deals (
        id SERIAL PRIMARY KEY,
        deal_title VARCHAR(255) NOT NULL,
        deal_type VARCHAR(20) NOT NULL,
        merchant_id VARCHAR(255) NOT NULL,
        base_price DECIMAL(10,2) NOT NULL,
        min_participants INTEGER DEFAULT 2,
        status VARCHAR(20) DEFAULT 'active',
        start_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_at TIMESTAMP NOT NULL,
        tier_type VARCHAR(20) DEFAULT 'by_count', -- 'by_count' | 'by_volume'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_deal_tiers (
        id SERIAL PRIMARY KEY,
        group_deal_id INTEGER REFERENCES group_deals(id) ON DELETE CASCADE,
        threshold INTEGER NOT NULL,
        discount_percent INTEGER NOT NULL,
        rank INTEGER NOT NULL,
        UNIQUE (group_deal_id, rank)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_deal_groups (
        id SERIAL PRIMARY KEY,
        group_deal_id INTEGER REFERENCES group_deals(id) ON DELETE CASCADE,
        host_wallet VARCHAR(44) NOT NULL,
        invite_code VARCHAR(16) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'open',   -- 'open' | 'locked' | 'settling' | 'completed' | 'cancelled' | 'expired'
        current_tier_rank INTEGER DEFAULT 0,
        current_discount_percent INTEGER DEFAULT 0,
        participants_count INTEGER DEFAULT 0,
        total_pledged DECIMAL(10,6) DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_deal_members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES group_deal_groups(id) ON DELETE CASCADE,
        user_wallet VARCHAR(44) NOT NULL,
        pledge_units DECIMAL(10,6) DEFAULT 1,
        status VARCHAR(20) DEFAULT 'pledged', -- 'pledged' | 'confirmed' | 'refunded' | 'cancelled'
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (group_id, user_wallet)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_deal_settlements (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES group_deal_groups(id) ON DELETE CASCADE,
        final_tier_rank INTEGER NOT NULL,
        final_discount_percent INTEGER NOT NULL,
        settled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_deal_redemptions (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES group_deal_groups(id) ON DELETE CASCADE,
        user_wallet VARCHAR(44) NOT NULL,
        redemption_code VARCHAR(50) UNIQUE NOT NULL,
        qr_payload TEXT,
        status VARCHAR(20) DEFAULT 'issued', -- 'issued' | 'redeemed' | 'expired' | 'revoked'
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        redeemed_at TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_gdg_status ON group_deal_groups(status, expires_at)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_gdm_group ON group_deal_members(group_id, status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_gd_time ON group_deals(status, end_at)
    `);
    
    // ===== STAKING: ensure tables exist =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS staking_records (
        stake_id VARCHAR(64) PRIMARY KEY,
        asset_id VARCHAR(255) NOT NULL,
        owner_address VARCHAR(44) NOT NULL,
        nft_name VARCHAR(255),
        discount_percent INTEGER DEFAULT 0,
        merchant VARCHAR(255),
        tier VARCHAR(20) DEFAULT 'bronze',
        staked_at TIMESTAMP NOT NULL,
        last_verified_at TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        consecutive_days INTEGER DEFAULT 1,
        verification_failures INTEGER DEFAULT 0,
        total_rewards_earned DECIMAL(18,6) DEFAULT 0,
        total_rewards_claimed DECIMAL(18,6) DEFAULT 0,
        pending_rewards DECIMAL(18,6) DEFAULT 0,
        cooldown_ends_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_staking_owner ON staking_records(owner_address)
    `);
    
    client.release();
    __dbInitialized = true;
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// ====== STAKING HELPERS ======
export interface StakingRecordRow {
  stake_id: string;
  asset_id: string;
  owner_address: string;
  nft_name: string | null;
  discount_percent: number;
  merchant: string | null;
  tier: string;
  staked_at: string;
  last_verified_at: string;
  status: string;
  consecutive_days: number;
  verification_failures: number;
  total_rewards_earned: string;
  total_rewards_claimed: string;
  pending_rewards: string;
  cooldown_ends_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export async function createStakingRecord(row: Omit<StakingRecordRow, 'created_at' | 'updated_at'>): Promise<StakingRecordRow> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO staking_records (
        stake_id, asset_id, owner_address, nft_name, discount_percent, merchant, tier, staked_at,
        last_verified_at, status, consecutive_days, verification_failures, total_rewards_earned,
        total_rewards_claimed, pending_rewards, cooldown_ends_at, metadata
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
      ) RETURNING *`,
      [
        row.stake_id, row.asset_id, row.owner_address, row.nft_name, row.discount_percent, row.merchant,
        row.tier, row.staked_at, row.last_verified_at, row.status, row.consecutive_days,
        row.verification_failures, row.total_rewards_earned, row.total_rewards_claimed,
        row.pending_rewards, row.cooldown_ends_at, row.metadata
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getStakesByOwner(ownerAddress: string): Promise<StakingRecordRow[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`SELECT * FROM staking_records WHERE owner_address = $1 ORDER BY staked_at DESC`, [ownerAddress]);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function setStakePendingUnstake(stakeId: string, cooldownEndsAt: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE staking_records SET status = 'pending_unstake', cooldown_ends_at = $1, updated_at = CURRENT_TIMESTAMP WHERE stake_id = $2`,
      [cooldownEndsAt, stakeId]
    );
  } finally {
    client.release();
  }
}

export async function claimAllRewardsForOwner(ownerAddress: string): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<StakingRecordRow>(
      `SELECT * FROM staking_records WHERE owner_address = $1 AND (status = 'active' OR status = 'pending_unstake') FOR UPDATE`,
      [ownerAddress]
    );
    let total = 0;
    for (const r of rows) {
      const pending = parseFloat(r.pending_rewards || '0');
      total += pending;
      await client.query(
        `UPDATE staking_records SET 
           total_rewards_earned = (total_rewards_earned + $1),
           total_rewards_claimed = (total_rewards_claimed + $1),
           pending_rewards = 0,
           last_verified_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         WHERE stake_id = $2`,
        [pending, r.stake_id]
      );
    }
    await client.query('COMMIT');
    return Math.round(total * 1000000) / 1000000;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getStakingStatsForOwner(ownerAddress: string) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT * FROM staking_records WHERE owner_address = $1`, [ownerAddress]);
    const active = rows.filter(r => r.status === 'active');
    const totalNFTsStaked = active.length;
    const totalRewardsEarned = rows.reduce((s, r) => s + parseFloat(r.total_rewards_earned || '0'), 0);
    const totalRewardsClaimed = rows.reduce((s, r) => s + parseFloat(r.total_rewards_claimed || '0'), 0);
    const totalDaysStaked = rows.length > 0 ? Math.floor((Date.now() - new Date(rows[0].staked_at).getTime()) / (1000*60*60*24)) : 0;
    const tierDistribution = {
      bronze: active.filter(r => r.tier === 'bronze').length,
      silver: active.filter(r => r.tier === 'silver').length,
      gold: active.filter(r => r.tier === 'gold').length,
      platinum: active.filter(r => r.tier === 'platinum').length,
    };
    return {
      userAddress: ownerAddress,
      totalNFTsStaked,
      totalRewardsEarned,
      totalRewardsClaimed,
      totalDaysStaked,
      averageAPY: totalNFTsStaked > 0 && totalDaysStaked > 0 ? (totalRewardsEarned / totalDaysStaked) * 365 : 0,
      tierDistribution
    };
  } finally {
    client.release();
  }
}
// Create a new merchant
export async function createMerchant(merchantData: Omit<Merchant, 'id' | 'created_at'>): Promise<Merchant> {
  try {
    const client = await pool.connect();
    
    const query = `
      INSERT INTO merchants (username, public_key, secret_key)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const values = [merchantData.username, merchantData.public_key, merchantData.secret_key];
    const result = await client.query(query, values);
    client.release();
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating merchant:', error);
    throw error;
  }
}

// Get merchant by wallet address
export async function getMerchantByWallet(walletAddress: string): Promise<Merchant | null> {
  try {
    const client = await pool.connect();
    
    const query = 'SELECT * FROM merchants WHERE public_key = $1';
    const result = await client.query(query, [walletAddress]);
    client.release();
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching merchant by wallet:', error);
    throw error;
  }
}

// Create a new collection
export async function createCollection(collectionData: Omit<Collection, 'id' | 'created_at' | 'updated_at'>): Promise<Collection> {
  try {
    const client = await pool.connect();
    
    const query = `
      INSERT INTO collections (
        name, symbol, description, image_url, collection_mint, merkle_tree,
        merchant_id, merchant_name, merchant_wallet, category, discount_percent,
        original_price, discounted_price, location, expiry_date, max_uses, current_uses, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;
    
    const values = [
      collectionData.name,
      collectionData.symbol,
      collectionData.description,
      collectionData.image_url,
      collectionData.collection_mint,
      collectionData.merkle_tree,
      collectionData.merchant_id,
      collectionData.merchant_name,
      collectionData.merchant_wallet,
      collectionData.category,
      collectionData.discount_percent,
      collectionData.original_price,
      collectionData.discounted_price,
      collectionData.location,
      collectionData.expiry_date,
      collectionData.max_uses,
      collectionData.current_uses,
      collectionData.status
    ];
    
    const result = await client.query(query, values);
    client.release();
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating collection:', error);
    throw error;
  }
}

// Get all collections
export async function getAllCollections(): Promise<Collection[]> {
  try {
    const client = await pool.connect();
    
    const query = 'SELECT * FROM collections WHERE status = $1 ORDER BY created_at DESC';
    const result = await client.query(query, ['Active']);
    client.release();
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching collections:', error);
    throw error;
  }
}

// Get collection by ID
export async function getCollectionById(id: string): Promise<Collection | null> {
  try {
    const client = await pool.connect();
    
    const query = 'SELECT * FROM collections WHERE id = $1';
    const result = await client.query(query, [id]);
    client.release();
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching collection by ID:', error);
    throw error;
  }
}

// Get collection by mint address
export async function getCollectionByMint(collectionMint: string): Promise<Collection | null> {
  try {
    const client = await pool.connect();
    
    const query = 'SELECT * FROM collections WHERE collection_mint = $1';
    const result = await client.query(query, [collectionMint]);
    client.release();
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching collection by mint:', error);
    throw error;
  }
}

// Update collection usage
export async function updateCollectionUsage(collectionId: string): Promise<void> {
  try {
    const client = await pool.connect();
    
    const query = `
      UPDATE collections 
      SET current_uses = current_uses + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await client.query(query, [collectionId]);
    client.release();
  } catch (error) {
    console.error('Error updating collection usage:', error);
    throw error;
  }
}

// Check if user has already claimed from a merchant
export async function hasUserClaimed(merchantId: string, userWallet: string): Promise<boolean> {
  try {
    const client = await pool.connect();
    
    const query = 'SELECT 1 FROM user_claims WHERE merchant_id = $1 AND buyer_wallet = $2 LIMIT 1';
    const result = await client.query(query, [merchantId, userWallet]);
    client.release();
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking user claim:', error);
    throw error;
  }
}

// Resale listing functions
export async function createResaleListing(
  assetId: string,
  sellerWallet: string,
  priceSol: number
): Promise<ResaleListing> {
  try {
    const client = await pool.connect();
    
    // First check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'resale_listings'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ resale_listings table does not exist, initializing database...');
      await initializeDatabase();
    }
    
    const query = `
      INSERT INTO resale_listings (nft_address, seller_wallet, price, status)
      VALUES ($1, $2, $3, 'active')
      RETURNING *
    `;
    
    const result = await client.query(query, [assetId, sellerWallet, priceSol]);
    client.release();
    
    console.log(`✅ Created resale listing: ${assetId} by ${sellerWallet} for ${priceSol} SOL`);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating resale listing:', error);
    throw error;
  }
}

export async function getResaleListings(): Promise<ResaleListing[]> {
  try {
    const client = await pool.connect();
    
    const query = `
      SELECT * FROM resale_listings 
      WHERE status = 'active'
      ORDER BY created_at DESC
    `;
    
    const result = await client.query(query);
    client.release();
    
    console.log(`📊 getResaleListings: Found ${result.rows.length} active listings`);
    return result.rows;
  } catch (error) {
    console.error('Error fetching resale listings:', error);
    throw error;
  }
}

export async function getResaleListingById(id: number): Promise<ResaleListing | null> {
  try {
    const client = await pool.connect();
    
    const query = 'SELECT * FROM resale_listings WHERE id = $1';
    const result = await client.query(query, [id]);
    client.release();
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching resale listing:', error);
    throw error;
  }
}

export async function updateResaleListingStatus(
  id: number,
  status: 'active' | 'sold' | 'cancelled',
  buyerWallet?: string
): Promise<void> {
  try {
    const client = await pool.connect();
    
    const query = `
      UPDATE resale_listings 
      SET status = $1, buyer_wallet = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    
    await client.query(query, [status, buyerWallet, id]);
    client.release();
  } catch (error) {
    console.error('Error updating resale listing:', error);
    throw error;
  }
}

export async function getResaleListingByAssetId(assetId: string): Promise<ResaleListing | null> {
  try {
    const client = await pool.connect();
    
    // First check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'resale_listings'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ resale_listings table does not exist, initializing database...');
      await initializeDatabase();
    }
    
    const query = 'SELECT * FROM resale_listings WHERE nft_address = $1';
    const result = await client.query(query, [assetId]);
    client.release();
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching resale listing by asset ID:', error);
    throw error;
  }
}

// Record user claim
export async function recordUserClaim(merchantId: string, userWallet: string, collectionMint: string, txSignature: string): Promise<void> {
  try {
    const client = await pool.connect();
    
    const query = `
      INSERT INTO user_claims (buyer_wallet, merchant_id, collection_mint, tx_signature) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (buyer_wallet, merchant_id, collection_mint) DO NOTHING
    `;
    
    await client.query(query, [userWallet, merchantId, collectionMint, txSignature]);
    client.release();
  } catch (error) {
    console.error('Error recording user claim:', error);
    throw error;
  }
}

// Offer functions
export async function createOffer(
  listingId: number,
  nftAddress: string,
  buyerWallet: string,
  sellerWallet: string,
  offerAmount: number
): Promise<Offer> {
  try {
    const client = await pool.connect();
    const query = `
      INSERT INTO offers (listing_id, nft_address, buyer_wallet, seller_wallet, offer_amount)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await client.query(query, [listingId, nftAddress, buyerWallet, sellerWallet, offerAmount]);
    client.release();
    return result.rows[0];
  } catch (error) {
    console.error('Error creating offer:', error);
    throw error;
  }
}

export async function getOffersByBuyer(buyerWallet: string): Promise<Offer[]> {
  try {
    const client = await pool.connect();
    const query = `SELECT * FROM offers WHERE buyer_wallet = $1 ORDER BY created_at DESC`;
    const result = await client.query(query, [buyerWallet]);
    client.release();
    return result.rows;
  } catch (error) {
    console.error('Error fetching buyer offers:', error);
    throw error;
  }
}

export async function getOffersBySeller(sellerWallet: string): Promise<Offer[]> {
  try {
    const client = await pool.connect();
    const query = `SELECT * FROM offers WHERE seller_wallet = $1 ORDER BY created_at DESC`;
    const result = await client.query(query, [sellerWallet]);
    client.release();
    return result.rows;
  } catch (error) {
    console.error('Error fetching seller offers:', error);
    throw error;
  }
}

export async function updateOfferStatus(offerId: number, status: string): Promise<void> {
  try {
    const client = await pool.connect();
    const query = `UPDATE offers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
    await client.query(query, [status, offerId]);
    client.release();
  } catch (error) {
    console.error('Error updating offer:', error);
    throw error;
  }
}

export async function getOfferById(offerId: number): Promise<Offer | null> {
  try {
    const client = await pool.connect();
    const query = `SELECT * FROM offers WHERE id = $1`;
    const result = await client.query(query, [offerId]);
    client.release();
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching offer:', error);
    throw error;
  }
}

// Transaction functions
export async function createTransaction(transaction: Partial<Transaction>): Promise<Transaction> {
  try {
    const client = await pool.connect();
    const query = `
      INSERT INTO transactions (offer_id, listing_id, nft_address, buyer_wallet, seller_wallet, amount)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await client.query(query, [
      transaction.offer_id,
      transaction.listing_id,
      transaction.nft_address,
      transaction.buyer_wallet,
      transaction.seller_wallet,
      transaction.amount
    ]);
    client.release();
    return result.rows[0];
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
}

export async function updateTransactionStatus(
  transactionId: number,
  paymentStatus: string,
  nftTransferStatus: string
): Promise<void> {
  try {
    const client = await pool.connect();
    const query = `
      UPDATE transactions 
      SET payment_status = $1, nft_transfer_status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    await client.query(query, [paymentStatus, nftTransferStatus, transactionId]);
    client.release();
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
}

export async function getTransactionsByUser(walletAddress: string): Promise<Transaction[]> {
  try {
    const client = await pool.connect();
    const query = `
      SELECT * FROM transactions 
      WHERE buyer_wallet = $1 OR seller_wallet = $1
      ORDER BY created_at DESC
    `;
    const result = await client.query(query, [walletAddress]);
    client.release();
    return result.rows;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}

// Close database connection
export async function closeDatabase() {
  await pool.end();
}