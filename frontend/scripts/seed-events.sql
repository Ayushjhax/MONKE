-- Seed initial crypto events data
-- Run this after database initialization

INSERT INTO crypto_events (event_name, event_type, city, country, latitude, longitude, start_date, end_date, expected_attendees, blockchain, official_website, description, verified) VALUES
('Solana Breakpoint 2025', 'conference', 'Singapore', 'Singapore', 1.3521, 103.8198, '2025-11-20', '2025-11-23', 15000, 'Solana', 'https://solana.com/breakpoint', 'The premier Solana conference bringing together builders, creators, and innovators from around the world.', TRUE),
('ETH Denver 2026', 'conference', 'Denver', 'USA', 39.7392, -104.9903, '2026-02-27', '2026-03-01', 20000, 'Ethereum', 'https://www.ethdenver.com', 'The largest and longest running ETH event in the world, focused on building the future of Web3.', TRUE),
('TOKEN2049 Dubai 2025', 'conference', 'Dubai', 'UAE', 25.2048, 55.2708, '2025-04-30', '2025-05-01', 12000, 'Multi-chain', 'https://www.token2049.com', 'Premier crypto event in the Middle East, connecting the global crypto ecosystem.', TRUE),
('Consensus 2025', 'conference', 'Austin', 'USA', 30.2672, -97.7431, '2025-05-28', '2025-05-30', 18000, 'Multi-chain', 'https://consensus2025.coindesk.com', 'The most influential gathering in crypto, blockchain and Web3.', TRUE),
('NFT NYC 2025', 'conference', 'New York', 'USA', 40.7128, -74.0060, '2025-04-02', '2025-04-04', 10000, 'Multi-chain', 'https://www.nft.nyc', 'The flagship NFT event bringing together creators, collectors, and builders.', TRUE)
ON CONFLICT DO NOTHING;

