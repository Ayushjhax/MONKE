import { NextResponse } from 'next/server';
import { joinGroup } from '../../../../../../../lib/group-deal-service';
import { initializeDatabase } from '../../../../../../../lib/db';

export async function POST(req: Request, ctx: { params: Promise<{ dealId: string; groupId: string }> }) {
  try {
    await initializeDatabase();
    const { groupId } = await ctx.params;
    const body = await req.json();
    const wallet = body?.wallet as string | undefined;
    const pledge = body?.pledge_units != null ? Number(body.pledge_units) : undefined;
    if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 });
    const result = await joinGroup(Number(groupId), wallet, pledge);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to join' }, { status: 400 });
  }
}


