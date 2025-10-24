// Merchant Service - Business logic for merchant management
import * as fs from 'fs';
import { MerchantData, DealData } from '../../types/discount.js';
import { getDealsByMerchant } from './deal-service.js';

const MERCHANTS_FILE = './data/merchants.json';

// Initialize merchants file if it doesn't exist
if (!fs.existsSync('./data')) {
  fs.mkdirSync('./data', { recursive: true });
}
if (!fs.existsSync(MERCHANTS_FILE)) {
  fs.writeFileSync(MERCHANTS_FILE, JSON.stringify([], null, 2));
}

/**
 * Load merchants from JSON file
 */
const loadMerchants = (): MerchantData[] => {
  try {
    const data = fs.readFileSync(MERCHANTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading merchants:', error);
    return [];
  }
};

/**
 * Save merchants to JSON file
 */
const saveMerchants = (merchants: MerchantData[]): void => {
  try {
    fs.writeFileSync(MERCHANTS_FILE, JSON.stringify(merchants, null, 2));
  } catch (error) {
    console.error('Error saving merchants:', error);
  }
};

/**
 * Get all merchants
 */
export const getAllMerchants = async (): Promise<MerchantData[]> => {
  return loadMerchants();
};

/**
 * Get merchant by ID
 */
export const getMerchantById = async (merchantId: string): Promise<MerchantData | null> => {
  const merchants = loadMerchants();
  return merchants.find(m => m.merchantId === merchantId) || null;
};

/**
 * Register new merchant
 */
export const registerMerchant = async (
  merchantData: MerchantData
): Promise<{ success: boolean; merchant?: MerchantData; error?: string }> => {
  try {
    const merchants = loadMerchants();

    // Check if merchant already exists
    if (merchants.find(m => m.merchantId === merchantData.merchantId)) {
      return {
        success: false,
        error: 'Merchant ID already exists'
      };
    }

    // Set defaults
    merchantData.verified = merchantData.verified || false;

    // Add merchant
    merchants.push(merchantData);
    saveMerchants(merchants);

    return {
      success: true,
      merchant: merchantData
    };

  } catch (error) {
    console.error('Error registering merchant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Get merchant's deals
 */
export const getMerchantDeals = async (merchantId: string): Promise<DealData[]> => {
  return getDealsByMerchant(merchantId);
};

/**
 * Update merchant verification status
 */
export const verifyMerchant = async (
  merchantId: string,
  verified: boolean
): Promise<{ success: boolean; error?: string }> => {
  try {
    const merchants = loadMerchants();
    const merchantIndex = merchants.findIndex(m => m.merchantId === merchantId);

    if (merchantIndex === -1) {
      return {
        success: false,
        error: 'Merchant not found'
      };
    }

    merchants[merchantIndex].verified = verified;
    saveMerchants(merchants);

    return { success: true };

  } catch (error) {
    console.error('Error verifying merchant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

