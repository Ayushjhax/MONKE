// Staking API Routes

import { Router, Request, Response } from 'express';
import {
  stakeNFT,
  requestUnstake,
  completeUnstake,
  claimRewards,
  getStakingStatus,
  getUserStats
} from '../services/staking-service.js';
import { calculatePendingRewards, getRewardBreakdown } from '../services/reward-calculator.js';
import * as db from '../db/index.js';

export const stakingRouter = Router();

/**
 * POST /api/staking/stake
 * Start staking a cNFT
 */
stakingRouter.post('/stake', async (req: Request, res: Response) => {
  try {
    const { assetId, ownerAddress } = req.body;

    if (!assetId || !ownerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: assetId and ownerAddress'
      });
    }

    const result = await stakeNFT({ assetId, ownerAddress });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      stake: result.stake
    });

  } catch (error) {
    console.error('Error in stake endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/staking/unstake
 * Request unstaking (initiates cooldown period)
 */
stakingRouter.post('/unstake', async (req: Request, res: Response) => {
  try {
    const { stakeId, ownerAddress } = req.body;

    if (!stakeId || !ownerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: stakeId and ownerAddress'
      });
    }

    const result = requestUnstake({ stakeId, ownerAddress });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      cooldownEndsAt: result.cooldownEndsAt,
      message: 'Unstaking initiated. Cooldown period: 7 days'
    });

  } catch (error) {
    console.error('Error in unstake endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/staking/unstake-complete
 * Complete unstaking after cooldown
 */
stakingRouter.post('/unstake-complete', async (req: Request, res: Response) => {
  try {
    const { stakeId, ownerAddress } = req.body;

    if (!stakeId || !ownerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: stakeId and ownerAddress'
      });
    }

    const result = await completeUnstake(stakeId, ownerAddress);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Unstaking completed successfully'
    });

  } catch (error) {
    console.error('Error in unstake-complete endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/staking/rewards/claim
 * Claim pending rewards
 */
stakingRouter.post('/rewards/claim', async (req: Request, res: Response) => {
  try {
    const { ownerAddress } = req.body;

    if (!ownerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: ownerAddress'
      });
    }

    const result = claimRewards({ ownerAddress });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      totalAmount: result.totalAmount,
      message: `Successfully claimed ${result.totalAmount.toFixed(6)} rewards`
    });

  } catch (error) {
    console.error('Error in claim endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/staking/status/:assetId
 * Get staking status for an asset
 */
stakingRouter.get('/status/:assetId', (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const stake = getStakingStatus(assetId);

    if (!stake) {
      return res.status(404).json({
        success: false,
        error: 'No active staking record found for this asset'
      });
    }

    // Calculate pending rewards
    const pendingRewards = calculatePendingRewards(stake);
    const rewardBreakdown = getRewardBreakdown(stake);

    res.json({
      success: true,
      stake,
      pendingRewards,
      rewardBreakdown
    });

  } catch (error) {
    console.error('Error in status endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/staking/my-stakes
 * Get all staking records for a user
 */
stakingRouter.get('/my-stakes', (req: Request, res: Response) => {
  try {
    const { ownerAddress } = req.query;

    if (!ownerAddress || typeof ownerAddress !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: ownerAddress'
      });
    }

    const stakes = db.getStakingRecordsByOwner(ownerAddress);
    
    // Enrich with pending rewards
    const enrichedStakes = stakes.map(stake => ({
      ...stake,
      pendingRewards: calculatePendingRewards(stake),
      rewardBreakdown: getRewardBreakdown(stake)
    }));

    res.json({
      success: true,
      stakes: enrichedStakes,
      totalActive: enrichedStakes.filter(s => s.status === 'active').length,
      totalPendingRewards: enrichedStakes.reduce((sum, s) => sum + s.pendingRewards, 0)
    });

  } catch (error) {
    console.error('Error in my-stakes endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/staking/rewards/pending
 * Get total pending rewards for a user
 */
stakingRouter.get('/rewards/pending', (req: Request, res: Response) => {
  try {
    const { ownerAddress } = req.query;

    if (!ownerAddress || typeof ownerAddress !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: ownerAddress'
      });
    }

    const stakes = db.getStakingRecordsByOwner(ownerAddress);
    const totalPending = stakes.reduce((sum, stake) => {
      return sum + calculatePendingRewards(stake);
    }, 0);

    res.json({
      success: true,
      totalPendingRewards: totalPending,
      activeStakes: stakes.filter(s => s.status === 'active').length
    });

  } catch (error) {
    console.error('Error in pending rewards endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/staking/stats/:ownerAddress
 * Get user staking statistics
 */
stakingRouter.get('/stats/:ownerAddress', (req: Request, res: Response) => {
  try {
    const { ownerAddress } = req.params;
    const stats = getUserStats(ownerAddress);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error in stats endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/staking/all
 * Get all staking records (admin endpoint)
 */
stakingRouter.get('/all', (req: Request, res: Response) => {
  try {
    const stakes = db.getAllStakingRecords();
    
    res.json({
      success: true,
      totalStakes: stakes.length,
      activeStakes: stakes.filter(s => s.status === 'active').length,
      stakes
    });

  } catch (error) {
    console.error('Error in all endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

