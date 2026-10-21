import { NextRequest, NextResponse } from 'next/server';
import { ApiController } from '@/apps/api/src/controller';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const updated = await ApiController.approveAndPostPr(id);
    return NextResponse.json({ message: 'PR review comment posted successfully', incident: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
