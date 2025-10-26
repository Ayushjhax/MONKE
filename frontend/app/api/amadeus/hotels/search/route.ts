// Amadeus Hotel Search API Route
// Smart hybrid system: Try Amadeus first, enhance/fallback to mock data

import { NextRequest, NextResponse } from 'next/server';
import { amadeusRateLimiter, retryWithBackoff, formatHotelOffer, type HotelOffer } from '@/lib/amadeus';
import { generateMockHotels } from '@/lib/mock-travel-data';
import { 
  shouldEnhanceHotels, 
  enhanceHotelResults, 
  logDataSourceDecision,
  type DataSource 
} from '@/lib/api-helpers';

const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY || '1jPC5E3hCAUHDSeipXCS6ohdaOOBnFTg';
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET || 'baIYpyFtohMS0jtd';
const AMADEUS_AUTH_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_HOTEL_LIST_URL = 'https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city';
const AMADEUS_HOTEL_OFFERS_URL = 'https://test.api.amadeus.com/v3/shopping/hotel-offers';

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
 * GET /api/amadeus/hotels/search
 * Query params: cityCode, checkInDate, checkOutDate, adults, rooms, radius, radiusUnit, max
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cityCode = searchParams.get('cityCode');
    const checkInDate = searchParams.get('checkInDate');
    const checkOutDate = searchParams.get('checkOutDate');
    const adults = searchParams.get('adults') || '1';
    const rooms = searchParams.get('rooms') || '1';
    const radius = searchParams.get('radius') || '5';
    const radiusUnit = searchParams.get('radiusUnit') || 'KM';
    const max = searchParams.get('max') || '10';

    // Validation
    if (!cityCode || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: cityCode, checkInDate, checkOutDate',
        },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(checkInDate) || !dateRegex.test(checkOutDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD',
        },
        { status: 400 }
      );
    }

    // Validate check-out is after check-in
    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Check-out date must be after check-in date',
        },
        { status: 400 }
      );
    }

    console.log(`🏨 Searching hotels in ${cityCode} from ${checkInDate} to ${checkOutDate}`);

    let amadeusResults: any[] = [];
    let dataSource: DataSource = 'amadeus';
    let apiError = false;

    // STEP 1: Try Amadeus API first
    try {
      console.log('🔍 Step 1: Trying Amadeus API...');
      
      // Get access token
      const accessToken = await getAccessToken();

    // STEP 1: Get hotel IDs in the city
    console.log(`📍 Step 1: Fetching hotel IDs in ${cityCode}...`);
    
    // Rate limiting
    await amadeusRateLimiter.throttle();

    const hotelListUrl = new URL(AMADEUS_HOTEL_LIST_URL);
    hotelListUrl.searchParams.append('cityCode', cityCode);
    hotelListUrl.searchParams.append('radius', radius);
    hotelListUrl.searchParams.append('radiusUnit', radiusUnit);

    const hotelListData = await retryWithBackoff(async () => {
      const response = await fetch(hotelListUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Amadeus hotel list error:', response.status, errorText);
        
        if (response.status === 401) {
          tokenCache = null;
          throw new Error('Token expired');
        }
        
        throw new Error(`Amadeus API error: ${response.status}`);
      }

      return response.json();
    });

    const hotels = hotelListData.data || [];
    
    if (hotels.length === 0) {
      console.log('❌ No hotels found in this city');
      return NextResponse.json({
        success: true,
        count: 0,
        searchParams: {
          cityCode,
          checkInDate,
          checkOutDate,
          adults: parseInt(adults),
          rooms: parseInt(rooms),
        },
        hotels: [],
      });
    }

    console.log(`✅ Found ${hotels.length} hotels in ${cityCode}`);

    // STEP 2: Get offers for hotels (limit to 10 hotels to avoid timeout)
    const maxHotels = Math.min(hotels.length, 10);
    const hotelIds = hotels.slice(0, maxHotels).map((h: any) => h.hotelId).join(',');

    console.log(`💰 Step 2: Fetching offers for ${maxHotels} hotels...`);
    
    // Rate limiting
    await amadeusRateLimiter.throttle();

    const offersUrl = new URL(AMADEUS_HOTEL_OFFERS_URL);
    offersUrl.searchParams.append('hotelIds', hotelIds);
    offersUrl.searchParams.append('checkInDate', checkInDate);
    offersUrl.searchParams.append('checkOutDate', checkOutDate);
    offersUrl.searchParams.append('adults', adults);
    offersUrl.searchParams.append('roomQuantity', rooms);
    offersUrl.searchParams.append('currency', 'USD');
    offersUrl.searchParams.append('bestRateOnly', 'true');

    const data = await retryWithBackoff(async () => {
      const response = await fetch(offersUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Amadeus hotel offers error:', response.status, errorText);
        
        if (response.status === 401) {
          tokenCache = null;
          throw new Error('Token expired');
        }
        
        if (response.status === 400) {
          try {
            const errorData = JSON.parse(errorText);
            return NextResponse.json(
              {
                success: false,
                error: 'Invalid search parameters',
                details: errorData.errors || errorText,
              },
              { status: 400 }
            );
          } catch {
            return NextResponse.json(
              {
                success: false,
                error: 'Invalid search parameters',
                details: errorText,
              },
              { status: 400 }
            );
          }
        }
        
        throw new Error(`Amadeus API error: ${response.status}`);
      }

      return response.json();
    });

      const hotelOffers: HotelOffer[] = data.data || [];

      console.log(`✅ Amadeus returned ${hotelOffers.length} hotel offers`);

      // Format hotel offers
      amadeusResults = hotelOffers
        .filter(offer => offer.available && offer.offers && offer.offers.length > 0)
        .map(offer => formatHotelOffer(offer))
        .slice(0, parseInt(max));

    } catch (error) {
      console.error('❌ Amadeus API error:', error);
      apiError = true;
      amadeusResults = [];
    }

    // STEP 2: Decide on data source and enhancement
    const mockResults = generateMockHotels(cityCode, checkInDate, checkOutDate);
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
      
    } else if (shouldEnhanceHotels(amadeusResults)) {
      // Results exist but are poor quality - enhance with mock
      dataSource = 'hybrid';
      finalResults = enhanceHotelResults(amadeusResults, mockResults);
      reason = 'Enhancing Amadeus results with curated data';
      
    } else {
      // Good quality results from Amadeus
      dataSource = 'amadeus';
      finalResults = amadeusResults;
      reason = 'Using Amadeus data only';
    }

    // Log the decision
    logDataSourceDecision('hotel', {
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
        cityCode,
        checkInDate,
        checkOutDate,
        adults: parseInt(adults),
        rooms: parseInt(rooms),
      },
      hotels: finalResults,
    });
  } catch (error) {
    console.error('💥 Unexpected error in hotel search:', error);
    
    // Even on unexpected errors, return mock data
    const mockResults = generateMockHotels(cityCode, checkInDate, checkOutDate);
    
    return NextResponse.json({
      success: true,
      count: mockResults.length,
      dataSource: 'fallback' as DataSource,
      searchParams: {
        cityCode,
        checkInDate,
        checkOutDate,
        adults: parseInt(adults),
        rooms: parseInt(rooms),
      },
      hotels: mockResults,
    });
  }
}

