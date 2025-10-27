import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  let client;
  try {
    const { eventId } = await params;
    client = await pool.connect();

    // Get event details
    const eventQuery = `SELECT * FROM crypto_events WHERE id = $1`;
    const eventResult = await client.query(eventQuery, [eventId]);

    if (eventResult.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get linked deals with details
    const dealsQuery = `
      SELECT ad.*, eld.relevance_score, eld.auto_matched, eld.discount_percent
      FROM event_linked_deals eld
      JOIN amadeus_deals ad ON eld.deal_id = ad.amadeus_offer_id
      WHERE eld.event_id = $1
      ORDER BY eld.relevance_score DESC
      LIMIT 50
    `;
    const dealsResult = await client.query(dealsQuery, [eventId]);

    return NextResponse.json({
      event: eventResult.rows[0],
      deals: dealsResult.rows,
    });
  } catch (error) {
    console.error('Fetch event details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event details' },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}

