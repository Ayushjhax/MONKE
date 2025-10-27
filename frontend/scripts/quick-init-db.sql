-- Quick database initialization for geo + events features
-- Run with: psql $DATABASE_URL -f scripts/quick-init-db.sql

-- User location proofs (on-chain verified)
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
);

CREATE INDEX IF NOT EXISTS idx_user_location_wallet 
ON user_location_proofs(user_wallet, verified);

CREATE INDEX IF NOT EXISTS idx_user_location_geo 
ON user_location_proofs(latitude, longitude);

-- Add geo columns to existing amadeus_deals table
ALTER TABLE amadeus_deals 
ADD COLUMN IF NOT EXISTS origin_lat DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS origin_lng DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS dest_lat DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS dest_lng DECIMAL(10, 7);

CREATE INDEX IF NOT EXISTS idx_amadeus_deals_origin_geo 
ON amadeus_deals(origin_lat, origin_lng);

CREATE INDEX IF NOT EXISTS idx_amadeus_deals_dest_geo 
ON amadeus_deals(dest_lat, dest_lng);

-- Track geo-based interactions for analytics
CREATE TABLE IF NOT EXISTS geo_deal_interactions (
  id SERIAL PRIMARY KEY,
  user_wallet VARCHAR(44) NOT NULL,
  deal_id VARCHAR(255) NOT NULL,
  user_lat DECIMAL(10, 7),
  user_lng DECIMAL(10, 7),
  distance_km INTEGER,
  interaction_type VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_geo_interactions_deal 
ON geo_deal_interactions(deal_id);

-- Crypto/NFT events calendar
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
);

CREATE INDEX IF NOT EXISTS idx_crypto_events_dates 
ON crypto_events(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_crypto_events_location 
ON crypto_events(city, country);

-- Link deals to events
CREATE TABLE IF NOT EXISTS event_linked_deals (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES crypto_events(id) ON DELETE CASCADE,
  deal_id VARCHAR(255) NOT NULL,
  deal_type VARCHAR(20),
  discount_percent INTEGER DEFAULT 0,
  auto_matched BOOLEAN DEFAULT FALSE,
  relevance_score DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_deals 
ON event_linked_deals(event_id, deal_type);

-- User event interests (follow events)
CREATE TABLE IF NOT EXISTS user_event_interests (
  id SERIAL PRIMARY KEY,
  user_wallet VARCHAR(44) NOT NULL,
  event_id INTEGER REFERENCES crypto_events(id) ON DELETE CASCADE,
  interest_level VARCHAR(20) DEFAULT 'watching',
  notification_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_wallet, event_id)
);

CREATE INDEX IF NOT EXISTS idx_user_interests 
ON user_event_interests(user_wallet);

-- Seed initial crypto events
INSERT INTO crypto_events (event_name, event_type, city, country, latitude, longitude, start_date, end_date, expected_attendees, blockchain, official_website, description, verified) VALUES
('Solana Breakpoint 2025', 'conference', 'Singapore', 'Singapore', 1.3521, 103.8198, '2025-11-20', '2025-11-23', 15000, 'Solana', 'https://solana.com/breakpoint', 'The premier Solana conference bringing together builders, creators, and innovators from around the world.', TRUE),
('ETH Denver 2026', 'conference', 'Denver', 'USA', 39.7392, -104.9903, '2026-02-27', '2026-03-01', 20000, 'Ethereum', 'https://www.ethdenver.com', 'The largest and longest running ETH event in the world, focused on building the future of Web3.', TRUE),
('TOKEN2049 Dubai 2025', 'conference', 'Dubai', 'UAE', 25.2048, 55.2708, '2025-04-30', '2025-05-01', 12000, 'Multi-chain', 'https://www.token2049.com', 'Premier crypto event in the Middle East, connecting the global crypto ecosystem.', TRUE),
('Consensus 2025', 'conference', 'Austin', 'USA', 30.2672, -97.7431, '2025-05-28', '2025-05-30', 18000, 'Multi-chain', 'https://consensus2025.coindesk.com', 'The most influential gathering in crypto, blockchain and Web3.', TRUE),
('NFT NYC 2025', 'conference', 'New York', 'USA', 40.7128, -74.0060, '2025-04-02', '2025-04-04', 10000, 'Multi-chain', 'https://www.nft.nyc', 'The flagship NFT event bringing together creators, collectors, and builders.', TRUE)
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Database initialized successfully!' as status;
SELECT COUNT(*) as crypto_events_count FROM crypto_events;

