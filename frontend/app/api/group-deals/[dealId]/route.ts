import { NextResponse } from 'next/server';
import { getDealDetail } from '../../../../lib/group-deal-service';
import { initializeDatabase } from '../../../../lib/db';
import { MOCK_DEALS } from '../../../../lib/group-deals-mock';

export async function GET(_req: Request, ctx: { params: Promise<{ dealId: string }> }) {
  try {
    const { dealId } = await ctx.params;
    const idNum = Number(dealId);
    
    // Use mock data for prototype IDs
    if (idNum >= 1000 && idNum <= 2000) {
      const mock = MOCK_DEALS.find(d => d.id === idNum);
      if (mock) {
        return NextResponse.json({ deal: mock, tiers: mock.tiers, recent_groups: [] });
      }
    }
    
    // Real deal path
    await initializeDatabase();
    const data = await getDealDetail(idNum);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch deal' }, { status: 400 });
  }
}


