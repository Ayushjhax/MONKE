// Setup Demo Data for DealCoin Platform
import * as fs from 'fs';
import { DealData, MerchantData } from '../types/discount.js';

const DEALS_FILE = './data/deals.json';
const MERCHANTS_FILE = './data/merchants.json';

// Demo Merchants
const demoMerchants: MerchantData[] = [
  {
    merchantId: 'mbs-singapore',
    businessName: 'Marina Bay Sands',
    businessType: 'Hotel',
    walletAddress: '7xKXtg2CW87d97kKXEsB3zLnhPvMqjaCGfHQ9h9DqZyM',
    logoUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945',
    description: 'Luxury hotel and integrated resort in Singapore',
    website: 'https://marinabaysands.com',
    verified: true
  },
  {
    merchantId: 'sky-travel',
    businessName: 'SkyTravel Airlines',
    businessType: 'Airlines',
    walletAddress: '8yKXtg2CW87d97kKXEsB3zLnhPvMqjaCGfHQ9h9DqZyN',
    logoUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05',
    description: 'Global airline connecting major cities',
    website: 'https://skytravel.com',
    verified: true
  },
  {
    merchantId: 'le-cordon-bleu',
    businessName: 'Le Cordon Bleu',
    businessType: 'Restaurant',
    walletAddress: '9zKXtg2CW87d97kKXEsB3zLnhPvMqjaCGfHQ9h9DqZyO',
    logoUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0',
    description: 'Michelin-starred fine dining restaurant',
    website: 'https://lecordonbleu.com',
    verified: true
  },
  {
    merchantId: 'adventure-sports',
    businessName: 'Adventure Sports Co',
    businessType: 'Experience',
    walletAddress: '1aKXtg2CW87d97kKXEsB3zLnhPvMqjaCGfHQ9h9DqZyP',
    logoUrl: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e',
    description: 'Extreme sports and adventure experiences',
    website: 'https://adventuresports.com',
    verified: true
  },
  {
    merchantId: 'fashion-store',
    businessName: 'Fashion Forward',
    businessType: 'Retail',
    walletAddress: '2bKXtg2CW87d97kKXEsB3zLnhPvMqjaCGfHQ9h9DqZyQ',
    logoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
    description: 'Premium fashion and accessories',
    website: 'https://fashionforward.com',
    verified: true
  }
];

// Demo Deals
const demoDeals: DealData[] = [
  {
    title: '20% Off Luxury Hotel Stay in Singapore',
    description: 'Experience world-class luxury at Marina Bay Sands. Valid for 3 nights in a Deluxe Room with stunning city views.',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    discountPercent: 20,
    originalPrice: 800,
    discountedPrice: 640,
    currency: 'USD',
    merchantName: 'Marina Bay Sands',
    merchantId: 'mbs-singapore',
    merchantWallet: '7xKXtg2CW87d97kKXEsB3zLnhPvMqjaCGfHQ9h9DqZyM',
    category: 'Hotel',
    location: 'Singapore',
    expiryDate: new Date('2024-12-31').toISOString(),
    redemptionCode: 'MBS-20OFF-2024',
    maxUses: 1,
    currentUses: 0,
    termsAndConditions: 'Valid for 3 nights stay. Subject to availability. Cannot be combined with other offers.',
    minimumPurchase: 600,
    status: 'Active',
    isTransferable: true
  },
  {
    title: '15% Off Flight to Tokyo',
    description: 'Discover Japan with our exclusive discount. Valid for round-trip economy class flights from any major city to Tokyo.',
    imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800',
    discountPercent: 15,
    originalPrice: 1200,
    discountedPrice: 1020,
    currency: 'USD',
    merchantName: 'SkyTravel Airlines',
    merchantId: 'sky-travel',
    merchantWallet: '8yKXtg2CW87d97kKXEsB3zLnhPvMqjaCGfHQ9h9DqZyN',
    category: 'Flight',
    location: 'Tokyo, Japan',
    expiryDate: new Date('2024-11-30').toISOString(),
    redemptionCode: 'SKY-TOKYO15-2024',
    maxUses: 1,
    currentUses: 0,
    termsAndConditions: 'Valid for economy class only. Blackout dates may apply. Subject to availability.',
    minimumPurchase: 1000,
    status: 'Active',
    isTransferable: true
  },
  {
    title: '30% Off Michelin-Star Dining Experience',
    description: 'Indulge in an exquisite 7-course tasting menu at Le Cordon Bleu, Paris. Wine pairing included.',
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    discountPercent: 30,
    originalPrice: 200,
    discountedPrice: 140,
    currency: 'USD',
    merchantName: 'Le Cordon Bleu',
    merchantId: 'le-cordon-bleu',
    merchantWallet: '9zKXtg2CW87d97kKXEsB3zLnhPvMqjaCGfHQ9h9DqZyO',
    category: 'Restaurant',
    location: 'Paris, France',
    expiryDate: new Date('2024-10-31').toISOString(),
    redemptionCode: 'LCB-DINING30-2024',
    maxUses: 1,
    currentUses: 0,
    termsAndConditions: 'Valid for dinner service only. Reservation required 48 hours in advance. Cannot be used on holidays.',
    minimumPurchase: 150,
    status: 'Active',
    isTransferable: true
  },
  {
    title: '25% Off Skydiving Adventure',
    description: 'Experience the thrill of a lifetime with tandem skydiving from 15,000 feet. Professional instructors included.',
    imageUrl: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800',
    discountPercent: 25,
    originalPrice: 400,
    discountedPrice: 300,
    currency: 'USD',
    merchantName: 'Adventure Sports Co',
    merchantId: 'adventure-sports',
    merchantWallet: '1aKXtg2CW87d97kKXEsB3zLnhPvMqjaCGfHQ9h9DqZyP',
    category: 'Experience',
    location: 'Dubai, UAE',
    expiryDate: new Date('2025-03-31').toISOString(),
    redemptionCode: 'ADV-SKY25-2024',
    maxUses: 1,
    currentUses: 0,
    termsAndConditions: 'Weight limit: 220 lbs. Weather dependent. Must be 18+ years old.',
    minimumPurchase: 300,
    status: 'Active',
    isTransferable: true
  },
  {
    title: '40% Off Designer Fashion Collection',
    description: 'Shop the latest designer collections with an exclusive discount. Limited time offer on selected items.',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    discountPercent: 40,
    originalPrice: 500,
    discountedPrice: 300,
    currency: 'USD',
    merchantName: 'Fashion Forward',
    merchantId: 'fashion-store',
    merchantWallet: '2bKXtg2CW87d97kKXEsB3zLnhPvMqjaCGfHQ9h9DqZyQ',
    category: 'Shopping',
    location: 'New York, USA',
    expiryDate: new Date('2024-12-15').toISOString(),
    redemptionCode: 'FF-FASHION40-2024',
    maxUses: 1,
    currentUses: 0,
    termsAndConditions: 'Valid on selected items only. Cannot be combined with sale items. In-store and online.',
    minimumPurchase: 400,
    status: 'Active',
    isTransferable: true
  },
  {
    title: '50% Off Weekend Spa Retreat',
    description: 'Relax and rejuvenate with a luxurious spa weekend package. Includes massages, facials, and wellness treatments.',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
    discountPercent: 50,
    originalPrice: 600,
    discountedPrice: 300,
    currency: 'USD',
    merchantName: 'Marina Bay Sands',
    merchantId: 'mbs-singapore',
    merchantWallet: '7xKXtg2CW87d97kKXEsB3zLnhPvMqjaCGfHQ9h9DqZyM',
    category: 'Experience',
    location: 'Singapore',
    expiryDate: new Date('2024-11-15').toISOString(),
    redemptionCode: 'MBS-SPA50-2024',
    maxUses: 1,
    currentUses: 0,
    termsAndConditions: 'Valid for weekends only. Advance booking required. Package includes 2 nights accommodation.',
    minimumPurchase: 500,
    status: 'Active',
    isTransferable: true
  }
];

// Setup function
const setupDemo = () => {
  console.log('🚀 Setting up DealCoin demo data...\n');

  // Create data directory if it doesn't exist
  if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data', { recursive: true });
    console.log('✅ Created data directory');
  }

  // Save merchants
  fs.writeFileSync(MERCHANTS_FILE, JSON.stringify(demoMerchants, null, 2));
  console.log(`✅ Created ${demoMerchants.length} demo merchants`);
  demoMerchants.forEach(m => {
    console.log(`   - ${m.businessName} (${m.businessType})`);
  });

  // Save deals
  fs.writeFileSync(DEALS_FILE, JSON.stringify(demoDeals, null, 2));
  console.log(`\n✅ Created ${demoDeals.length} demo deals`);
  demoDeals.forEach(d => {
    console.log(`   - ${d.title} (${d.discountPercent}% off)`);
  });

  console.log('\n🎉 Demo setup complete!');
  console.log('\n📚 Next steps:');
  console.log('   1. Start the API server: npm run dev');
  console.log('   2. Visit http://localhost:3001/api/docs');
  console.log('   3. Test the API: curl http://localhost:3001/api/deals');
  console.log('\n💡 Tip: Check API_DOCUMENTATION.md for full API reference');
};

// Run setup
setupDemo();