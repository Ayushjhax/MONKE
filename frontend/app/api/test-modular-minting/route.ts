import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ success: false, error: 'Disabled in production build' }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ success: false, error: 'Disabled in production build' }, { status: 501 });
}

 