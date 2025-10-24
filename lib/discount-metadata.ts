// Discount Metadata Generation for cNFTs
import { DealData, DiscountMetadata, DiscountAttribute } from '../types/discount';
import * as crypto from 'crypto';

/**
 * Creates standardized discount metadata for cNFT minting
 */
export const createDiscountMetadata = (dealData: DealData): DiscountMetadata => {
  const attributes: DiscountAttribute[] = [
    // Pricing
    { trait_type: "Discount Percentage", value: dealData.discountPercent },
    { trait_type: "Original Price", value: `${dealData.currency}${dealData.originalPrice}` },
    { trait_type: "Discounted Price", value: `${dealData.currency}${dealData.discountedPrice}` },
    { trait_type: "Savings", value: `${dealData.currency}${dealData.originalPrice - dealData.discountedPrice}` },
    { trait_type: "Currency", value: dealData.currency },
    
    // Merchant
    { trait_type: "Merchant", value: dealData.merchantName },
    { trait_type: "Merchant ID", value: dealData.merchantId },
    { trait_type: "Merchant Wallet", value: dealData.merchantWallet },
    
    // Category & Location
    { trait_type: "Category", value: dealData.category },
    { trait_type: "Location", value: dealData.location },
    
    // Validity
    { trait_type: "Expiry Date", value: dealData.expiryDate },
    { trait_type: "Valid Until", value: new Date(dealData.expiryDate).toLocaleDateString() },
    
    // Redemption
    { trait_type: "Redemption Code", value: dealData.redemptionCode },
    { trait_type: "Max Uses", value: dealData.maxUses },
    { trait_type: "Current Uses", value: dealData.currentUses },
    { trait_type: "Status", value: dealData.status },
    { trait_type: "Transferable", value: dealData.isTransferable ? "Yes" : "No" },
    
    // Terms
    { trait_type: "Terms", value: dealData.termsAndConditions },
  ];

  // Add optional attributes
  if (dealData.minimumPurchase) {
    attributes.push({
      trait_type: "Minimum Purchase",
      value: `${dealData.currency}${dealData.minimumPurchase}`
    });
  }

  return {
    name: dealData.title,
    description: dealData.description,
    image: dealData.imageUrl,
    external_url: `https://dealcoin.app/deals/${dealData.merchantId}/${dealData.redemptionCode}`,
    attributes
  };
};

/**
 * Generates a unique redemption code
 */
export const generateRedemptionCode = (merchantId: string, dealTitle: string): string => {
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(4).toString('hex').toUpperCase();
  const prefix = merchantId.substring(0, 4).toUpperCase();
  return `${prefix}-${randomStr}-${timestamp.toString(36).toUpperCase()}`;
};

/**
 * Validates discount metadata structure
 */
export const validateDiscountMetadata = (metadata: DiscountMetadata): boolean => {
  if (!metadata.name || !metadata.description || !metadata.image) {
    return false;
  }

  const requiredTraits = [
    'Discount Percentage',
    'Original Price',
    'Discounted Price',
    'Merchant',
    'Category',
    'Expiry Date',
    'Redemption Code',
    'Status'
  ];

  const hasAllTraits = requiredTraits.every(trait =>
    metadata.attributes.some(attr => attr.trait_type === trait)
  );

  return hasAllTraits;
};

/**
 * Extracts discount data from metadata
 */
export const parseDiscountMetadata = (metadata: DiscountMetadata): Partial<DealData> => {
  const getAttributeValue = (traitType: string): any => {
    const attr = metadata.attributes.find(a => a.trait_type === traitType);
    return attr?.value;
  };

  return {
    title: metadata.name,
    description: metadata.description,
    imageUrl: metadata.image,
    discountPercent: Number(getAttributeValue('Discount Percentage')),
    merchantName: String(getAttributeValue('Merchant')),
    merchantId: String(getAttributeValue('Merchant ID')),
    category: getAttributeValue('Category') as any,
    location: String(getAttributeValue('Location')),
    expiryDate: String(getAttributeValue('Expiry Date')),
    redemptionCode: String(getAttributeValue('Redemption Code')),
    maxUses: Number(getAttributeValue('Max Uses')),
    currentUses: Number(getAttributeValue('Current Uses')),
    status: getAttributeValue('Status') as any,
  };
};

