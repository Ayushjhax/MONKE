// Amadeus Flight Search API Route
// Smart hybrid system: Try Amadeus first, enhance/fallback to mock data

import { NextRequest, NextResponse } from 'next/server';
import { amadeusRateLimiter, retryWithBackoff, formatFlightOffer, type FlightOffer } from '@/lib/amadeus';
import { generateMockFlights } from '@/lib/mock-travel-data';
import { 
  shouldEnhanceFlights, 
  enhanceFlightResults, 
  logDataSourceDecision,
  type DataSource 
} from '@/lib/api-helpers';

const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY || '1jPC5E3hCAUHDSeipXCS6ohdaOOBnFTg';
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET || 'baIYpyFtohMS0jtd';
const AMADEUS_AUTH_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_FLIGHT_OFFERS_URL = 'https://test.api.amadeus.com/v2/shopping/flight-offers';

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
 * GET /api/amadeus/flights/search
 * Query params: origin, destination, departureDate, returnDate (optional), adults, max
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const departureDate = searchParams.get('departureDate');
    const returnDate = searchParams.get('returnDate');
    const adults = searchParams.get('adults') || '1';
    const max = searchParams.get('max') || '10';

    // Validation
    if (!origin || !destination || !departureDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: origin, destination, departureDate',
        },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(departureDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD',
        },
        { status: 400 }
      );
    }

    if (returnDate && !dateRegex.test(returnDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid return date format. Use YYYY-MM-DD',
        },
        { status: 400 }
      );
    }

    console.log(`✈️  Searching flights: ${origin} → ${destination} on ${departureDate}`);

    let amadeusResults: any[] = [];
    let dataSource: DataSource = 'amadeus';
    let apiError = false;

    // STEP 1: Try Amadeus API first
    try {
      console.log('🔍 Step 1: Trying Amadeus API...');
      
      // Rate limiting
      await amadeusRateLimiter.throttle();

      // Get access token
      const accessToken = await getAccessToken();

    // Build search URL
    const searchUrl = new URL(AMADEUS_FLIGHT_OFFERS_URL);
    searchUrl.searchParams.append('originLocationCode', origin);
    searchUrl.searchParams.append('destinationLocationCode', destination);
    searchUrl.searchParams.append('departureDate', departureDate);
    if (returnDate) {
      searchUrl.searchParams.append('returnDate', returnDate);
    }
    searchUrl.searchParams.append('adults', adults);
    searchUrl.searchParams.append('max', max);
    searchUrl.searchParams.append('currencyCode', 'USD');

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
        console.error('❌ Amadeus flights error:', response.status, errorText);
        
        if (response.status === 401) {
          tokenCache = null;
          throw new Error('Token expired');
        }
        
        if (response.status === 400) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid search parameters',
              details: errorText,
            },
            { status: 400 }
          );
        }
        
        throw new Error(`Amadeus API error: ${response.status}`);
      }

      return response.json();
    });

      const flightOffers: FlightOffer[] = data.data || [];

      console.log(`✅ Amadeus returned ${flightOffers.length} flight offers`);

      // Format flight offers
      amadeusResults = flightOffers.map(offer => formatFlightOffer(offer));

    } catch (error) {
      console.error('❌ Amadeus API error:', error);
      apiError = true;
      amadeusResults = [];
    }

    // STEP 2: Decide on data source and enhancement
    const mockResults = generateMockFlights(origin, destination, departureDate, returnDate || undefined);
    let finalResults = amadeusResults;
    let reason = '';

    if (apiError) {
      // API completely failed - use mock data
      dataSource = 'fallback';
      finalResults = mockResults;
      reason = 'Amadeus API error - using fallback data';
      
    } else if (amadeusResults.length === 0) {
      // No results from API - use mock data
      dataSource = 'mock';
      finalResults = mockResults;
      reason = 'No results from Amadeus - using curated data';
      
    } else if (shouldEnhanceFlights(amadeusResults)) {
      // Results exist but are poor quality - enhance with mock
      dataSource = 'hybrid';
      finalResults = enhanceFlightResults(amadeusResults, mockResults);
      reason = 'Enhancing Amadeus results with curated data';
      
    } else {
      // Good quality results from Amadeus
      dataSource = 'amadeus';
      finalResults = amadeusResults;
      reason = 'Using Amadeus data only';
    }

    // Log the decision
    logDataSourceDecision('flight', {
      source: dataSource,
      amadeusCount: amadeusResults.length,
      mockCount: dataSource === 'hybrid' ? finalResults.length - amadeusResults.length : 
                 dataSource === 'mock' || dataSource === 'fallback' ? finalResults.length : 0,
      finalCount: finalResults.length,
      reason
    });

    return NextResponse.json({
      success: true,
      count: finalResults.length,
      dataSource, // Include data source for UI banner
      searchParams: {
        origin,
        destination,
        departureDate,
        returnDate,
        adults: parseInt(adults),
      },
      flights: finalResults,
    });
  } catch (error) {
    console.error('💥 Unexpected error in flight search:', error);
    
    // Even on unexpected errors, return mock data
    const mockResults = generateMockFlights(origin, destination, departureDate, returnDate || undefined);
    
    return NextResponse.json({
      success: true,
      count: mockResults.length,
      dataSource: 'fallback' as DataSource,
      searchParams: {
        origin,
        destination,
        departureDate,
        returnDate,
        adults: parseInt(adults),
      },
      flights: mockResults,
    });
  }
}

