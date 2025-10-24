// Redemption API Routes with Solana Pay
import express, { Request, Response } from 'express';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { 
  generateSolanaPayRedemptionQR,
  verifySolanaPayRedemption,
  generateRedemptionReference,
  createTimeLockedRedemptionQR,
  createLocationBasedRedemptionQR
} from '../../lib/solana-pay-verification.js';

const connection = new Connection(
  process.env.SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
);

export const redemptionRouter = express.Router();

/**
 * POST /api/redemption/generate-qr
 * Generate Solana Pay QR code for redemption
 * INNOVATION: User scans this and approves transaction = proof of redemption!
 */
redemptionRouter.post('/generate-qr', async (req: Request, res: Response) => {
  try {
    const { 
      discountMint, 
      redemptionCode, 
      userWallet, 
      merchantWallet,
      discountValue 
    } = req.body;

    if (!discountMint || !redemptionCode || !userWallet || !merchantWallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const reference = generateRedemptionReference();

    const qrResult = await generateSolanaPayRedemptionQR({
      discountMint,
      userWallet,
      merchantWallet,
      redemptionCode,
      discountValue: Number(discountValue),
      reference
    });

    res.json({
      success: true,
      ...qrResult,
      message: 'User scans this QR with Solana wallet to redeem'
    });
  } catch (error) {
    console.error('Error generating redemption QR:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate QR'
    });
  }
});

/**
 * POST /api/redemption/verify
 * Verify redemption transaction after user approves
 */
redemptionRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { 
      reference,
      discountMint, 
      redemptionCode, 
      userWallet, 
      merchantWallet,
      discountValue
    } = req.body;

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'reference is required'
      });
    }

    const referencePublicKey = new PublicKey(reference);

    const verification = await verifySolanaPayRedemption(
      connection,
      referencePublicKey,
      {
        discountMint,
        redemptionCode,
        userWallet,
        merchantWallet,
        discountValue: Number(discountValue),
        reference: referencePublicKey
      }
    );

    if (verification.verified) {
      res.json({
        success: true,
        verified: true,
        signature: verification.signature,
        timestamp: verification.timestamp,
        message: 'Redemption verified on-chain!'
      });
    } else {
      res.status(400).json({
        success: false,
        verified: false,
        error: verification.error
      });
    }
  } catch (error) {
    console.error('Error verifying redemption:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify'
    });
  }
});

/**
 * POST /api/redemption/time-locked
 * Generate time-locked redemption QR (e.g., dinner hours only)
 */
redemptionRouter.post('/time-locked', async (req: Request, res: Response) => {
  try {
    const { 
      discountMint, 
      redemptionCode, 
      userWallet, 
      merchantWallet,
      discountValue,
      validFrom,
      validUntil
    } = req.body;

    const reference = generateRedemptionReference();

    const qrResult = await createTimeLockedRedemptionQR({
      discountMint,
      userWallet,
      merchantWallet,
      redemptionCode,
      discountValue: Number(discountValue),
      reference,
      validFrom: Number(validFrom),
      validUntil: Number(validUntil)
    });

    res.json({
      success: true,
      ...qrResult,
      message: 'Time-locked redemption QR generated'
    });
  } catch (error) {
    console.error('Error generating time-locked QR:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate QR'
    });
  }
});

/**
 * POST /api/redemption/location-based
 * Generate location-based redemption QR (valid only at specific location)
 */
redemptionRouter.post('/location-based', async (req: Request, res: Response) => {
  try {
    const { 
      discountMint, 
      redemptionCode, 
      userWallet, 
      merchantWallet,
      discountValue,
      latitude,
      longitude,
      radiusMeters
    } = req.body;

    const reference = generateRedemptionReference();

    const qrResult = await createLocationBasedRedemptionQR({
      discountMint,
      userWallet,
      merchantWallet,
      redemptionCode,
      discountValue: Number(discountValue),
      reference,
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: Number(radiusMeters || 100)
    });

    res.json({
      success: true,
      ...qrResult,
      message: 'Location-based redemption QR generated'
    });
  } catch (error) {
    console.error('Error generating location-based QR:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate QR'
    });
  }
});

/**
 * GET /api/redemption/history/:userWallet
 * Get redemption history for a user
 */
redemptionRouter.get('/history/:userWallet', async (req: Request, res: Response) => {
  try {
    const { userWallet } = req.params;

    // This would fetch redemption history from database
    // For MVP, returning mock data
    const history = [
      {
        discountMint: 'mock_mint_1',
        redemptionCode: 'DISCOUNT123',
        merchantId: 'merchant_1',
        timestamp: Date.now() - 86400000,
        status: 'redeemed'
      }
    ];

    res.json({
      success: true,
      userWallet,
      count: history.length,
      history
    });
  } catch (error) {
    console.error('Error fetching redemption history:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch history'
    });
  }
});

