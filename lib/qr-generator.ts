// QR Code Generation for Discount Redemption
import QRCode from 'qrcode';
import { QRCodeData } from '../types/discount';

/**
 * Generates a QR code for discount redemption
 */
export const generateDiscountQRCode = async (
  discountMint: string,
  redemptionCode: string,
  merchantId: string
): Promise<string> => {
  try {
    const qrData: QRCodeData = {
      discountMint,
      redemptionCode,
      merchantId,
      timestamp: Date.now(),
      version: '1.0'
    };

    // Convert to JSON string
    const qrString = JSON.stringify(qrData);

    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrCodeDataURL;

  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Parses QR code data
 */
export const parseQRCodeData = (qrString: string): QRCodeData | null => {
  try {
    const qrData: QRCodeData = JSON.parse(qrString);

    // Validate QR code structure
    if (!qrData.discountMint || !qrData.redemptionCode || !qrData.merchantId) {
      return null;
    }

    // Check if QR code is not too old (e.g., 10 minutes)
    const now = Date.now();
    const qrAge = now - qrData.timestamp;
    const maxAge = 10 * 60 * 1000; // 10 minutes

    if (qrAge > maxAge) {
      console.warn('QR code has expired');
      return null;
    }

    return qrData;

  } catch (error) {
    console.error('Error parsing QR code data:', error);
    return null;
  }
};

/**
 * Validates QR code data
 */
export const validateQRCode = (qrData: QRCodeData): boolean => {
  // Check required fields
  if (!qrData.discountMint || !qrData.redemptionCode || !qrData.merchantId) {
    return false;
  }

  // Check timestamp
  const now = Date.now();
  const qrAge = now - qrData.timestamp;
  const maxAge = 10 * 60 * 1000; // 10 minutes

  if (qrAge > maxAge) {
    return false;
  }

  // Check version compatibility
  if (qrData.version !== '1.0') {
    return false;
  }

  return true;
};

/**
 * Generates QR code for batch of discounts
 */
export const generateBatchQRCodes = async (
  discounts: Array<{
    discountMint: string;
    redemptionCode: string;
    merchantId: string;
  }>
): Promise<Array<{ discountMint: string; qrCode: string }>> => {
  const results = [];

  for (const discount of discounts) {
    const qrCode = await generateDiscountQRCode(
      discount.discountMint,
      discount.redemptionCode,
      discount.merchantId
    );

    results.push({
      discountMint: discount.discountMint,
      qrCode
    });
  }

  return results;
};

