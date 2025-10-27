import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  let client;
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'upcoming';

    client = await pool.connect();

    let query = `
      SELECT ce.*, 
             COUNT(eld.id) as deal_count
      FROM crypto_events ce
      LEFT JOIN event_linked_deals eld ON ce.id = eld.event_id
    `;

    if (filter === 'upcoming') {
      query += ` WHERE ce.start_date >= CURRENT_DATE`;
    } else if (filter === 'popular') {
      query += ` WHERE ce.expected_attendees >= 10000`;
    }
    // 'all' filter - no WHERE clause, gets all events

    query += ` GROUP BY ce.id ORDER BY ce.start_date ASC`;

    const result = await client.query(query);

    return NextResponse.json({ events: result.rows });
  } catch (error) {
    console.error('Fetch events error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

export async function POST(request: NextRequest) {
  let client;
  try {
    const event = await request.json();

    client = await pool.connect();
    const query = `
      INSERT INTO crypto_events 
      (event_name, event_type, city, country, latitude, longitude, 
       start_date, end_date, expected_attendees, blockchain, official_website, description, verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE)
      RETURNING *
    `;

    const result = await client.query(query, [
      event.event_name,
      event.event_type || 'conference',
      event.city,
      event.country,
      event.latitude,
      event.longitude,
      event.start_date,
      event.end_date,
      event.expected_attendees || 0,
      event.blockchain || 'Multi-chain',
      event.official_website,
      event.description || '',
    ]);

    return NextResponse.json({ success: true, event: result.rows[0] });
  } catch (error) {
    console.error('Create event error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

