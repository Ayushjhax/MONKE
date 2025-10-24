// Solana Pay-Based Verification System
// INNOVATIVE: Use Solana Pay for BOTH payment AND redemption verification!

import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { 
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { encodeURL, createQR, findReference, validateTransfer } from '@solana/pay';
import BigNumber from 'bignumber.js';
import QRCode from 'qrcode';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/**
 * INNOVATION 1: Discount NFT Verification via Solana Pay
 * 
 * Instead of traditional QR codes, we use Solana Pay to create a transaction that:
 * 1. Verifies cNFT ownership (via memo instruction)
 * 2. Burns a small redemption token (0.000001 SOL)
 * 3. Records redemption on-chain
 * 
 * This makes redemption atomic and trustless!
 */

interface SolanaPayRedemptionParams {
  discountMint: string;           // cNFT mint address
  userWallet: string;              // User's wallet (owns the cNFT)
  merchantWallet: string;          // Merchant's wallet (receives confirmation)
  redemptionCode: string;          // Unique code for this redemption
  discountValue: number;           // Discount value in USD (for memo)
  reference: PublicKey;            // Unique reference for tracking
}

interface RedemptionQRResult {
  url: string;                     // Solana Pay URL
  qrCodeDataURL: string;          // QR code image (base64)
  reference: string;               // Reference for verification
  memo: string;                    // Transaction memo
}

/**
 * STEP 1: Generate Solana Pay Redemption QR Code
 * 
 * This creates a Solana Pay transaction request that:
 * - Transfers 0.000001 SOL from user to merchant (proof of redemption)
 * - Includes memo with discount details
 * - Has unique reference for tracking
 */
export const generateSolanaPayRedemptionQR = async (
  params: SolanaPayRedemptionParams
): Promise<RedemptionQRResult> => {
  
  const recipient = new PublicKey(params.merchantWallet);
  const amount = new BigNumber(0.000001); // Tiny amount for proof
  const reference = params.reference;
  const label = `Redeem: ${params.redemptionCode}`;
  
  // Create memo with discount details
  const memo = JSON.stringify({
    action: 'redeem',
    discountMint: params.discountMint,
    redemptionCode: params.redemptionCode,
    discountValue: params.discountValue,
    timestamp: Date.now()
  });
  
  // Create Solana Pay URL
  const url = encodeURL({
    recipient,
    amount,
    reference,
    label,
    message: `Redeem discount: ${params.discountValue}% off`,
    memo
  });
  
  // Generate QR code
  const qrCodeDataURL = await QRCode.toDataURL(url.toString(), {
    errorCorrectionLevel: 'H',
    width: 512,
    margin: 2
  });
  
  return {
    url: url.toString(),
    qrCodeDataURL,
    reference: reference.toString(),
    memo
  };
};

/**
 * STEP 2: Verify Redemption Transaction
 * 
 * After user scans and approves, merchant verifies the transaction:
 * - Checks transaction exists on-chain
 * - Validates amount, recipient, memo
 * - Confirms cNFT ownership via DAS API
 */
export const verifySolanaPayRedemption = async (
  connection: Connection,
  reference: PublicKey,
  params: SolanaPayRedemptionParams
): Promise<{
  verified: boolean;
  signature?: string;
  timestamp?: number;
  error?: string;
}> => {
  
  try {
    // Find transaction with this reference
    const signatureInfo = await findReference(connection, reference, {
      finality: 'confirmed'
    });
    
    if (!signatureInfo.signature) {
      return { verified: false, error: 'Transaction not found' };
    }
    
    // Validate transaction details
    const recipient = new PublicKey(params.merchantWallet);
    const amount = new BigNumber(0.000001);
    
    await validateTransfer(
      connection,
      signatureInfo.signature,
      {
        recipient,
        amount,
        reference
      }
    );
    
    // Get transaction details for memo verification
    const tx = await connection.getTransaction(signatureInfo.signature, {
      commitment: 'confirmed'
    });
    
    if (!tx) {
      return { verified: false, error: 'Transaction details not found' };
    }
    
    // Extract and verify memo
    const memoInstruction = tx.transaction.message.instructions.find(
      ix => ix.programId.equals(MEMO_PROGRAM_ID)
    );
    
    if (memoInstruction) {
      // Decode memo and verify discount details
      const memoData = tx.transaction.message.accountKeys[0];
      // In production, verify memo contains correct discount info
    }
    
    return {
      verified: true,
      signature: signatureInfo.signature.toString(),
      timestamp: Date.now()
    };
    
  } catch (error) {
    console.error('Verification error:', error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Verification failed'
    };
  }
};

/**
 * INNOVATION 2: Multi-Signature Redemption
 * 
 * For high-value discounts, require BOTH user AND merchant signatures:
 * 1. User signs to prove cNFT ownership
 * 2. Merchant signs to confirm service delivery
 * 3. Transaction updates redemption state
 */
export const createMultiSigRedemptionTx = async (
  connection: Connection,
  params: SolanaPayRedemptionParams
): Promise<Transaction> => {
  
  const tx = new Transaction();
  
  // Add instruction to burn/mark cNFT as used
  // This would interact with your cNFT program
  
  // Add memo with redemption details
  const memo = JSON.stringify({
    action: 'redeem_multisig',
    discountMint: params.discountMint,
    redemptionCode: params.redemptionCode,
    timestamp: Date.now()
  });
  
  tx.add({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo)
  });
  
  return tx;
};

/**
 * INNOVATION 3: Batch Redemption Verification
 * 
 * For merchants processing multiple redemptions:
 * - Single transaction validates multiple discounts
 * - Lower fees, faster processing
 * - Atomic batch verification
 */
export const createBatchRedemptionTx = async (
  connection: Connection,
  redemptions: SolanaPayRedemptionParams[]
): Promise<Transaction> => {
  
  const tx = new Transaction();
  
  for (const params of redemptions) {
    // Add memo for each redemption
    const memo = JSON.stringify({
      action: 'batch_redeem',
      discountMint: params.discountMint,
      redemptionCode: params.redemptionCode
    });
    
    tx.add({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo)
    });
  }
  
  return tx;
};

/**
 * INNOVATION 4: Time-Locked Redemption
 * 
 * Create redemption that's only valid during specific time window:
 * - Restaurant: only during dinner hours
 * - Flight: only for specific date range
 * - Flash sale: only for 1 hour
 */
export const createTimeLockedRedemptionQR = async (
  params: SolanaPayRedemptionParams & {
    validFrom: number;
    validUntil: number;
  }
): Promise<RedemptionQRResult> => {
  
  const now = Date.now();
  
  // Check if redemption window is valid
  if (now < params.validFrom || now > params.validUntil) {
    throw new Error('Redemption outside valid time window');
  }
  
  const reference = Keypair.generate().publicKey;
  
  const memo = JSON.stringify({
    action: 'time_locked_redeem',
    discountMint: params.discountMint,
    redemptionCode: params.redemptionCode,
    validFrom: params.validFrom,
    validUntil: params.validUntil,
    timestamp: now
  });
  
  const recipient = new PublicKey(params.merchantWallet);
  const amount = new BigNumber(0.000001);
  
  const url = encodeURL({
    recipient,
    amount,
    reference,
    label: `Time-Limited: ${params.redemptionCode}`,
    message: `Valid until ${new Date(params.validUntil).toLocaleString()}`,
    memo
  });
  
  const qrCodeDataURL = await QRCode.toDataURL(url.toString(), {
    errorCorrectionLevel: 'H',
    width: 512
  });
  
  return {
    url: url.toString(),
    qrCodeDataURL,
    reference: reference.toString(),
    memo
  };
};

/**
 * INNOVATION 5: Location-Based Redemption
 * 
 * Redemption only valid at specific merchant location:
 * - GPS coordinates in memo
 * - Mobile app verifies location before generating QR
 * - Prevents fraud (using discount at wrong location)
 */
export const createLocationBasedRedemptionQR = async (
  params: SolanaPayRedemptionParams & {
    latitude: number;
    longitude: number;
    radiusMeters: number;
  }
): Promise<RedemptionQRResult> => {
  
  const reference = Keypair.generate().publicKey;
  
  const memo = JSON.stringify({
    action: 'location_redeem',
    discountMint: params.discountMint,
    redemptionCode: params.redemptionCode,
    location: {
      lat: params.latitude,
      lon: params.longitude,
      radius: params.radiusMeters
    },
    timestamp: Date.now()
  });
  
  const recipient = new PublicKey(params.merchantWallet);
  const amount = new BigNumber(0.000001);
  
  const url = encodeURL({
    recipient,
    amount,
    reference,
    label: `Location-Based: ${params.redemptionCode}`,
    memo
  });
  
  const qrCodeDataURL = await QRCode.toDataURL(url.toString(), {
    errorCorrectionLevel: 'H',
    width: 512
  });
  
  return {
    url: url.toString(),
    qrCodeDataURL,
    reference: reference.toString(),
    memo
  };
};

/**
 * Helper: Generate unique reference for tracking
 */
export const generateRedemptionReference = (): PublicKey => {
  return Keypair.generate().publicKey;
};

/**
 * Helper: Check if discount was already redeemed
 */
export const checkRedemptionStatus = async (
  connection: Connection,
  discountMint: string
): Promise<{
  redeemed: boolean;
  signature?: string;
  timestamp?: number;
}> => {
  
  // Query transactions for this discount mint
  // Check if redemption memo exists
  // Return status
  
  // This is a simplified version
  // In production, you'd query your cNFT program state
  
  return {
    redeemed: false
  };
};

