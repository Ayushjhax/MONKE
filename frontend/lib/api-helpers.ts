// API Helper Functions for Smart Hybrid System
// Detects test data quality and manages fallback logic

import { type FormattedFlightOffer, type FormattedHotelOffer } from './amadeus';

export type DataSource = 'amadeus' | 'hybrid' | 'mock' | 'fallback';

// ============================================================================
// TEST DATA DETECTION
// ============================================================================

/**
 * Check if hotel results contain test/dummy data
 */
export function hasTestHotelData(hotels: FormattedHotelOffer[]): boolean {
  if (!hotels || hotels.length === 0) return false;
  
  const testIndicators = [
    'test property',
    'test hotel',
    'api activate',
    'api deactivate',
    'azure',
    'aws migration',
    'demo property',
    'sample hotel'
  ];
  
  return hotels.some(hotel => {
    const name = hotel.name.toLowerCase();
    return testIndicators.some(indicator => name.includes(indicator));
  });
}

/**
 * Check if flight results contain test/dummy data
 */
export function hasTestFlightData(flights: FormattedFlightOffer[]): boolean {
  if (!flights || flights.length === 0) return false;
  
  // Test flights often have unrealistic characteristics
  const hasUnrealisticPrices = flights.some(flight => 
    flight.price < 50 || // Too cheap
    (flight.price > 10000 && flight.duration.includes('PT1H')) // Too expensive for short flight
  );
  
  const hasTestCarriers = flights.some(flight =>
    flight.airline === 'TEST' || 
    flight.airline === 'XX' ||
    flight.airlineCodes.some(code => code.length !== 2)
  );
  
  return hasUnrealisticPrices || hasTestCarriers;
}

// ============================================================================
// RESULT ENHANCEMENT
// ============================================================================

/**
 * Merge API results with mock data, removing duplicates
 */
export function enhanceHotelResults(
  apiResults: FormattedHotelOffer[],
  mockResults: FormattedHotelOffer[]
): FormattedHotelOffer[] {
  // Create a Set of existing hotel names to avoid duplicates
  const existingNames = new Set(
    apiResults.map(h => h.name.toLowerCase())
  );
  
  // Add mock results that don't duplicate API results
  const uniqueMockResults = mockResults.filter(
    mock => !existingNames.has(mock.name.toLowerCase())
  );
  
  // Combine: API results first, then unique mock results
  return [...apiResults, ...uniqueMockResults];
}

/**
 * Merge flight results with mock data, removing duplicates
 */
export function enhanceFlightResults(
  apiResults: FormattedFlightOffer[],
  mockResults: FormattedFlightOffer[]
): FormattedFlightOffer[] {
  // Create a key from route + departure time to detect duplicates
  const existingFlights = new Set(
    apiResults.map(f => `${f.origin}-${f.destination}-${f.departureTime}`)
  );
  
  // Add mock results that don't duplicate API results
  const uniqueMockResults = mockResults.filter(
    mock => !existingFlights.has(`${mock.origin}-${mock.destination}-${mock.departureTime}`)
  );
  
  // Combine: API results first, then unique mock results
  return [...apiResults, ...uniqueMockResults];
}

// ============================================================================
// DECISION LOGIC
// ============================================================================

/**
 * Determine if API results should be enhanced with mock data
 */
export function shouldEnhanceHotels(hotels: FormattedHotelOffer[]): boolean {
  if (!hotels || hotels.length === 0) return true; // No results = enhance
  if (hotels.length < 3) return true; // Too few results = enhance
  if (hasTestHotelData(hotels)) return true; // Test data = enhance
  return false;
}

/**
 * Determine if API results should be enhanced with mock data
 */
export function shouldEnhanceFlights(flights: FormattedFlightOffer[]): boolean {
  if (!flights || flights.length === 0) return true; // No results = enhance
  if (flights.length < 2) return true; // Too few results = enhance
  if (hasTestFlightData(flights)) return true; // Test data = enhance
  return false;
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * Log data source decision for debugging
 */
export function logDataSourceDecision(
  type: 'hotel' | 'flight',
  decision: {
    source: DataSource;
    amadeusCount: number;
    mockCount: number;
    finalCount: number;
    reason: string;
  }
): void {
  const emoji = {
    amadeus: '✅',
    hybrid: '🔄',
    mock: '✨',
    fallback: '🛡️'
  }[decision.source];
  
  console.log(`${emoji} Data Source Decision - ${type.toUpperCase()}:`);
  console.log(`   Source: ${decision.source}`);
  console.log(`   Amadeus Results: ${decision.amadeusCount}`);
  console.log(`   Mock Results Added: ${decision.mockCount}`);
  console.log(`   Final Count: ${decision.finalCount}`);
  console.log(`   Reason: ${decision.reason}`);
}

