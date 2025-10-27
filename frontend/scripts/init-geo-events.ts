/**
 * Initialize Geo + Events Feature
 * Run with: npx tsx scripts/init-geo-events.ts
 */

import { pool, initializeDatabase } from '@/lib/db';

const events = [
  {
    event_name: 'Solana Breakpoint 2025',
    event_type: 'conference',
    city: 'Singapore',
    country: 'Singapore',
    latitude: 1.3521,
    longitude: 103.8198,
    start_date: '2025-11-20',
    end_date: '2025-11-23',
    expected_attendees: 15000,
    blockchain: 'Solana',
    official_website: 'https://solana.com/breakpoint',
    description: 'The premier Solana conference bringing together builders, creators, and innovators from around the world.',
  },
  {
    event_name: 'ETH Denver 2026',
    event_type: 'conference',
    city: 'Denver',
    country: 'USA',
    latitude: 39.7392,
    longitude: -104.9903,
    start_date: '2026-02-27',
    end_date: '2026-03-01',
    expected_attendees: 20000,
    blockchain: 'Ethereum',
    official_website: 'https://www.ethdenver.com',
    description: 'The largest and longest running ETH event in the world, focused on building the future of Web3.',
  },
  {
    event_name: 'TOKEN2049 Dubai 2025',
    event_type: 'conference',
    city: 'Dubai',
    country: 'UAE',
    latitude: 25.2048,
    longitude: 55.2708,
    start_date: '2025-04-30',
    end_date: '2025-05-01',
    expected_attendees: 12000,
    blockchain: 'Multi-chain',
    official_website: 'https://www.token2049.com',
    description: 'Premier crypto event in the Middle East, connecting the global crypto ecosystem.',
  },
  {
    event_name: 'Consensus 2025',
    event_type: 'conference',
    city: 'Austin',
    country: 'USA',
    latitude: 30.2672,
    longitude: -97.7431,
    start_date: '2025-05-28',
    end_date: '2025-05-30',
    expected_attendees: 18000,
    blockchain: 'Multi-chain',
    official_website: 'https://consensus2025.coindesk.com',
    description: 'The most influential gathering in crypto, blockchain and Web3.',
  },
  {
    event_name: 'NFT NYC 2025',
    event_type: 'conference',
    city: 'New York',
    country: 'USA',
    latitude: 40.7128,
    longitude: -74.0060,
    start_date: '2025-04-02',
    end_date: '2025-04-04',
    expected_attendees: 10000,
    blockchain: 'Multi-chain',
    official_website: 'https://www.nft.nyc',
    description: 'The flagship NFT event bringing together creators, collectors, and builders.',
  },
];

async function main() {
  console.log('🚀 Initializing Geo + Events Feature...\n');

  try {
    // Step 1: Initialize database with new tables
    console.log('📊 Step 1: Creating database tables...');
    await initializeDatabase();
    console.log('✅ Database tables created successfully\n');

    // Step 2: Seed crypto events
    console.log('🎪 Step 2: Seeding crypto events...');
    const client = await pool.connect();

    let seededCount = 0;
    for (const event of events) {
      try {
        // Check if event already exists
        const checkQuery = `SELECT id FROM crypto_events WHERE event_name = $1`;
        const existingEvent = await client.query(checkQuery, [event.event_name]);

        if (existingEvent.rows.length > 0) {
          console.log(`   ⊘ Skipped: ${event.event_name} (already exists)`);
          continue;
        }

        const query = `
          INSERT INTO crypto_events 
          (event_name, event_type, city, country, latitude, longitude, 
           start_date, end_date, expected_attendees, blockchain, official_website, description, verified)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE)
          RETURNING *
        `;

        const result = await client.query(query, [
          event.event_name,
          event.event_type,
          event.city,
          event.country,
          event.latitude,
          event.longitude,
          event.start_date,
          event.end_date,
          event.expected_attendees,
          event.blockchain,
          event.official_website,
          event.description,
        ]);

        console.log(`   ✓ Seeded: ${event.event_name} (${event.city})`);
        seededCount++;
      } catch (err) {
        console.error(`   ✗ Failed: ${event.event_name}`, err);
      }
    }

    client.release();
    console.log(`\n✅ Seeded ${seededCount} new events\n`);

    // Step 3: Summary
    console.log('📝 Summary:');
    console.log('   - Database tables: ✅ Created/Updated');
    console.log('   - Crypto events: ✅ Seeded');
    console.log('   - Geo location tables: ✅ Ready');
    console.log('   - Event linking tables: ✅ Ready\n');

    console.log('🎉 Initialization complete!');
    console.log('\nNext steps:');
    console.log('1. Start dev server: npm run dev');
    console.log('2. Visit: http://localhost:3000/marketplace');
    console.log('3. Click "📍 Deals Near Me" to test geo features');
    console.log('4. Click "🎪 Crypto Events" to browse events\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

main();

