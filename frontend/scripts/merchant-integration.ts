// Merchant Integration Script
// This script helps merchants automatically add their collections to the marketplace

import { addCollectionToMarketplace, convertToMarketplaceFormat } from '../lib/marketplace-utils';

// Example usage for merchants
export async function integrateMerchantCollection(
  collectionData: {
    name: string;
    symbol: string;
    description: string;
    imageUrl: string;
    collectionMint: string;
    merkleTree: string;
  },
  merchantData: {
    merchantId: string;
    businessName: string;
    walletAddress: string;
  },
  discountData: {
    category: string;
    discountPercent: number;
    originalPrice: number;
    discountedPrice: number;
    location: string;
    expiryDate: string;
    maxUses: number;
  }
) {
  try {
    console.log('🔄 Integrating collection with marketplace...');
    
    // Convert to marketplace format
    const marketplaceCollection = convertToMarketplaceFormat(
      collectionData,
      merchantData,
      discountData
    );
    
    // Add to marketplace database
    const result = await addCollectionToMarketplace(marketplaceCollection);
    
    if (result.success) {
      console.log('✅ Collection successfully added to marketplace!');
      console.log(`📋 Collection: ${collectionData.name}`);
      console.log(`🏪 Merchant: ${merchantData.businessName}`);
      console.log(`💰 Discount: ${discountData.discountPercent}% off`);
      return { success: true };
    } else {
      console.error('❌ Failed to add collection to marketplace:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Error integrating collection:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Example integration for Marina Bay Sands
export async function exampleIntegration() {
  const collectionData = {
    name: "Marina Bay Sands - 20% Off Dining",
    symbol: "MBS20",
    description: "Enjoy 20% off on all dining experiences at Marina Bay Sands",
    imageUrl: "https://ayushjhax.github.io/restaurant-discount.jpg",
    collectionMint: "CollectionMint1",
    merkleTree: "MerkleTree1"
  };

  const merchantData = {
    merchantId: "marina-bay-sands",
    businessName: "Marina Bay Sands",
    walletAddress: "MerchantWallet1"
  };

  const discountData = {
    category: "Restaurant",
    discountPercent: 20,
    originalPrice: 100,
    discountedPrice: 80,
    location: "Singapore",
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    maxUses: 100
  };

  return await integrateMerchantCollection(collectionData, merchantData, discountData);
}

// Run example if this file is executed directly
if (require.main === module) {
  exampleIntegration().then(result => {
    if (result.success) {
      console.log('🎉 Example integration completed successfully!');
    } else {
      console.error('💥 Example integration failed:', result.error);
    }
  });
}
