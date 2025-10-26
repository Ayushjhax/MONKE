// Amadeus Location Search API Route
// Search for airports and cities by keyword

import { NextRequest, NextResponse } from 'next/server';
import { amadeusRateLimiter, retryWithBackoff, type AmadeusLocation } from '@/lib/amadeus';

const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY || '1jPC5E3hCAUHDSeipXCS6ohdaOOBnFTg';
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET || 'baIYpyFtohMS0jtd';
const AMADEUS_AUTH_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_LOCATIONS_URL = 'https://test.api.amadeus.com/v1/reference-data/locations';

// Token cache
let tokenCache: {
  access_token: string;
  expires_at: number;
} | null = null;

/**
 * Get Amadeus access token
 */
async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expires_at > Date.now()) {
    return tokenCache.access_token;
  }

  const response = await fetch(AMADEUS_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: AMADEUS_API_KEY,
      client_secret: AMADEUS_API_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(`Amadeus auth failed: ${response.status}`);
  }

  const data = await response.json();
  tokenCache = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

/**
 * GET /api/amadeus/locations?keyword=new+york&subType=CITY,AIRPORT
 * Search for airports and cities
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword');
    const subType = searchParams.get('subType') || 'CITY,AIRPORT';

    // Validation
    if (!keyword || keyword.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Keyword must be at least 2 characters',
        },
        { status: 400 }
      );
    }

    console.log(`🔍 Searching locations for: "${keyword}"`);

    // Rate limiting
    await amadeusRateLimiter.throttle();

    // Get access token
    const accessToken = await getAccessToken();

    // Build search URL
    const searchUrl = new URL(AMADEUS_LOCATIONS_URL);
    searchUrl.searchParams.append('keyword', keyword);
    searchUrl.searchParams.append('subType', subType);
    searchUrl.searchParams.append('page[limit]', '10');

    // Make API call with retry logic
    const data = await retryWithBackoff(async () => {
      const response = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Amadeus locations error:', response.status, errorText);
        
        if (response.status === 401) {
          // Token expired, clear cache
          tokenCache = null;
          throw new Error('Token expired');
        }
        
        throw new Error(`Amadeus API error: ${response.status}`);
      }

      return response.json();
    });

    const locations: AmadeusLocation[] = data.data || [];

    console.log(`✅ Found ${locations.length} locations`);

    return NextResponse.json({
      success: true,
      count: locations.length,
      locations: locations.map(loc => ({
        id: loc.id,
        type: loc.type,
        subType: loc.subType,
        name: loc.name,
        detailedName: loc.detailedName,
        iataCode: loc.iataCode,
        cityName: loc.address?.cityName,
        cityCode: loc.address?.cityCode,
        countryName: loc.address?.countryName,
        countryCode: loc.address?.countryCode,
      })),
    });
  } catch (error) {
    console.error('Error in locations search:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search locations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

