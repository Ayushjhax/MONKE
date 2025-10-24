// Merchants API Routes
import express, { Request, Response } from 'express';
import { MerchantData } from '../../types/discount.js';
import { 
  getAllMerchants, 
  getMerchantById, 
  registerMerchant,
  getMerchantDeals
} from '../services/merchant-service.js';

export const merchantsRouter = express.Router();

/**
 * GET /api/merchants
 * Get all merchants
 */
merchantsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const merchants = await getAllMerchants();

    res.json({
      success: true,
      count: merchants.length,
      merchants
    });
  } catch (error) {
    console.error('Error fetching merchants:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch merchants'
    });
  }
});

/**
 * GET /api/merchants/:id
 * Get merchant by ID
 */
merchantsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const merchant = await getMerchantById(id);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: 'Merchant not found'
      });
    }

    res.json({
      success: true,
      merchant
    });
  } catch (error) {
    console.error('Error fetching merchant:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch merchant'
    });
  }
});

/**
 * POST /api/merchants
 * Register new merchant
 */
merchantsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const merchantData: MerchantData = req.body;

    if (!merchantData.merchantId || !merchantData.businessName || !merchantData.walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: merchantId, businessName, walletAddress'
      });
    }

    const result = await registerMerchant(merchantData);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error registering merchant:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register merchant'
    });
  }
});

/**
 * GET /api/merchants/:id/deals
 * Get merchant's deals
 */
merchantsRouter.get('/:id/deals', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deals = await getMerchantDeals(id);

    res.json({
      success: true,
      merchantId: id,
      count: deals.length,
      deals
    });
  } catch (error) {
    console.error('Error fetching merchant deals:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch merchant deals'
    });
  }
});

