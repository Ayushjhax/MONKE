// Discount and Deal Types for DealCoin Platform

export interface DiscountMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: DiscountAttribute[];
}

export interface DiscountAttribute {
  trait_type: string;
  value: string | number;
}

export interface DealData {
  // Basic Info
  title: string;
  description: string;
  imageUrl: string;
  
  // Pricing
  discountPercent: number;
  originalPrice: number;
  discountedPrice: number;
  currency: string;
  
  // Merchant Info
  merchantName: string;
  merchantId: string;
  merchantWallet: string;
  
  // Deal Details
  category: 'Travel' | 'Hotel' | 'Restaurant' | 'Shopping' | 'Experience' | 'Flight';
  location: string;
  expiryDate: string; // ISO date string
  
  // Redemption
  redemptionCode: string;
  maxUses: number;
  currentUses: number;
  
  // Terms
  termsAndConditions: string;
  minimumPurchase?: number;
  
  // Status
  status: 'Active' | 'Expired' | 'Paused' | 'Redeemed';
  isTransferable: boolean;
}

export interface MerchantData {
  merchantId: string;
  businessName: string;
  businessType: string;
  walletAddress: string;
  logoUrl: string;
  description: string;
  website?: string;
  verified: boolean;
}

export interface RedemptionData {
  discountMint: string;
  redemptionCode: string;
  merchantId: string;
  merchantSignature: string;
  timestamp: number;
  userWallet: string;
}

export interface VerificationResult {
  isValid: boolean;
  discountData?: DealData;
  ownershipProof?: boolean;
  expiryStatus?: 'valid' | 'expired' | 'near_expiry';
  redemptionStatus?: 'unused' | 'used' | 'partially_used';
  merchantVerification?: boolean;
  error?: string;
}

export interface QRCodeData {
  discountMint: string;
  redemptionCode: string;
  merchantId: string;
  timestamp: number;
  version: string;
}

export interface DealResponse {
  success: boolean;
  dealId?: string;
  mintAddress?: string;
  signature?: string;
  metadataUri?: string;
  error?: string;
  message?: string;
}

export interface DealFilter {
  category?: string;
  location?: string;
  minDiscount?: number;
  maxPrice?: number;
  merchantId?: string;
  status?: string;
}

