// Script to populate database with sample collections
import { createCollection, initializeDatabase } from '../lib/db';

const sampleCollections = [
  {
    name: "Marina Bay Sands - 20% Off Dining",
    symbol: "MBS20",
    description: "Enjoy 20% off on all dining experiences at Marina Bay Sands. Valid for all restaurants and cafes.",
    image_url: "https://ayushjhax.github.io/restaurant-discount.jpg",
    collection_mint: "CollectionMint1",
    merkle_tree: "MerkleTree1",
    merchant_id: "marina-bay-sands",
    merchant_name: "Marina Bay Sands",
    merchant_wallet: "MerchantWallet1",
    category: "Restaurant",
    discount_percent: 20,
    original_price: 100,
    discounted_price: 80,
    location: "Singapore",
    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    max_uses: 100,
    current_uses: 0,
    status: "Active" as const
  },
  {
    name: "Emirates Airlines - 15% Off Flights",
    symbol: "EMR15",
    description: "Get 15% off on all Emirates flights to Tokyo. Book your next adventure with us!",
    image_url: "https://ayushjhax.github.io/flight-discount.png",
    collection_mint: "CollectionMint2",
    merkle_tree: "MerkleTree2",
    merchant_id: "emirates-airlines",
    merchant_name: "Emirates Airlines",
    merchant_wallet: "MerchantWallet2",
    category: "Flight",
    discount_percent: 15,
    original_price: 800,
    discounted_price: 680,
    location: "Global",
    expiry_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
    max_uses: 50,
    current_uses: 0,
    status: "Active" as const
  },
  {
    name: "Qatar Airways - 25% Off Flights",
    symbol: "QTR25",
    description: "Special 25% discount on Qatar Airways flights to Europe. Limited time offer!",
    image_url: "https://ayushjhax.github.io/flight-discount.png",
    collection_mint: "CollectionMint3",
    merkle_tree: "MerkleTree3",
    merchant_id: "qatar-airways",
    merchant_name: "Qatar Airways",
    merchant_wallet: "MerchantWallet3",
    category: "Flight",
    discount_percent: 25,
    original_price: 1000,
    discounted_price: 750,
    location: "Global",
    expiry_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days from now
    max_uses: 30,
    current_uses: 0,
    status: "Active" as const
  },
  {
    name: "Marriott Hotels - 30% Off Stays",
    symbol: "MRT30",
    description: "Enjoy 30% off on all Marriott hotel stays worldwide. Perfect for your next vacation!",
    image_url: "https://ayushjhax.github.io/hotel-discount.jpg",
    collection_mint: "CollectionMint4",
    merkle_tree: "MerkleTree4",
    merchant_id: "marriott-hotels",
    merchant_name: "Marriott Hotels",
    merchant_wallet: "MerchantWallet4",
    category: "Hotel",
    discount_percent: 30,
    original_price: 200,
    discounted_price: 140,
    location: "Global",
    expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
    max_uses: 200,
    current_uses: 0,
    status: "Active" as const
  },
  {
    name: "Hilton Hotels - 20% Off Stays",
    symbol: "HLT20",
    description: "Get 20% off on Hilton hotel bookings. Experience luxury at a discounted price!",
    image_url: "https://ayushjhax.github.io/hotel-discount.jpg",
    collection_mint: "CollectionMint5",
    merkle_tree: "MerkleTree5",
    merchant_id: "hilton-hotels",
    merchant_name: "Hilton Hotels",
    merchant_wallet: "MerchantWallet5",
    category: "Hotel",
    discount_percent: 20,
    original_price: 300,
    discounted_price: 240,
    location: "Global",
    expiry_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
    max_uses: 150,
    current_uses: 0,
    status: "Active" as const
  },
  {
    name: "Sky Tokyo Restaurant - 15% Off Dining",
    symbol: "SKY15",
    description: "Experience authentic Japanese cuisine with 15% off at Sky Tokyo Restaurant.",
    image_url: "https://ayushjhax.github.io/restaurant-discount.jpg",
    collection_mint: "CollectionMint6",
    merkle_tree: "MerkleTree6",
    merchant_id: "sky-tokyo",
    merchant_name: "Sky Tokyo Restaurant",
    merchant_wallet: "MerchantWallet6",
    category: "Restaurant",
    discount_percent: 15,
    original_price: 80,
    discounted_price: 68,
    location: "Tokyo, Japan",
    expiry_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days from now
    max_uses: 75,
    current_uses: 0,
    status: "Active" as const
  }
];

async function populateDatabase() {
  try {
    console.log('🚀 Initializing database...');
    await initializeDatabase();
    
    console.log('📦 Adding sample collections...');
    for (const collection of sampleCollections) {
      try {
        await createCollection(collection);
        console.log(`✅ Added: ${collection.name}`);
      } catch (error) {
        console.error(`❌ Failed to add ${collection.name}:`, error);
      }
    }
    
    console.log('🎉 Database populated successfully!');
  } catch (error) {
    console.error('❌ Error populating database:', error);
  }
}

// Run the script
populateDatabase();
