import express, { Request, Response } from 'express';
import { pool } from '../../frontend/lib/db.js';
import {
  createGroupDeal,
  createGroupInstance,
  joinGroup,
  getGroupStatus,
  lockGroup,
  cancelOrExpireGroup,
  recomputeGroupProgress
} from '../services/group-deal-service.js';

export const groupDealsRouter = express.Router();

// Helpers
function requireWallet(req: Request): string {
  const wallet = req.body?.wallet || req.query?.wallet;
  if (!wallet || typeof wallet !== 'string') {
    throw new Error('wallet is required');
  }
  return wallet;
}

// POST /api/group-deals
groupDealsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { deal_title, deal_type, merchant_id, base_price, tier_type, end_at, tiers, min_participants } = req.body || {};
    if (!deal_title || !deal_type || !merchant_id || base_price == null || !tier_type || !end_at || !Array.isArray(tiers)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await createGroupDeal({
      deal_title,
      deal_type,
      merchant_id,
      base_price: Number(base_price),
      tier_type,
      end_at,
      tiers,
      min_participants: min_participants != null ? Number(min_participants) : undefined
    });
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to create group deal' });
  }
});

// GET /api/group-deals (list active)
groupDealsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM group_deals WHERE status = 'active' AND end_at > NOW() ORDER BY created_at DESC`
      );
      const deals = result.rows;
      res.json({ deals });
    } finally {
      client.release();
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to list group deals' });
  }
});

// POST /api/group-deals/:dealId/groups
groupDealsRouter.post('/:dealId/groups', async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    const wallet = requireWallet(req);
    const { expires_at } = req.body || {};
    if (!expires_at) return res.status(400).json({ error: 'expires_at is required' });
    const result = await createGroupInstance(Number(dealId), wallet, String(expires_at));
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to create group instance' });
  }
});

// GET /api/group-deals/:dealId
groupDealsRouter.get('/:dealId', async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    const client = await pool.connect();
    try {
      const dealRes = await client.query('SELECT * FROM group_deals WHERE id = $1', [Number(dealId)]);
      if (!dealRes.rows[0]) return res.status(404).json({ error: 'Deal not found' });
      const tiersRes = await client.query('SELECT * FROM group_deal_tiers WHERE group_deal_id = $1 ORDER BY rank ASC', [Number(dealId)]);
      const groupsRes = await client.query(
        `SELECT id, host_wallet, status, current_tier_rank, current_discount_percent, participants_count, total_pledged, expires_at, created_at
         FROM group_deal_groups WHERE group_deal_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [Number(dealId)]
      );
      res.json({ deal: dealRes.rows[0], tiers: tiersRes.rows, recent_groups: groupsRes.rows });
    } finally {
      client.release();
    }
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to fetch deal' });
  }
});

// GET /api/group-deals/:dealId/groups/:groupId
groupDealsRouter.get('/:dealId/groups/:groupId', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const status = await getGroupStatus(Number(groupId));
    res.json(status);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to fetch group status' });
  }
});

// POST /api/group-deals/:dealId/groups/:groupId/join
groupDealsRouter.post('/:dealId/groups/:groupId/join', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const wallet = requireWallet(req);
    const pledgeUnits = req.body?.pledge_units != null ? Number(req.body.pledge_units) : undefined;
    const result = await joinGroup(Number(groupId), wallet, pledgeUnits);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to join group' });
  }
});

// POST /api/group-deals/:dealId/groups/:groupId/lock
groupDealsRouter.post('/:dealId/groups/:groupId/lock', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const result = await lockGroup(Number(groupId));
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to lock group' });
  }
});

// GET /api/group-deals/:dealId/groups/:groupId/redemptions?wallet=...
groupDealsRouter.get('/:dealId/groups/:groupId/redemptions', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const wallet = requireWallet(req);
    const client = await pool.connect();
    try {
      const rows = await client.query(
        `SELECT redemption_code, qr_payload, status, issued_at, redeemed_at
         FROM group_deal_redemptions WHERE group_id = $1 AND user_wallet = $2`,
        [Number(groupId), wallet]
      );
      res.json({ wallet, redemptions: rows.rows });
    } finally {
      client.release();
    }
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to fetch redemptions' });
  }
});

// POST /api/group-deals/:dealId/groups/:groupId/cancel
groupDealsRouter.post('/:dealId/groups/:groupId/cancel', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const result = await cancelOrExpireGroup(Number(groupId));
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to cancel group' });
  }
});

// Utility: recompute progress for a group (admin/dev)
groupDealsRouter.post('/_internal/:groupId/recompute', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const result = await recomputeGroupProgress(Number(groupId));
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to recompute progress' });
  }
});


