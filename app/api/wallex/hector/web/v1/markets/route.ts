import { NextRequest, NextResponse } from 'next/server';

const WALLEX_API_BASE = 'https://api.wallex.ir';

export async function GET(request: NextRequest) {
  try {
    const wallexApiKey = request.headers.get('x-api-key');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (wallexApiKey) {
      headers['x-api-key'] = wallexApiKey;
    }

    const response = await fetch(`${WALLEX_API_BASE}/hector/web/v1/markets`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Wallex API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (err) {
      console.error('Invalid JSON response from Wallex API:', err);
      return NextResponse.json(
        { error: 'Invalid JSON response from Wallex API' },
        { status: 502 }
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying to Wallex API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Wallex API' },
      { status: 500 }
    );
  }
}