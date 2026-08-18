import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { address, label } = await request.json();

    if (!address || !/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      return NextResponse.json({ error: 'Invalid EVM address' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'known_wallets.txt');
    const customLabel = label ? label.trim() : 'Exchange / Known Wallet';
    const entry = `\n${address} # ${customLabel}`;

    fs.appendFileSync(filePath, entry, 'utf-8');

    return NextResponse.json({ success: true, address, label: customLabel });
  } catch (error) {
    console.error('Error writing to known_wallets.txt:', error);
    return NextResponse.json({ error: 'Failed to update known_wallets.txt' }, { status: 500 });
  }
}
