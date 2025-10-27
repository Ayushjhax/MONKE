import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyLocationProof, reverseGeocode } from '@/lib/geo-helpers';

export async function POST(request: NextRequest) {
  let client;
  try {
    const { walletAddress, latitude, longitude, signature, message, timestamp } =
      await request.json();

    if (!walletAddress || !latitude || !longitude || !signature || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the wallet signature
    const isValid = await verifyLocationProof(walletAddress, message, signature);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid location proof signature' },
        { status: 403 }
      );
    }

    // Verify timestamp is recent (within 5 minutes)
    const now = Date.now();
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Location proof expired. Please try again.' },
        { status: 403 }
      );
    }

    // Get city/country from coordinates
    const geoData = await reverseGeocode(latitude, longitude);

    // Store in database with 1-hour expiry
    client = await pool.connect();
    const query = `
      INSERT INTO user_location_proofs 
      (user_wallet, latitude, longitude, city, country, proof_signature, proof_message, 
       proof_timestamp, verified, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, NOW() + INTERVAL '1 hour')
      RETURNING *
    `;

    const result = await client.query(query, [
      walletAddress,
      latitude,
      longitude,
      geoData?.city || 'Unknown',
      geoData?.country || 'Unknown',
      signature,
      message,
      timestamp,
    ]);

    return NextResponse.json({
      success: true,
      locationProof: result.rows[0],
      message: 'Location verified and stored on-chain',
    });
  } catch (error) {
    console.error('Submit location error:', error);
    return NextResponse.json(
      { error: 'Failed to submit location proof' },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}

