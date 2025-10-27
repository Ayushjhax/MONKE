import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { calculateDistance } from '@/lib/geo-helpers';

export async function GET(request: NextRequest) {
  let client;
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const radiusKm = parseInt(searchParams.get('radius') || '50');
    const dealType = searchParams.get('dealType');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    client = await pool.connect();

    // Get user's latest verified location
    const locationQuery = `
      SELECT latitude, longitude, city, country
      FROM user_location_proofs
      WHERE user_wallet = $1 AND verified = TRUE AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const locationResult = await client.query(locationQuery, [walletAddress]);

    if (locationResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No verified location found. Please share your location first.' },
        { status: 404 }
      );
    }

    const userLat = parseFloat(locationResult.rows[0].latitude);
    const userLng = parseFloat(locationResult.rows[0].longitude);

    // Bounding box search (faster than checking every row)
    const latRange = radiusKm / 111; // 1 degree lat ≈ 111 km
    const lngRange = radiusKm / (111 * Math.cos((userLat * Math.PI) / 180));

    let dealsQuery = `
      SELECT *
      FROM amadeus_deals
      WHERE origin_lat BETWEEN $1 AND $2
        AND origin_lng BETWEEN $3 AND $4
        AND origin_lat IS NOT NULL
        AND origin_lng IS NOT NULL
    `;
    const params: any[] = [
      userLat - latRange,
      userLat + latRange,
      userLng - lngRange,
      userLng + lngRange,
    ];

    if (dealType) {
      dealsQuery += ` AND deal_type = $5`;
      params.push(dealType);
    }

    // Increase limit for larger radius searches
    const queryLimit = radiusKm >= 1000 ? 500 : 200;
    dealsQuery += ` ORDER BY cached_at DESC LIMIT ${queryLimit}`;

    const dealsResult = await client.query(dealsQuery, params);

    // Calculate exact distances and filter by radius
    const nearbyDeals = dealsResult.rows
      .map((deal) => ({
        ...deal,
        distance_km: calculateDistance(
          userLat,
          userLng,
          parseFloat(deal.origin_lat),
          parseFloat(deal.origin_lng)
        ),
      }))
      .filter((deal) => deal.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, radiusKm >= 5000 ? 100 : 50); // More results for global searches

    return NextResponse.json({
      userLocation: {
        latitude: userLat,
        longitude: userLng,
        city: locationResult.rows[0].city,
        country: locationResult.rows[0].country,
      },
      radiusKm,
      totalDeals: nearbyDeals.length,
      deals: nearbyDeals,
    });
  } catch (error) {
    console.error('Nearby deals error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nearby deals' },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}

