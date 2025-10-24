// QR Code API Routes
import express, { Request, Response } from 'express';
import { generateDiscountQRCode, parseQRCodeData, validateQRCode } from '../../lib/qr-generator.js';

export const qrRouter = express.Router();

/**
 * POST /api/qr/generate
 * Generate QR code for a discount
 */
qrRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { discountMint, redemptionCode, merchantId } = req.body;

    if (!discountMint || !redemptionCode || !merchantId) {
      return res.status(400).json({
        success: false,
        error: 'discountMint, redemptionCode, and merchantId are required'
      });
    }

    const qrCodeDataURL = await generateDiscountQRCode(
      discountMint,
      redemptionCode,
      merchantId
    );

    res.json({
      success: true,
      qrCode: qrCodeDataURL,
      discountMint,
      redemptionCode
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate QR code'
    });
  }
});

/**
 * POST /api/qr/scan
 * Process scanned QR code data
 */
qrRouter.post('/scan', async (req: Request, res: Response) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        error: 'qrData is required'
      });
    }

    const parsedData = parseQRCodeData(qrData);

    if (!parsedData) {
      return res.status(400).json({
        success: false,
        error: 'Invalid QR code data'
      });
    }

    const isValid = validateQRCode(parsedData);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'QR code has expired or is invalid'
      });
    }

    res.json({
      success: true,
      data: parsedData
    });
  } catch (error) {
    console.error('Error scanning QR code:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scan QR code'
    });
  }
});

