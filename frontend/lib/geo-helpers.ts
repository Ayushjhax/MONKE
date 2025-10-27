import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  timestamp: number;
}

// Haversine formula - calculate distance between two coordinates in kilometers
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Create signed location proof (client-side only)
export async function createLocationProof(
  wallet: any,
  locationData: LocationData
): Promise<{ signature: string; message: string }> {
  const message = JSON.stringify({
    wallet: wallet.publicKey.toString(),
    lat: locationData.latitude.toFixed(6),
    lng: locationData.longitude.toFixed(6),
    timestamp: locationData.timestamp,
  });

  const encodedMessage = new TextEncoder().encode(message);
  const signature = await wallet.signMessage(encodedMessage);

  return {
    signature: bs58.encode(signature),
    message,
  };
}

// Verify location proof (server-side only)
export async function verifyLocationProof(
  walletAddress: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    const nacl = require('tweetnacl');
    const publicKey = new PublicKey(walletAddress);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );
  } catch (error) {
    console.error('Location proof verification failed:', error);
    return false;
  }
}

// Get browser geolocation with permission
export async function getUserLocation(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => {
        console.error('Geolocation error:', error);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// Reverse geocode (lat/lng → city name) using free OSM Nominatim API
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ city: string; country: string } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'DealCoin-Travel-App' } }
    );
    const data = await response.json();

    return {
      city: data.address?.city || data.address?.town || data.address?.village || 'Unknown',
      country: data.address?.country || 'Unknown',
    };
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
}

// Major airport coordinates (comprehensive list)
const AIRPORT_COORDS: Record<string, { lat: number; lng: number }> = {
  // North America
  JFK: { lat: 40.6413, lng: -73.7781 },    // New York JFK
  LAX: { lat: 33.9416, lng: -118.4085 },   // Los Angeles
  ORD: { lat: 41.9742, lng: -87.9073 },    // Chicago O'Hare
  DFW: { lat: 32.8998, lng: -97.0403 },    // Dallas Fort Worth
  DEN: { lat: 39.8561, lng: -104.6737 },   // Denver
  SFO: { lat: 37.6213, lng: -122.3790 },   // San Francisco
  SEA: { lat: 47.4502, lng: -122.3088 },   // Seattle
  MIA: { lat: 25.7959, lng: -80.2870 },    // Miami
  LAS: { lat: 36.0840, lng: -115.1537 },   // Las Vegas
  BOS: { lat: 42.3656, lng: -71.0096 },    // Boston
  ATL: { lat: 33.6407, lng: -84.4277 },    // Atlanta
  EWR: { lat: 40.6895, lng: -74.1745 },    // Newark
  IAH: { lat: 29.9902, lng: -95.3368 },    // Houston
  PHX: { lat: 33.4352, lng: -112.0101 },   // Phoenix
  YYZ: { lat: 43.6777, lng: -79.6248 },    // Toronto
  YVR: { lat: 49.1939, lng: -123.1844 },   // Vancouver
  
  // Europe
  LHR: { lat: 51.47, lng: -0.4543 },       // London Heathrow
  CDG: { lat: 49.0097, lng: 2.5479 },      // Paris Charles de Gaulle
  FRA: { lat: 50.0379, lng: 8.5622 },      // Frankfurt
  AMS: { lat: 52.3105, lng: 4.7683 },      // Amsterdam Schiphol
  MAD: { lat: 40.4983, lng: -3.5676 },     // Madrid
  BCN: { lat: 41.2974, lng: 2.0833 },      // Barcelona
  FCO: { lat: 41.8003, lng: 12.2389 },     // Rome Fiumicino
  MUC: { lat: 48.3537, lng: 11.7750 },     // Munich
  ZRH: { lat: 47.4647, lng: 8.5492 },      // Zurich
  VIE: { lat: 48.1103, lng: 16.5697 },     // Vienna
  CPH: { lat: 55.6180, lng: 12.6508 },     // Copenhagen
  OSL: { lat: 60.1976, lng: 11.1004 },     // Oslo
  ARN: { lat: 59.6498, lng: 17.9238 },     // Stockholm
  HEL: { lat: 60.3172, lng: 24.9633 },     // Helsinki
  IST: { lat: 41.2753, lng: 28.7519 },     // Istanbul
  
  // Middle East
  DXB: { lat: 25.2532, lng: 55.3657 },     // Dubai
  DOH: { lat: 25.2609, lng: 51.6138 },     // Doha
  AUH: { lat: 24.4330, lng: 54.6511 },     // Abu Dhabi
  TLV: { lat: 32.0004, lng: 34.8706 },     // Tel Aviv
  
  // Asia Pacific
  SIN: { lat: 1.3644, lng: 103.9915 },     // Singapore
  HKG: { lat: 22.3080, lng: 113.9185 },    // Hong Kong
  NRT: { lat: 35.7648, lng: 140.3863 },    // Tokyo Narita
  HND: { lat: 35.5494, lng: 139.7798 },    // Tokyo Haneda
  ICN: { lat: 37.4602, lng: 126.4407 },    // Seoul Incheon
  PEK: { lat: 40.0799, lng: 116.6031 },    // Beijing
  PVG: { lat: 31.1443, lng: 121.8083 },    // Shanghai Pudong
  BKK: { lat: 13.6900, lng: 100.7501 },    // Bangkok
  KUL: { lat: 2.7456, lng: 101.7072 },     // Kuala Lumpur
  MNL: { lat: 14.5086, lng: 121.0194 },    // Manila
  DEL: { lat: 28.5562, lng: 77.1000 },     // New Delhi
  BOM: { lat: 19.0896, lng: 72.8656 },     // Mumbai
  SYD: { lat: -33.9399, lng: 151.1753 },   // Sydney
  MEL: { lat: -37.6690, lng: 144.8410 },   // Melbourne
  AKL: { lat: -37.0082, lng: 174.7850 },   // Auckland
  
  // South America
  GRU: { lat: -23.4356, lng: -46.4731 },   // São Paulo
  GIG: { lat: -22.8099, lng: -43.2505 },   // Rio de Janeiro
  BOG: { lat: 4.7016, lng: -74.1469 },     // Bogotá
  LIM: { lat: -12.0219, lng: -77.1143 },   // Lima
  SCL: { lat: -33.3930, lng: -70.7858 },   // Santiago
  EZE: { lat: -34.8222, lng: -58.5358 },   // Buenos Aires
  
  // Africa
  JNB: { lat: -26.1392, lng: 28.2460 },    // Johannesburg
  CPT: { lat: -33.9715, lng: 18.6021 },    // Cape Town
  CAI: { lat: 30.1219, lng: 31.4056 },     // Cairo
  ADD: { lat: 8.9779, lng: 38.7992 },      // Addis Ababa
  NBO: { lat: -1.3192, lng: 36.9278 },     // Nairobi
};

export function getAirportCoordinates(
  iataCode: string
): { lat: number; lng: number } | null {
  return AIRPORT_COORDS[iataCode.toUpperCase()] || null;
}

