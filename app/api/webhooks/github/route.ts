import { NextRequest, NextResponse } from 'next/server';
import { ApiController } from '@/apps/api/src/controller';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let parsedBody: any;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (e) {
      parsedBody = rawBody;
    }

    const headers: Record<string, string | undefined> = {
      'x-github-delivery': req.headers.get('x-github-delivery') || undefined,
      'x-hub-signature-256': req.headers.get('x-hub-signature-256') || undefined,
      'x-github-event': req.headers.get('x-github-event') || undefined,
    };

    const result = await ApiController.handleGithubWebhook(headers, parsedBody);
    return NextResponse.json(result.response, { status: result.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
