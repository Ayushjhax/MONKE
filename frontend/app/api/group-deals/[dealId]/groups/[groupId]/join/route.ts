import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { pool, initializeDatabase } from '@/lib/db';

async function recomputeGroupProgress(groupId: number) {
  const client = await pool.connect();
  try {
    const grp = await client.query('SELECT * FROM group_deal_groups WHERE id = $1', [groupId]);
    if (!grp.rows[0]) throw new Error('Group not found');
    const group = grp.rows[0];
    const tiersRes = await client.query('SELECT * FROM group_deal_tiers WHERE group_deal_id = $1 ORDER BY rank ASC', [group.group_deal_id]);
    const tiers = tiersRes.rows;

    const membersRes = await client.query(
      `SELECT pledge_units FROM group_deal_members WHERE group_id = $1 AND status IN ('pledged','confirmed')`,
      [groupId]
    );
    const members = membersRes.rows;
    const participantsCount = members.length;
    let totalPledged = 0;
    for (const m of members) totalPledged += Number(m.pledge_units || 1);

    let currentRank = 0;
    let currentDiscount = 0;
    for (const t of tiers) {
      const ok = group.tier_type === 'by_volume' ? totalPledged >= t.threshold : participantsCount >= t.threshold;
      if (ok && t.rank > currentRank) { currentRank = t.rank; currentDiscount = t.discount_percent; }
    }
    await client.query(
      `UPDATE group_deal_groups SET current_tier_rank = $1, current_discount_percent = $2,
       participants_count = $3, total_pledged = $4 WHERE id = $5`,
      [currentRank, currentDiscount, participantsCount, totalPledged, groupId]
    );
    return { current_tier_rank: currentRank, current_discount_percent: currentDiscount, participants_count: participantsCount, total_pledged: totalPledged };
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ dealId: string; groupId: string }> }) {
  try {
    await initializeDatabase();
    const { dealId, groupId } = await params;
    const parsedUrl = new URL(request.url);
    const simulate = parsedUrl.searchParams.get('simulate') === '1' || parsedUrl.searchParams.get('simulate') === 'true';

    // Robust body parsing (JSON, text JSON, form-data, or query fallback)
    let bodyWallet: string | undefined;
    let bodyPledge: number | undefined;
    let parsedFrom: 'json' | 'text' | 'form' | 'query' | 'none' = 'none';
    try {
      const json = await request.json();
      bodyWallet = json?.wallet || json?.address; // accept address alias
      bodyPledge = json?.pledge_units != null ? Number(json.pledge_units) : undefined;
      parsedFrom = 'json';
    } catch {
      try {
        const txt = await request.text();
        if (txt) {
          try {
            const parsed = JSON.parse(txt);
            bodyWallet = parsed?.wallet || parsed?.address;
            bodyPledge = parsed?.pledge_units != null ? Number(parsed.pledge_units) : undefined;
            parsedFrom = 'text';
          } catch {}
        }
      } catch {}
      if (!bodyWallet) {
        try {
          const form = await request.formData();
          const w = form.get('wallet');
          const p = form.get('pledge_units');
          bodyWallet = typeof w === 'string' ? w : undefined;
          if (!bodyWallet) {
            const addr = form.get('address');
            bodyWallet = typeof addr === 'string' ? addr : undefined;
          }
          bodyPledge = typeof p === 'string' ? Number(p) : undefined;
          parsedFrom = 'form';
        } catch {}
      }
    }
    if (!bodyWallet) {
      // Header fallbacks commonly used by clients/proxies
      const hdrWallet = request.headers.get('x-wallet') || request.headers.get('wallet') || request.headers.get('x-user-wallet');
      if (hdrWallet) bodyWallet = hdrWallet;
    }
    if (!bodyWallet) {
      const url = new URL(request.url);
      const qp = url.searchParams.get('wallet');
      if (qp) { bodyWallet = qp; parsedFrom = 'query'; }
      const addr = url.searchParams.get('address');
      if (!bodyWallet && addr) { bodyWallet = addr; parsedFrom = 'query'; }
    }

    const trimmedWallet = typeof bodyWallet === 'string' ? bodyWallet.trim() : '';
    if (!trimmedWallet) {
      return NextResponse.json({ error: 'wallet is required (json/form/query)' }, { status: 400 });
    }

    // Do not hard-fail on format; just require a non-empty identifier (signing verification can be added later)

    const client = await pool.connect();
    let effectiveGroupId: number = Number(groupId);
    try {
      await client.query('BEGIN');
      // If invite_code provided, resolve groupId from it
      const url = new URL(request.url);
      const invite = url.searchParams.get('invite_code') || url.searchParams.get('invite') || undefined;
      if (invite) {
        const inv = await client.query('SELECT id, group_deal_id FROM group_deal_groups WHERE invite_code = $1', [invite]);
        if (!inv.rows[0]) {
          throw new Error('Invalid invite code');
        }
        effectiveGroupId = Number(inv.rows[0].id);
        if (Number(dealId) !== Number(inv.rows[0].group_deal_id)) {
          throw new Error('Invite code does not match deal');
        }
      }

      // Validate group exists for the deal; if not, create a new group for this deal and joiner
      let grpRes = await client.query('SELECT * FROM group_deal_groups WHERE id = $1 AND group_deal_id = $2', [effectiveGroupId, Number(dealId)]);
      if (!grpRes.rows[0]) {
        // Check the deal exists and is active
        const dealRes = await client.query('SELECT id, end_at, start_at, min_participants FROM group_deals WHERE id = $1 AND status = $2', [Number(dealId), 'active']);
        if (!dealRes.rows[0]) {
          throw new Error('Deal not found or inactive');
        }
        // Auto-create a fresh open group for this deal using the joiner as host
        const invite = Math.random().toString(36).slice(2, 10).toUpperCase();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        const create = await client.query(
          `INSERT INTO group_deal_groups (group_deal_id, host_wallet, invite_code, expires_at)
           VALUES ($1,$2,$3,$4) RETURNING *`,
          [Number(dealId), trimmedWallet, invite, expiresAt]
        );
        grpRes = { rows: [create.rows[0]] } as any;
        effectiveGroupId = Number(create.rows[0].id);
      }
      if (grpRes.rows[0].status !== 'open') throw new Error('Group is not open');

      if (bodyPledge == null || Number.isNaN(bodyPledge) || bodyPledge <= 0) bodyPledge = 1;

      // In simulate mode, allow same wallet to "join again" by uniquifying wallet on insert
      let insertWallet = trimmedWallet;
      if (simulate) {
        const exists = await client.query(`SELECT 1 FROM group_deal_members WHERE group_id = $1 AND user_wallet = $2 LIMIT 1`, [Number(effectiveGroupId), trimmedWallet]);
        if (exists.rows[0]) insertWallet = `${trimmedWallet}-sim-${Math.random().toString(36).slice(2,6)}`;
      }

      console.log(`[group-join] inserting member`, { groupId: grpRes.rows[0].id, wallet: insertWallet, pledge_units: bodyPledge, source: parsedFrom, simulate });
      await client.query(
        `INSERT INTO group_deal_members (group_id, user_wallet, pledge_units)
         VALUES ($1,$2,$3)
         ON CONFLICT (group_id, user_wallet) DO UPDATE SET pledge_units = EXCLUDED.pledge_units, status = 'pledged'`,
        [Number(effectiveGroupId), insertWallet, bodyPledge ?? 1]
      );

      // For simulation flows, immediately create a demo redemption record (will have discount updated post-recompute)
      if (simulate) {
        const code = `SIM-${effectiveGroupId}-${Buffer.from(insertWallet).toString('hex').slice(0,8)}`;
        const qrPayload = JSON.stringify({ redemptionCode: code, discountValue: 0, userWallet: insertWallet, simulate: true });
        await client.query(
          `INSERT INTO group_deal_redemptions (group_id, user_wallet, redemption_code, qr_payload)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (redemption_code) DO NOTHING`,
          [Number(effectiveGroupId), insertWallet, code, qrPayload]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[group-join] db error', msg);
      throw e;
    } finally {
      client.release();
    }

    // Recompute progress for the actual (possibly auto-created) group
    const progress = await recomputeGroupProgress(Number(effectiveGroupId));
    console.log(`[group-join] recomputed`, { groupId: Number(effectiveGroupId), participants: progress.participants_count, total_pledged: progress.total_pledged, tier: progress.current_tier_rank, discount: progress.current_discount_percent });

    let demoRedemptionCode: string | undefined;
    if (simulate) {
      // Update the demo redemption with the current discount if any
      const last = await pool.query(
        `SELECT redemption_code FROM group_deal_redemptions WHERE group_id = $1 AND user_wallet = $2 ORDER BY issued_at DESC LIMIT 1`,
        [Number(effectiveGroupId), trimmedWallet]
      );
      if (last.rows[0]) {
        demoRedemptionCode = last.rows[0].redemption_code;
        await pool.query(
          `UPDATE group_deal_redemptions SET qr_payload = $1 WHERE redemption_code = $2`,
          [JSON.stringify({ redemptionCode: demoRedemptionCode, discountValue: progress.current_discount_percent, userWallet: trimmedWallet, simulate: true }), demoRedemptionCode]
        );
      }
    }

    // Include the latest members so the frontend can reflect actual wallets immediately
    const client2 = await pool.connect();
    try {
      const memRes = await client2.query(
        `SELECT user_wallet, pledge_units, status, joined_at FROM group_deal_members WHERE group_id = $1 ORDER BY joined_at ASC`,
        [Number(effectiveGroupId)]
      );
      return NextResponse.json({ ok: true, group_id: Number(effectiveGroupId), progress, members: memRes.rows, demo_redemption_code: demoRedemptionCode });
    } finally {
      client2.release();
    }
  } catch (e: any) {
    const errMsg = e?.message || 'Failed to join group';
    console.error('[group-join] error', errMsg);
    // Map common messages to clearer status codes
    const status =
      errMsg === 'Group not found' || errMsg.startsWith('Group belongs to different deal') || errMsg === 'Invalid invite code' || errMsg === 'Invite code does not match deal'
        ? 404
        : errMsg === 'Group is not open'
          ? 409
          : 400;
    return NextResponse.json({ error: errMsg }, { status });
  }
}

