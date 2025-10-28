import { NextResponse } from 'next/server';
import { listActiveDeals, createGroupDeal } from '../../../lib/group-deal-service';
import { MOCK_DEALS } from '../../../lib/group-deals-mock';
import { initializeDatabase } from '../../../lib/db';

export async function GET() {
  try {
    try {
      await initializeDatabase();
      const deals = await listActiveDeals();
      return NextResponse.json({ deals });
    } catch {
      // Fallback to mock deals for prototype
      return NextResponse.json({ deals: MOCK_DEALS });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to list' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initializeDatabase();
    const body = await req.json();
    const result = await createGroupDeal(body);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create' }, { status: 400 });
  }
}


