/**
 * Populate Geo Data & Seed Events
 * This script:
 * 1. Seeds crypto events via API
 * 2. Populates Amadeus deals with lat/lng coordinates
 * 3. Adds additional events beyond the initial 5
 * 
 * Run with: npx tsx scripts/populate-geo-data.ts
 */

import { pool } from '@/lib/db';
import { getAirportCoordinates } from '@/lib/geo-helpers';

// Extended list of crypto events (10+ events)
const cryptoEvents = [
  // Initial 5 events
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
    venue_address: 'Marina Bay Sands, Singapore',
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
    venue_address: 'Colorado Convention Center, Denver',
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
    venue_address: 'Madinat Jumeirah, Dubai',
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
    venue_address: 'Austin Convention Center, Austin',
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
    venue_address: 'Times Square, New York',
  },
  // Additional events
  {
    event_name: 'Paris Blockchain Week 2025',
    event_type: 'conference',
    city: 'Paris',
    country: 'France',
    latitude: 48.8566,
    longitude: 2.3522,
    start_date: '2025-04-09',
    end_date: '2025-04-11',
    expected_attendees: 8000,
    blockchain: 'Multi-chain',
    official_website: 'https://www.parisblockchainweek.com',
    description: 'Europe\'s premier blockchain and crypto event bringing together global leaders.',
    venue_address: 'Carrousel du Louvre, Paris',
  },
  {
    event_name: 'Bitcoin 2025 Miami',
    event_type: 'conference',
    city: 'Miami',
    country: 'USA',
    latitude: 25.7617,
    longitude: -80.1918,
    start_date: '2025-05-14',
    end_date: '2025-05-16',
    expected_attendees: 25000,
    blockchain: 'Bitcoin',
    official_website: 'https://b.tc/conference',
    description: 'The biggest Bitcoin event of the year, featuring industry leaders and innovators.',
    venue_address: 'Miami Beach Convention Center',
  },
  {
    event_name: 'Devcon 7 Thailand',
    event_type: 'conference',
    city: 'Bangkok',
    country: 'Thailand',
    latitude: 13.7563,
    longitude: 100.5018,
    start_date: '2025-11-11',
    end_date: '2025-11-14',
    expected_attendees: 16000,
    blockchain: 'Ethereum',
    official_website: 'https://devcon.org',
    description: 'The Ethereum Foundation\'s annual developer conference, featuring technical talks and workshops.',
    venue_address: 'Queen Sirikit National Convention Center, Bangkok',
  },
  {
    event_name: 'NFT LA 2026',
    event_type: 'conference',
    city: 'Los Angeles',
    country: 'USA',
    latitude: 34.0522,
    longitude: -118.2437,
    start_date: '2026-03-23',
    end_date: '2026-03-26',
    expected_attendees: 12000,
    blockchain: 'Multi-chain',
    official_website: 'https://nft.la',
    description: 'West Coast\'s premier NFT and digital art conference.',
    venue_address: 'LA Convention Center',
  },
  {
    event_name: 'Solana Hacker House Tokyo',
    event_type: 'hackathon',
    city: 'Tokyo',
    country: 'Japan',
    latitude: 35.6762,
    longitude: 139.6503,
    start_date: '2025-09-15',
    end_date: '2025-09-17',
    expected_attendees: 5000,
    blockchain: 'Solana',
    official_website: 'https://solana.com/hackerhouse',
    description: 'Intensive builder-focused hackathon for Solana developers in Asia.',
    venue_address: 'Shibuya, Tokyo',
  },
  {
    event_name: 'Web3 Summit Berlin',
    event_type: 'conference',
    city: 'Berlin',
    country: 'Germany',
    latitude: 52.5200,
    longitude: 13.4050,
    start_date: '2025-08-12',
    end_date: '2025-08-14',
    expected_attendees: 9000,
    blockchain: 'Multi-chain',
    official_website: 'https://web3summit.com',
    description: 'Technical conference focused on Web3 infrastructure and protocols.',
    venue_address: 'Station Berlin',
  },
  {
    event_name: 'NFT Brazil Rio',
    event_type: 'conference',
    city: 'Rio de Janeiro',
    country: 'Brazil',
    latitude: -22.9068,
    longitude: -43.1729,
    start_date: '2025-06-25',
    end_date: '2025-06-27',
    expected_attendees: 7000,
    blockchain: 'Multi-chain',
    official_website: 'https://nftbrazil.com',
    description: 'Latin America\'s largest NFT and digital collectibles event.',
    venue_address: 'Jeunesse Arena, Rio de Janeiro',
  },
];

async function seedEventsViaAPI() {
  console.log('\n🎪 Seeding Crypto Events via API...\n');
  
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const event of cryptoEvents) {
    try {
      const response = await fetch('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });

      if (response.ok) {
        console.log(`   ✓ Created: ${event.event_name} (${event.city})`);
        successCount++;
      } else if (response.status === 409) {
        console.log(`   ⊘ Skipped: ${event.event_name} (already exists)`);
        skipCount++;
      } else {
        const error = await response.text();
        console.log(`   ✗ Failed: ${event.event_name} - ${error}`);
        failCount++;
      }
    } catch (error: any) {
      if (error.message.includes('ECONNREFUSED')) {
        console.log(`   ⚠ Server not ready yet, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Retry once
        try {
          const response = await fetch('http://localhost:3000/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
          });
          if (response.ok) {
            console.log(`   ✓ Created: ${event.event_name} (${event.city})`);
            successCount++;
          }
        } catch (retryError) {
          console.log(`   ✗ Failed after retry: ${event.event_name}`);
          failCount++;
        }
      } else {
        console.log(`   ✗ Error: ${event.event_name} - ${error.message}`);
        failCount++;
      }
    }
  }

  console.log(`\n📊 Events Summary:`);
  console.log(`   ✓ Created: ${successCount}`);
  console.log(`   ⊘ Skipped: ${skipCount}`);
  console.log(`   ✗ Failed: ${failCount}`);
}

async function populateAmadeusDealsWithCoordinates() {
  console.log('\n📍 Populating Amadeus Deals with Coordinates...\n');

  try {
    const client = await pool.connect();

    // Get all deals without coordinates
    const dealsQuery = `
      SELECT id, amadeus_offer_id, origin, destination
      FROM amadeus_deals
      WHERE (origin_lat IS NULL OR origin_lng IS NULL)
         OR (dest_lat IS NULL OR dest_lng IS NULL)
    `;

    const result = await client.query(dealsQuery);
    console.log(`Found ${result.rows.length} deals to update\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const deal of result.rows) {
      const originCoords = getAirportCoordinates(deal.origin);
      const destCoords = getAirportCoordinates(deal.destination);

      if (originCoords || destCoords) {
        const updateQuery = `
          UPDATE amadeus_deals
          SET 
            origin_lat = COALESCE($1, origin_lat),
            origin_lng = COALESCE($2, origin_lng),
            dest_lat = COALESCE($3, dest_lat),
            dest_lng = COALESCE($4, dest_lng)
          WHERE id = $5
        `;

        await client.query(updateQuery, [
          originCoords?.lat || null,
          originCoords?.lng || null,
          destCoords?.lat || null,
          destCoords?.lng || null,
          deal.id,
        ]);

        console.log(`   ✓ Updated: ${deal.origin} → ${deal.destination} (${deal.amadeus_offer_id.slice(0, 20)}...)`);
        updatedCount++;
      } else {
        console.log(`   ⊘ Skipped: ${deal.origin} → ${deal.destination} (coordinates not found)`);
        skippedCount++;
      }
    }

    client.release();

    console.log(`\n📊 Amadeus Deals Summary:`);
    console.log(`   ✓ Updated: ${updatedCount}`);
    console.log(`   ⊘ Skipped: ${skippedCount}`);
    console.log(`   📍 Known airports: JFK, LAX, LHR, CDG, DXB, SYD, SIN, NRT, FRA, AMS`);
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ⚠ Database not connected. The dev server will initialize it automatically.');
    } else {
      console.error('   ✗ Error:', error.message);
    }
  }
}

async function waitForServer() {
  console.log('⏳ Waiting for dev server to be ready...\n');
  
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch('http://localhost:3000/api/events?filter=upcoming');
      if (response.ok || response.status === 404) {
        console.log('✅ Dev server is ready!\n');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
    
    if (attempts % 5 === 0) {
      console.log(`   Still waiting... (${attempts}/${maxAttempts})`);
    }
  }

  console.log('⚠️  Server timeout. Please ensure dev server is running with: npm run dev\n');
  return false;
}

async function main() {
  console.log('🚀 Populating Geo Data & Seeding Events\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Wait for server to be ready
  const serverReady = await waitForServer();

  if (serverReady) {
    // Step 1: Seed events via API
    await seedEventsViaAPI();

    // Step 2: Populate Amadeus deals with coordinates
    await populateAmadeusDealsWithCoordinates();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('\n🎉 Data population complete!\n');
    console.log('✅ Next steps:');
    console.log('   1. Visit: http://localhost:3000/marketplace');
    console.log('   2. Click "🎪 Crypto Events" to see all seeded events');
    console.log('   3. Click "📍 Deals Near Me" to test geo features\n');
  } else {
    console.log('❌ Please start the dev server first:');
    console.log('   npm run dev\n');
    console.log('Then run this script again:\n');
    console.log('   npx tsx scripts/populate-geo-data.ts\n');
  }
}

main().catch(console.error);

