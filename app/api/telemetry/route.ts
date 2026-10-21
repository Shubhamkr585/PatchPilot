import { NextResponse } from 'next/server';
import { ApiController } from '@/apps/api/src/controller';

export async function GET() {
  try {
    const stats = await ApiController.getTelemetryStats();
    return NextResponse.json(stats);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
