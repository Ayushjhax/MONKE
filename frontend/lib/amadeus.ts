// Amadeus API utility functions and TypeScript interfaces
// Production-ready implementation with error handling and type safety

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

export interface AmadeusAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  state?: string;
}

export interface AmadeusLocation {
  id: string;
  type: string;
  subType: string;
  name: string;
  detailedName: string;
  iataCode: string;
  address?: {
    cityName?: string;
    cityCode?: string;
    countryName?: string;
    countryCode?: string;
  };
}

export interface FlightSegment {
  departure: {
    iataCode: string;
    at: string;
  };
  arrival: {
    iataCode: string;
    at: string;
  };
  carrierCode: string;
  number: string;
  aircraft: {
    code: string;
  };
  duration: string;
  numberOfStops: number;
}

export interface FlightOffer {
  id: string;
  type: string;
  source: string;
  instantTicketingRequired: boolean;
  nonHomogeneous: boolean;
  oneWay: boolean;
  lastTicketingDate?: string;
  numberOfBookableSeats: number;
  itineraries: Array<{
    duration: string;
    segments: FlightSegment[];
  }>;
  price: {
    currency: string;
    total: string;
    base: string;
    fees?: Array<{
      amount: string;
      type: string;
    }>;
  };
  pricingOptions: {
    fareType: string[];
    includedCheckedBagsOnly: boolean;
  };
  validatingAirlineCodes: string[];
  travelerPricings: Array<{
    travelerId: string;
    fareOption: string;
    travelerType: string;
    price: {
      currency: string;
      total: string;
      base: string;
    };
  }>;
}

export interface HotelOffer {
  id: string;
  type: string;
  hotel: {
    type: string;
    hotelId: string;
    chainCode?: string;
    dupeId?: string;
    name: string;
    rating?: string;
    cityCode?: string;
    latitude?: number;
    longitude?: number;
    hotelDistance?: {
      distance: number;
      distanceUnit: string;
    };
    address?: {
      lines?: string[];
      postalCode?: string;
      cityName?: string;
      countryCode?: string;
    };
    contact?: {
      phone?: string;
      fax?: string;
    };
    description?: {
      lang?: string;
      text?: string;
    };
    amenities?: string[];
    media?: Array<{
      uri: string;
      category?: string;
    }>;
  };
  available: boolean;
  offers: Array<{
    id: string;
    checkInDate: string;
    checkOutDate: string;
    rateCode?: string;
    room: {
      type: string;
      typeEstimated: {
        category: string;
        beds: number;
        bedType: string;
      };
      description?: {
        text: string;
      };
    };
    guests: {
      adults: number;
    };
    price: {
      currency: string;
      base: string;
      total: string;
      variations?: {
        average: {
          base: string;
        };
        changes: Array<{
          startDate: string;
          endDate: string;
          total: string;
        }>;
      };
    };
    policies?: {
      cancellations?: Array<{
        deadline: string;
        amount?: string;
      }>;
      paymentType?: string;
    };
  }>;
}

export interface FormattedFlightOffer {
  id: string;
  airline: string;
  airlineCodes: string[];
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  price: number;
  currency: string;
  seats: number;
  segments: FlightSegment[];
  rawOffer: FlightOffer;
}

export interface FormattedHotelOffer {
  id: string;
  hotelId: string;
  name: string;
  rating?: string;
  cityCode?: string;
  address?: string;
  amenities?: string[];
  imageUrl?: string;
  checkInDate: string;
  checkOutDate: string;
  price: number;
  currency: string;
  roomType: string;
  roomDescription?: string;
  cancellationPolicy?: string;
  rawOffer: HotelOffer;
}

export interface BookingSimulation {
  bookingReference: string;
  userWallet: string;
  dealType: 'flight' | 'hotel';
  originalPrice: number;
  discountApplied: number;
  finalPrice: number;
  couponCode?: string;
  bookingDetails: any;
  status: 'confirmed' | 'cancelled';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format flight offer data from Amadeus API response
 */
export function formatFlightOffer(offer: FlightOffer): FormattedFlightOffer {
  const firstItinerary = offer.itineraries[0];
  const firstSegment = firstItinerary.segments[0];
  const lastSegment = firstItinerary.segments[firstItinerary.segments.length - 1];
  
  return {
    id: offer.id,
    airline: offer.validatingAirlineCodes[0],
    airlineCodes: offer.validatingAirlineCodes,
    origin: firstSegment.departure.iataCode,
    destination: lastSegment.arrival.iataCode,
    departureTime: firstSegment.departure.at,
    arrivalTime: lastSegment.arrival.at,
    duration: firstItinerary.duration,
    stops: firstItinerary.segments.length - 1,
    price: parseFloat(offer.price.total),
    currency: offer.price.currency,
    seats: offer.numberOfBookableSeats,
    segments: firstItinerary.segments,
    rawOffer: offer
  };
}

/**
 * Format hotel offer data from Amadeus API response
 */
export function formatHotelOffer(offer: HotelOffer): FormattedHotelOffer {
  const firstOffer = offer.offers[0];
  const hotel = offer.hotel;
  
  // Build address string
  let address = '';
  if (hotel.address) {
    const parts = [
      ...(hotel.address.lines || []),
      hotel.address.cityName,
      hotel.address.countryCode
    ].filter(Boolean);
    address = parts.join(', ');
  }
  
  return {
    id: offer.id,
    hotelId: hotel.hotelId,
    name: hotel.name,
    rating: hotel.rating,
    cityCode: hotel.cityCode,
    address,
    amenities: hotel.amenities,
    imageUrl: hotel.media?.[0]?.uri,
    checkInDate: firstOffer.checkInDate,
    checkOutDate: firstOffer.checkOutDate,
    price: parseFloat(firstOffer.price.total),
    currency: firstOffer.price.currency,
    roomType: firstOffer.room.typeEstimated.category,
    roomDescription: firstOffer.room.description?.text,
    cancellationPolicy: firstOffer.policies?.cancellations?.[0]?.deadline,
    rawOffer: offer
  };
}

/**
 * Calculate price with discount applied
 */
export function calculateDiscountedPrice(
  originalPrice: number,
  discountPercent: number
): { discountAmount: number; finalPrice: number } {
  const discountAmount = (originalPrice * discountPercent) / 100;
  const finalPrice = originalPrice - discountAmount;
  
  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100
  };
}

/**
 * Generate unique booking reference (6 characters)
 */
export function generateBookingReference(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let reference = '';
  for (let i = 0; i < 6; i++) {
    reference += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return reference;
}

/**
 * Format ISO duration (PT2H30M) to readable string
 */
export function formatDuration(isoDuration: string): string {
  const matches = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!matches) return isoDuration;
  
  const hours = matches[1] ? parseInt(matches[1]) : 0;
  const minutes = matches[2] ? parseInt(matches[2]) : 0;
  
  if (hours && minutes) {
    return `${hours}h ${minutes}m`;
  } else if (hours) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Format date for display
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format date and time for display
 */
export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format price with currency
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(price);
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Get date in YYYY-MM-DD format
 */
export function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get airline name from IATA code
 */
export function getAirlineName(code: string): string {
  const airlines: { [key: string]: string } = {
    'AA': 'American Airlines',
    'UA': 'United Airlines',
    'DL': 'Delta Air Lines',
    'BA': 'British Airways',
    'LH': 'Lufthansa',
    'AF': 'Air France',
    'KL': 'KLM',
    'EK': 'Emirates',
    'QR': 'Qatar Airways',
    'SQ': 'Singapore Airlines',
    'NH': 'All Nippon Airways',
    'JL': 'Japan Airlines',
    'CX': 'Cathay Pacific',
    'TK': 'Turkish Airlines',
    'EY': 'Etihad Airways'
  };
  
  return airlines[code] || code;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on 4xx errors (except 429 rate limit)
      if (error instanceof Error && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500 && status !== 429) {
          throw error;
        }
      }
      
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Retry attempt ${i + 1} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
  private queue: Array<() => void> = [];
  private lastCallTime: number = 0;
  private minInterval: number;
  
  constructor(callsPerSecond: number = 4) {
    this.minInterval = 1000 / callsPerSecond;
  }
  
  async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    if (timeSinceLastCall < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastCall)
      );
    }
    
    this.lastCallTime = Date.now();
  }
}

// Global rate limiter instance
export const amadeusRateLimiter = new RateLimiter(4);

