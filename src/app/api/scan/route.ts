import { NextRequest, NextResponse } from 'next/server';
import { processWalletScan } from '@/lib/services/scanService';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, chainIds, isDemo, customApiKey } = body;

    const responseData = await processWalletScan(address, chainIds, isDemo, customApiKey);

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Scan error:', error);
    
    // Check if error is one of our custom validation errors (e.g., ENS resolution failed)
    if (error.message && (error.message.includes('provide an EVM wallet') || error.message.includes('Unable to resolve ENS'))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred while analyzing the wallet.' },
      { status: 500 }
    );
  }
}
