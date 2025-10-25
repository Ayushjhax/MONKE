// Collections API Route
import { NextRequest, NextResponse } from 'next/server';
import { getAllCollections, initializeDatabase } from '@/lib/db';

// Initialize database on first request
let dbInitialized = false;

export async function GET(request: NextRequest) {
  try {
    // Initialize database if not already done
    if (!dbInitialized) {
      await initializeDatabase();
      dbInitialized = true;
    }

    const collections = await getAllCollections();
    
    return NextResponse.json({
      success: true,
      count: collections.length,
      collections
    });
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch collections'
      },
      { status: 500 }
    );
  }
}
