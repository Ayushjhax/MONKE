// Utility functions for marketplace integration
import { createCollection } from './db';

export interface MarketplaceCollection {
  name: string;
  symbol: string;
  description: string;
  image_url: string;
  collection_mint: string;
  merkle_tree: string;
  merchant_id: string;
  merchant_name: string;
  merchant_wallet: string;
  category: string;
  discount_percent: number;
  original_price: number;
  discounted_price: number;
  location: string;
  expiry_date: string;
  max_uses: number;
  current_uses: number;
  status: 'Active' | 'Expired' | 'Paused' | 'Redeemed';
}

/**
 * Add a collection to the marketplace database
 * This should be called when a merchant creates a new collection
 */
export async function addCollectionToMarketplace(
  collectionData: MarketplaceCollection
): Promise<{ success: boolean; error?: string }> {
  try {
    await createCollection(collectionData);
    return { success: true };
  } catch (error) {
    console.error('Error adding collection to marketplace:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add collection to marketplace'
    };
  }
}

/**
 * Convert merchant collection data to marketplace format
 */
export function convertToMarketplaceFormat(
  collectionData: any,
  merchantData: any,
  discountData: any
): MarketplaceCollection {
  return {
    name: collectionData.name,
    symbol: collectionData.symbol,
    description: collectionData.description,
    image_url: collectionData.imageUrl,
    collection_mint: collectionData.collectionMint,
    merkle_tree: collectionData.merkleTree,
    merchant_id: merchantData.merchantId,
    merchant_name: merchantData.businessName,
    merchant_wallet: merchantData.walletAddress,
    category: discountData.category || 'General',
    discount_percent: discountData.discountPercent || 0,
    original_price: discountData.originalPrice || 0,
    discounted_price: discountData.discountedPrice || 0,
    location: discountData.location || 'Global',
    expiry_date: discountData.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    max_uses: discountData.maxUses || 1,
    current_uses: 0,
    status: 'Active'
  };
}
