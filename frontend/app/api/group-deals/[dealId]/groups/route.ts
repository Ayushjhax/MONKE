import { NextResponse } from 'next/server';
import { createGroupInstance } from '../../../../../lib/group-deal-service';
import { initializeDatabase } from '../../../../../lib/db';

export async function POST(req: Request, ctx: { params: Promise<{ dealId: string }> }) {
  try {
    const { dealId } = await ctx.params;
    const idNum = Number(dealId);
    
    // Mock response for prototype IDs
    if (idNum >= 1000 && idNum <= 2000) {
      const groupId = Math.floor(9000 + Math.random() * 1000);
      const inviteCode = Math.random().toString(36).slice(2, 10).toUpperCase();
      return NextResponse.json({ group_id: groupId, invite_code: inviteCode });
    }
    
    // Real creation path
    await initializeDatabase();
    const body = await req.json();
    const { wallet, expires_at } = body || {};
    if (!wallet || !expires_at) return NextResponse.json({ error: 'wallet and expires_at required' }, { status: 400 });
    const result = await createGroupInstance(idNum, String(wallet), String(expires_at));
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create group' }, { status: 400 });
  }
}


