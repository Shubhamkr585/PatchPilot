import { NextRequest, NextResponse } from 'next/server';
import { IncidentStore } from '@/packages/db/src/client';

export async function GET() {
  try {
    const incidents = await IncidentStore.getAllIncidents();
    return NextResponse.json({ incidents });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
