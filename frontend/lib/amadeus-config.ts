// Amadeus API Configuration
// Automatically switches between test and production based on environment

export const AMADEUS_CONFIG = {
  // API Credentials
  apiKey: process.env.AMADEUS_API_KEY || '1jPC5E3hCAUHDSeipXCS6ohdaOOBnFTg',
  apiSecret: process.env.AMADEUS_API_SECRET || 'baIYpyFtohMS0jtd',
  
  // Environment detection
  // Set AMADEUS_ENV=production in .env.local when you have production credentials
  environment: process.env.AMADEUS_ENV || 'test',
  
  // Base URLs - automatically selects based on environment
  get baseUrl() {
    return this.environment === 'production' 
      ? 'https://api.amadeus.com'
      : 'https://test.api.amadeus.com';
  },
  
  // API Endpoints
  get endpoints() {
    const base = this.baseUrl;
    return {
      auth: `${base}/v1/security/oauth2/token`,
      locations: `${base}/v1/reference-data/locations`,
      flightOffers: `${base}/v2/shopping/flight-offers`,
      hotelList: `${base}/v1/reference-data/locations/hotels/by-city`,
      hotelOffers: `${base}/v3/shopping/hotel-offers`,
    };
  },
  
  // Rate limits
  get rateLimits() {
    return this.environment === 'production'
      ? {
          callsPerSecond: 10,  // Production: 10 calls/sec
          monthlyLimit: 4000,  // Free tier: 4,000/month
        }
      : {
          callsPerSecond: 4,   // Test: 4 calls/sec
          monthlyLimit: 10000, // Test: 10,000/month
        };
  },
  
  // Display mode for UI
  get isTestMode() {
    return this.environment === 'test';
  },
  
  // For logging
  get statusMessage() {
    return this.environment === 'production'
      ? '✅ Using Production API - Real data'
      : '🚧 Using Test API - Demo data only';
  }
};

// Log current configuration on import
if (typeof window === 'undefined') {
  // Server-side logging
  console.log('🔧 Amadeus Configuration:', {
    environment: AMADEUS_CONFIG.environment,
    baseUrl: AMADEUS_CONFIG.baseUrl,
    status: AMADEUS_CONFIG.statusMessage,
  });
}

