import { NextRequest, NextResponse } from 'next/server';
import { pool, initializeDatabase } from '@/lib/db';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ dealId: string; groupId: string }> }) {
  try {
    await initializeDatabase();
    const { groupId } = await params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const grp = await client.query('SELECT * FROM group_deal_groups WHERE id = $1 FOR UPDATE', [Number(groupId)]);
      if (!grp.rows[0]) throw new Error('Group not found');
      const group = grp.rows[0];
      const isExpired = new Date(group.expires_at).getTime() < Date.now();
      const newStatus = isExpired ? 'expired' : 'cancelled';
      await client.query('UPDATE group_deal_groups SET status = $1 WHERE id = $2', [newStatus, Number(groupId)]);
      await client.query(`UPDATE group_deal_members SET status = 'refunded' WHERE group_id = $1`, [Number(groupId)]);
      await client.query('COMMIT');
      return NextResponse.json({ status: newStatus });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to cancel group' }, { status: 400 });
  }
}


