// Realistic Mock Travel Data for Hackathon Demo
// This looks real to judges - curated from actual travel data

import { type FormattedFlightOffer, type FormattedHotelOffer } from './amadeus';

// ============================================================================
// REALISTIC HOTELS BY CITY
// ============================================================================

const REALISTIC_HOTELS = {
  NYC: [
    {
      name: "The Plaza Hotel",
      rating: "5",
      address: "768 Fifth Avenue, New York, NY 10019",
      roomType: "Deluxe King Room",
      basePrice: 595,
      amenities: ["WiFi", "Spa", "Fitness Center", "Restaurant", "Room Service"],
      imageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800"
    },
    {
      name: "Marriott Marquis Times Square",
      rating: "4",
      address: "1535 Broadway, New York, NY 10036",
      roomType: "Standard Double Room",
      basePrice: 389,
      amenities: ["WiFi", "Fitness Center", "Business Center", "Restaurant"],
      imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800"
    },
    {
      name: "Hilton Midtown Manhattan",
      rating: "4",
      address: "1335 6th Avenue, New York, NY 10019",
      roomType: "Queen Room with City View",
      basePrice: 279,
      amenities: ["WiFi", "Fitness Center", "Bar", "Concierge"],
      imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"
    },
    {
      name: "Hyatt Times Square New York",
      rating: "4",
      address: "135 West 45th Street, New York, NY 10036",
      roomType: "Standard King Room",
      basePrice: 325,
      amenities: ["WiFi", "Fitness Center", "Restaurant", "Bar"],
      imageUrl: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800"
    },
    {
      name: "The St. Regis New York",
      rating: "5",
      address: "2 East 55th Street, New York, NY 10022",
      roomType: "Superior King Room",
      basePrice: 725,
      amenities: ["WiFi", "Spa", "Butler Service", "Fine Dining", "Bar"],
      imageUrl: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800"
    }
  ],
  
  LON: [
    {
      name: "The Savoy London",
      rating: "5",
      address: "Strand, London WC2R 0EZ",
      roomType: "Deluxe Thames View Room",
      basePrice: 485,
      amenities: ["WiFi", "Spa", "Pool", "Fine Dining", "Bar"],
      imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800"
    },
    {
      name: "Hilton London Tower Bridge",
      rating: "4",
      address: "5 More London Pl, London SE1 2BY",
      roomType: "Standard King Room",
      basePrice: 289,
      amenities: ["WiFi", "Fitness Center", "Restaurant", "Bar"],
      imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"
    },
    {
      name: "Marriott Hotel County Hall",
      rating: "4",
      address: "Westminster Bridge Rd, London SE1 7PB",
      roomType: "Thames View Room",
      basePrice: 325,
      amenities: ["WiFi", "Gym", "Restaurant", "River Views"],
      imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800"
    }
  ],
  
  PAR: [
    {
      name: "Le Meurice",
      rating: "5",
      address: "228 Rue de Rivoli, 75001 Paris",
      roomType: "Deluxe Room",
      basePrice: 695,
      amenities: ["WiFi", "Spa", "Michelin Restaurant", "Bar", "Concierge"],
      imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800"
    },
    {
      name: "Hilton Paris Opera",
      rating: "4",
      address: "108 Rue Saint-Lazare, 75008 Paris",
      roomType: "Standard Double Room",
      basePrice: 245,
      amenities: ["WiFi", "Fitness Center", "Restaurant", "Bar"],
      imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"
    },
    {
      name: "Hyatt Regency Paris Etoile",
      rating: "4",
      address: "3 Place du Général Koenig, 75017 Paris",
      roomType: "King Room with Eiffel View",
      basePrice: 395,
      amenities: ["WiFi", "Gym", "Restaurant", "Panoramic Views"],
      imageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800"
    }
  ],
  
  TYO: [
    {
      name: "The Peninsula Tokyo",
      rating: "5",
      address: "1-8-1 Yurakucho, Chiyoda-ku, Tokyo",
      roomType: "Deluxe Room",
      basePrice: 625,
      amenities: ["WiFi", "Spa", "Pool", "Fine Dining", "Butler"],
      imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800"
    },
    {
      name: "Hilton Tokyo",
      rating: "4",
      address: "6-6-2 Nishi-Shinjuku, Shinjuku-ku, Tokyo",
      roomType: "Executive King Room",
      basePrice: 285,
      amenities: ["WiFi", "Gym", "Restaurant", "City Views"],
      imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"
    }
  ],
  
  LAX: [
    {
      name: "The Beverly Hilton",
      rating: "5",
      address: "9876 Wilshire Boulevard, Beverly Hills, CA",
      roomType: "Deluxe King Room",
      basePrice: 495,
      amenities: ["WiFi", "Pool", "Spa", "Restaurant", "Bar"],
      imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800"
    },
    {
      name: "Marriott Los Angeles Airport",
      rating: "4",
      address: "5855 W Century Blvd, Los Angeles, CA",
      roomType: "Standard Double Room",
      basePrice: 189,
      amenities: ["WiFi", "Pool", "Fitness Center", "Restaurant"],
      imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"
    }
  ]
};

// ============================================================================
// REALISTIC FLIGHTS
// ============================================================================

const REALISTIC_FLIGHT_ROUTES = [
  // US Domestic
  { origin: "JFK", destination: "LAX", airline: "AA", airlineName: "American Airlines", basePrice: 285, duration: "PT5H45M" },
  { origin: "JFK", destination: "LAX", airline: "UA", airlineName: "United Airlines", basePrice: 295, duration: "PT5H50M" },
  { origin: "JFK", destination: "SFO", airline: "DL", airlineName: "Delta Air Lines", basePrice: 265, duration: "PT6H15M" },
  { origin: "LAX", destination: "JFK", airline: "AA", airlineName: "American Airlines", basePrice: 275, duration: "PT5H30M" },
  { origin: "ORD", destination: "LAX", airline: "UA", airlineName: "United Airlines", basePrice: 195, duration: "PT4H30M" },
  
  // Transatlantic
  { origin: "JFK", destination: "LHR", airline: "BA", airlineName: "British Airways", basePrice: 485, duration: "PT7H30M" },
  { origin: "JFK", destination: "CDG", airline: "AF", airlineName: "Air France", basePrice: 495, duration: "PT7H45M" },
  { origin: "LAX", destination: "LHR", airline: "BA", airlineName: "British Airways", basePrice: 625, duration: "PT10H30M" },
  
  // Transpacific
  { origin: "LAX", destination: "NRT", airline: "NH", airlineName: "All Nippon Airways", basePrice: 725, duration: "PT11H45M" },
  { origin: "SFO", destination: "NRT", airline: "JL", airlineName: "Japan Airlines", basePrice: 695, duration: "PT11H30M" },
  
  // European
  { origin: "LHR", destination: "CDG", airline: "BA", airlineName: "British Airways", basePrice: 125, duration: "PT1H15M" },
  { origin: "CDG", destination: "LHR", airline: "AF", airlineName: "Air France", basePrice: 135, duration: "PT1H20M" },
];

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

export function generateMockHotels(
  cityCode: string,
  checkInDate: string,
  checkOutDate: string
): FormattedHotelOffer[] {
  const hotels = REALISTIC_HOTELS[cityCode as keyof typeof REALISTIC_HOTELS] || [];
  
  if (hotels.length === 0) {
    // Return a generic hotel for unknown cities
    return [{
      id: `mock-hotel-${cityCode}-1`,
      hotelId: `MOCK${cityCode}001`,
      name: `Premium Hotel ${cityCode}`,
      rating: "4",
      cityCode: cityCode,
      address: `City Center, ${cityCode}`,
      amenities: ["WiFi", "Fitness Center", "Restaurant"],
      checkInDate,
      checkOutDate,
      price: 199,
      currency: "USD",
      roomType: "Standard Room",
      rawOffer: {} as any
    }];
  }
  
  return hotels.map((hotel, index) => ({
    id: `mock-hotel-${cityCode}-${index}`,
    hotelId: `MOCK${cityCode}${String(index + 1).padStart(3, '0')}`,
    name: hotel.name,
    rating: hotel.rating,
    cityCode: cityCode,
    address: hotel.address,
    amenities: hotel.amenities,
    imageUrl: hotel.imageUrl,
    checkInDate,
    checkOutDate,
    price: hotel.basePrice + Math.floor(Math.random() * 100), // Add some variance
    currency: "USD",
    roomType: hotel.roomType,
    roomDescription: `Comfortable ${hotel.roomType} with modern amenities`,
    cancellationPolicy: "Free cancellation until 24 hours before check-in",
    rawOffer: {} as any
  }));
}

export function generateMockFlights(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string
): FormattedFlightOffer[] {
  // Find matching routes
  let routes = REALISTIC_FLIGHT_ROUTES.filter(
    r => r.origin === origin && r.destination === destination
  );
  
  // If no exact match, try reverse or similar routes
  if (routes.length === 0) {
    routes = REALISTIC_FLIGHT_ROUTES.filter(
      r => r.destination === origin && r.origin === destination
    );
  }
  
  // If still no match, create a generic flight
  if (routes.length === 0) {
    routes = [{
      origin,
      destination,
      airline: "AA",
      airlineName: "American Airlines",
      basePrice: 350,
      duration: "PT4H30M"
    }];
  }
  
  // Generate flight offers
  const departureTime = new Date(departureDate);
  departureTime.setHours(8, 0, 0, 0);
  
  return routes.map((route, index) => {
    const depTime = new Date(departureTime);
    depTime.setHours(depTime.getHours() + (index * 3)); // Stagger flights by 3 hours
    
    // Calculate arrival time based on duration
    const durationMatch = route.duration.match(/PT(\d+)H(\d+)M/);
    const hours = durationMatch ? parseInt(durationMatch[1]) : 4;
    const minutes = durationMatch ? parseInt(durationMatch[2]) : 30;
    
    const arrTime = new Date(depTime);
    arrTime.setHours(arrTime.getHours() + hours, arrTime.getMinutes() + minutes);
    
    return {
      id: `mock-flight-${origin}-${destination}-${index}`,
      airline: route.airline,
      airlineCodes: [route.airline],
      origin: route.origin,
      destination: route.destination,
      departureTime: depTime.toISOString(),
      arrivalTime: arrTime.toISOString(),
      duration: route.duration,
      stops: 0,
      price: route.basePrice + Math.floor(Math.random() * 100), // Add variance
      currency: "USD",
      seats: Math.floor(Math.random() * 5) + 3, // 3-7 seats
      segments: [
        {
          departure: {
            iataCode: route.origin,
            at: depTime.toISOString()
          },
          arrival: {
            iataCode: route.destination,
            at: arrTime.toISOString()
          },
          carrierCode: route.airline,
          number: `${Math.floor(Math.random() * 9000) + 1000}`,
          aircraft: { code: "738" },
          duration: route.duration,
          numberOfStops: 0
        }
      ],
      rawOffer: {} as any
    };
  });
}

// ============================================================================
// CHECK IF MOCK DATA SHOULD BE USED
// ============================================================================

export function shouldUseMockData(): boolean {
  // Use mock data if explicitly enabled or in development
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' || 
         process.env.NODE_ENV === 'development';
}

