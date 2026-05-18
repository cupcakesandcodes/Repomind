import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repoId = searchParams.get('repoId');

  if (!repoId) {
    return NextResponse.json({ error: "repoId is required" }, { status: 400 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ status: 'ready', message: 'Redis not available, assuming ready' });
  }

  const status = await redis.get(`job:${repoId}`);
  const progress = await redis.get(`progress:${repoId}`);

  return NextResponse.json({ 
    status: status || 'unknown',
    progress: progress ? parseInt(progress, 10) : 0
  });
}
