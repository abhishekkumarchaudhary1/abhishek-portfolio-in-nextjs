import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src', 'data', 'tnc.txt');
    const data = await fs.readFile(filePath, 'utf-8');
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error) {
    console.error('Failed to read tnc.txt:', error);
    return NextResponse.json({ error: 'Failed to load terms' }, { status: 500 });
  }
}


