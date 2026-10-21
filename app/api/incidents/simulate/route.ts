import { NextRequest, NextResponse } from 'next/server';
import { ApiController } from '@/apps/api/src/controller';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const scenario = body.scenario || 'stripe_concurrency';
    const incident = await ApiController.simulateFailure(scenario);
    return NextResponse.json({ message: 'Simulation finished', incident }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
