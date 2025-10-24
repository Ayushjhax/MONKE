// Deals API Routes
import express, { Request, Response } from 'express';
import { DealData, DealFilter } from '../../types/discount.js';
import { 
  createDeal, 
  getAllDeals, 
  getDealById, 
  claimDeal,
  getDealsByCategory,
  getDealsByLocation,
  getDealsByMerchant
} from '../services/deal-service.js';

export const dealsRouter = express.Router();

/**
 * GET /api/deals
 * Get all available deals with optional filtering
 */
dealsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const filters: DealFilter = {
      category: req.query.category as string,
      location: req.query.location as string,
      minDiscount: req.query.minDiscount ? Number(req.query.minDiscount) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      merchantId: req.query.merchantId as string,
      status: req.query.status as string
    };

    const deals = await getAllDeals(filters);
    
    res.json({
      success: true,
      count: deals.length,
      deals
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch deals'
    });
  }
});

/**
 * GET /api/deals/:id
 * Get deal by ID
 */
dealsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deal = await getDealById(id);

    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found'
      });
    }

    res.json({
      success: true,
      deal
    });
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch deal'
    });
  }
});

/**
 * POST /api/deals
 * Create new deal (merchant)
 */
dealsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const dealData: DealData = req.body;

    // Validate required fields
    if (!dealData.title || !dealData.merchantId || !dealData.merchantWallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, merchantId, merchantWallet'
      });
    }

    const result = await createDeal(dealData);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create deal'
    });
  }
});

/**
 * POST /api/deals/:id/claim
 * Claim a deal (user)
 */
dealsRouter.post('/:id/claim', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userWallet } = req.body;

    if (!userWallet) {
      return res.status(400).json({
        success: false,
        error: 'User wallet address required'
      });
    }

    const result = await claimDeal(id, userWallet);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error claiming deal:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to claim deal'
    });
  }
});

/**
 * GET /api/deals/category/:category
 * Get deals by category
 */
dealsRouter.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const deals = await getDealsByCategory(category);

    res.json({
      success: true,
      category,
      count: deals.length,
      deals
    });
  } catch (error) {
    console.error('Error fetching deals by category:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch deals'
    });
  }
});

/**
 * GET /api/deals/location/:location
 * Get deals by location
 */
dealsRouter.get('/location/:location', async (req: Request, res: Response) => {
  try {
    const { location } = req.params;
    const deals = await getDealsByLocation(location);

    res.json({
      success: true,
      location,
      count: deals.length,
      deals
    });
  } catch (error) {
    console.error('Error fetching deals by location:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch deals'
    });
  }
});

/**
 * GET /api/deals/merchant/:merchantId
 * Get deals by merchant
 */
dealsRouter.get('/merchant/:merchantId', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const deals = await getDealsByMerchant(merchantId);

    res.json({
      success: true,
      merchantId,
      count: deals.length,
      deals
    });
  } catch (error) {
    console.error('Error fetching merchant deals:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch deals'
    });
  }
});

