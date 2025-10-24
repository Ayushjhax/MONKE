// Deal Service - Business logic for deal management
import * as fs from 'fs';
import * as path from 'path';
import { DealData, DealResponse, DealFilter } from '../../types/discount.js';
import { mintDiscountCoupon } from '../../lib/discount-minter.js';
import { generateRedemptionCode } from '../../lib/discount-metadata.js';

const DEALS_FILE = './data/deals.json';

// Initialize deals file if it doesn't exist
if (!fs.existsSync('./data')) {
  fs.mkdirSync('./data', { recursive: true });
}
if (!fs.existsSync(DEALS_FILE)) {
  fs.writeFileSync(DEALS_FILE, JSON.stringify([], null, 2));
}

/**
 * Load deals from JSON file
 */
const loadDeals = (): DealData[] => {
  try {
    const data = fs.readFileSync(DEALS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading deals:', error);
    return [];
  }
};

/**
 * Save deals to JSON file
 */
const saveDeals = (deals: DealData[]): void => {
  try {
    fs.writeFileSync(DEALS_FILE, JSON.stringify(deals, null, 2));
  } catch (error) {
    console.error('Error saving deals:', error);
  }
};

/**
 * Create a new deal
 */
export const createDeal = async (dealData: DealData): Promise<DealResponse> => {
  try {
    // Set defaults
    dealData.currency = dealData.currency || 'USD';
    dealData.currentUses = 0;
    dealData.maxUses = dealData.maxUses || 1;
    dealData.status = 'Active';
    dealData.isTransferable = dealData.isTransferable !== false;

    // Generate redemption code if not provided
    if (!dealData.redemptionCode) {
      dealData.redemptionCode = generateRedemptionCode(dealData.merchantId, dealData.title);
    }

    // Calculate discounted price if not provided
    if (!dealData.discountedPrice && dealData.originalPrice && dealData.discountPercent) {
      dealData.discountedPrice = dealData.originalPrice * (1 - dealData.discountPercent / 100);
    }

    // Mint cNFT for the deal (initially owned by merchant)
    const mintResult = await mintDiscountCoupon(dealData, dealData.merchantWallet);

    if (!mintResult.success) {
      return {
        success: false,
        error: mintResult.error,
        message: 'Failed to mint discount cNFT'
      };
    }

    // Save deal to database
    const deals = loadDeals();
    deals.push(dealData);
    saveDeals(deals);

    return {
      success: true,
      dealId: dealData.redemptionCode,
      mintAddress: mintResult.mintAddress,
      signature: mintResult.signature,
      metadataUri: mintResult.metadataUri,
      message: 'Deal created successfully'
    };

  } catch (error) {
    console.error('Error creating deal:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to create deal'
    };
  }
};

/**
 * Get all deals with optional filtering
 */
export const getAllDeals = async (filters?: DealFilter): Promise<DealData[]> => {
  let deals = loadDeals();

  // Apply filters
  if (filters) {
    if (filters.category) {
      deals = deals.filter(d => d.category === filters.category);
    }
    if (filters.location) {
      deals = deals.filter(d => d.location.toLowerCase().includes(filters.location!.toLowerCase()));
    }
    if (filters.minDiscount) {
      deals = deals.filter(d => d.discountPercent >= filters.minDiscount!);
    }
    if (filters.maxPrice) {
      deals = deals.filter(d => d.discountedPrice <= filters.maxPrice!);
    }
    if (filters.merchantId) {
      deals = deals.filter(d => d.merchantId === filters.merchantId);
    }
    if (filters.status) {
      deals = deals.filter(d => d.status === filters.status);
    }
  }

  // Filter out expired deals
  const now = new Date();
  deals = deals.filter(d => new Date(d.expiryDate) > now);

  return deals;
};

/**
 * Get deal by ID
 */
export const getDealById = async (id: string): Promise<DealData | null> => {
  const deals = loadDeals();
  return deals.find(d => d.redemptionCode === id) || null;
};

/**
 * Claim a deal (transfer cNFT to user)
 */
export const claimDeal = async (dealId: string, userWallet: string): Promise<DealResponse> => {
  try {
    const deals = loadDeals();
    const dealIndex = deals.findIndex(d => d.redemptionCode === dealId);

    if (dealIndex === -1) {
      return {
        success: false,
        error: 'Deal not found',
        message: 'Deal not found'
      };
    }

    const deal = deals[dealIndex];

    // Check if deal is still active
    if (deal.status !== 'Active') {
      return {
        success: false,
        error: 'Deal is not active',
        message: 'Deal is no longer available'
      };
    }

    // Check if deal has expired
    if (new Date(deal.expiryDate) < new Date()) {
      return {
        success: false,
        error: 'Deal has expired',
        message: 'This deal has expired'
      };
    }

    // In a real implementation, this would transfer the cNFT from merchant to user
    // For MVP, we just update the status
    
    // Update deal status
    deals[dealIndex].status = 'Redeemed';
    saveDeals(deals);

    return {
      success: true,
      dealId,
      message: 'Deal claimed successfully'
    };

  } catch (error) {
    console.error('Error claiming deal:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to claim deal'
    };
  }
};

/**
 * Get deals by category
 */
export const getDealsByCategory = async (category: string): Promise<DealData[]> => {
  return getAllDeals({ category });
};

/**
 * Get deals by location
 */
export const getDealsByLocation = async (location: string): Promise<DealData[]> => {
  return getAllDeals({ location });
};

/**
 * Get deals by merchant
 */
export const getDealsByMerchant = async (merchantId: string): Promise<DealData[]> => {
  return getAllDeals({ merchantId });
};

