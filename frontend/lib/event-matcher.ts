import { calculateDistance } from './geo-helpers';

interface Event {
  id: number;
  latitude: number;
  longitude: number;
  start_date: Date;
  end_date: Date;
}

interface Deal {
  id: string;
  dest_lat: number;
  dest_lng: number;
  departure_date: Date;
  return_date: Date;
  price: number;
}

// Auto-match deals to events based on geography, dates, and price
export function matchDealToEvent(
  deal: Deal,
  event: Event
): { isMatch: boolean; relevanceScore: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // 1. Geographic match (50% weight)
  const distance = calculateDistance(
    event.latitude,
    event.longitude,
    deal.dest_lat,
    deal.dest_lng
  );

  if (distance <= 50) {
    score += 0.5;
    reasons.push(`Within ${distance.toFixed(0)}km of event venue`);
  } else if (distance <= 100) {
    score += 0.25;
    reasons.push(`Nearby (${distance.toFixed(0)}km)`);
  }

  // 2. Date overlap (30% weight)
  const dealStart = new Date(deal.departure_date);
  const dealEnd = new Date(deal.return_date);
  const eventStart = new Date(event.start_date);
  const eventEnd = new Date(event.end_date);

  // Allow 2-day buffer before/after event
  const bufferDays = 2;
  const eventStartBuffer = new Date(eventStart);
  eventStartBuffer.setDate(eventStartBuffer.getDate() - bufferDays);
  const eventEndBuffer = new Date(eventEnd);
  eventEndBuffer.setDate(eventEndBuffer.getDate() + bufferDays);

  if (dealStart <= eventEndBuffer && dealEnd >= eventStartBuffer) {
    score += 0.3;
    reasons.push('Travel dates align with event');
  } else if (dealStart <= eventEnd && dealEnd >= eventStart) {
    score += 0.15;
    reasons.push('Partial date overlap');
  }

  // 3. Price factor (20% weight)
  if (deal.price < 500) {
    score += 0.2;
    reasons.push('Great deal price');
  } else if (deal.price < 1000) {
    score += 0.1;
    reasons.push('Good price');
  }

  return {
    isMatch: score >= 0.5,
    relevanceScore: parseFloat(score.toFixed(2)),
    reasons,
  };
}

