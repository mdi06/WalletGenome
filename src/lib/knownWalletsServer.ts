import fs from 'fs';
import path from 'path';

/**
 * Server-side loader for `known_wallets.txt` in the root directory.
 */
export function loadKnownWallets(): Record<string, string> {
  const wallets: Record<string, string> = {};

  try {
    const filePath = path.join(process.cwd(), 'known_wallets.txt');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
          continue;
        }

        let address = trimmed;
        let label = 'My Known Wallet';

        if (trimmed.includes('#')) {
          const parts = trimmed.split('#');
          address = parts[0].trim();
          label = parts[1].trim() || 'My Known Wallet';
        } else if (trimmed.includes(',')) {
          const parts = trimmed.split(',');
          address = parts[0].trim();
          label = parts[1].trim() || 'My Known Wallet';
        }

        const match = address.match(/0x[a-fA-F0-9]{40}/i);
        if (match) {
          wallets[match[0].toLowerCase()] = label;
        }
      }
    }
  } catch (err) {
    console.warn('Could not read known_wallets.txt:', err);
  }

  return wallets;
}
