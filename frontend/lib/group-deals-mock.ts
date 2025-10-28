export const MOCK_DEALS = [
  {
    id: 1001,
    deal_title: 'Pizza Party Combo',
    deal_type: 'dining',
    merchant_id: 'pizzaville',
    base_price: 19.99,
    tier_type: 'by_count',
    end_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    highlight: 'Get friends, get slices, get savings',
    image: '/placeholder-nft.png',
    tiers: [
      { id: 1, rank: 1, threshold: 3, discount_percent: 5 },
      { id: 2, rank: 2, threshold: 5, discount_percent: 12 },
      { id: 3, rank: 3, threshold: 10, discount_percent: 20 }
    ]
  },
  {
    id: 1002,
    deal_title: 'Spa Day for Two',
    deal_type: 'wellness',
    merchant_id: 'calm-spa',
    base_price: 89.0,
    tier_type: 'by_volume',
    end_at: new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString(),
    highlight: 'Relax more, pay less',
    image: '/placeholder-nft.png',
    tiers: [
      { id: 4, rank: 1, threshold: 5, discount_percent: 8 },
      { id: 5, rank: 2, threshold: 15, discount_percent: 15 },
      { id: 6, rank: 3, threshold: 30, discount_percent: 25 }
    ]
  },
  {
    id: 1003,
    deal_title: 'Weekend City Hotel',
    deal_type: 'hotel',
    merchant_id: 'stay-urban',
    base_price: 129.0,
    tier_type: 'by_count',
    end_at: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    highlight: 'Sleep tight with group-night rates',
    image: '/placeholder-nft.png',
    tiers: [
      { id: 7, rank: 1, threshold: 2, discount_percent: 6 },
      { id: 8, rank: 2, threshold: 4, discount_percent: 12 },
      { id: 9, rank: 3, threshold: 8, discount_percent: 22 }
    ]
  }
];


