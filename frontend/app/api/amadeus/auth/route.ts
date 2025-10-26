// Amadeus OAuth2 Authentication API Route
// Handles token generation and caching with auto-refresh

import { NextRequest, NextResponse } from 'next/server';

// In-memory token cache (for production, use Redis or similar)
let tokenCache: {
  access_token: string;
  expires_at: number;
} | null = null;

const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY || '1jPC5E3hCAUHDSeipXCS6ohdaOOBnFTg';
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET || 'baIYpyFtohMS0jtd';
const AMADEUS_AUTH_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';

interface AmadeusAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  state?: string;
}

/**
 * Get or refresh Amadeus access token
 */
async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (tokenCache && tokenCache.expires_at > Date.now()) {
    console.log('✅ Using cached Amadeus token');
    return tokenCache.access_token;
  }

  console.log('🔄 Fetching new Amadeus token...');

  try {
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
      const errorText = await response.text();
      console.error('❌ Amadeus auth error:', response.status, errorText);
      throw new Error(`Amadeus authentication failed: ${response.status} ${errorText}`);
    }

    const data: AmadeusAuthResponse = await response.json();

    // Cache the token (expires_in is in seconds, convert to milliseconds)
    // Subtract 60 seconds as a buffer to refresh before actual expiry
    const expiresAt = Date.now() + (data.expires_in - 60) * 1000;
    
    tokenCache = {
      access_token: data.access_token,
      expires_at: expiresAt,
    };

    console.log('✅ New Amadeus token obtained, expires in', data.expires_in, 'seconds');
    
    return data.access_token;
  } catch (error) {
    console.error('❌ Error getting Amadeus token:', error);
    throw error;
  }
}

/**
 * GET /api/amadeus/auth
 * Returns a valid Amadeus access token
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();

    return NextResponse.json({
      success: true,
      access_token: accessToken,
      message: 'Amadeus token retrieved successfully',
    });
  } catch (error) {
    console.error('Error in Amadeus auth route:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to authenticate with Amadeus API',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/amadeus/auth/refresh
 * Force refresh the token
 */
export async function POST(request: NextRequest) {
  try {
    // Clear cache to force refresh
    tokenCache = null;
    
    const accessToken = await getAccessToken();

    return NextResponse.json({
      success: true,
      access_token: accessToken,
      message: 'Amadeus token refreshed successfully',
    });
  } catch (error) {
    console.error('Error refreshing Amadeus token:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh Amadeus token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Export the getAccessToken function for use by other API routes
export { getAccessToken };

