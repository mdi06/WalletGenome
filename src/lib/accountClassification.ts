import type { WalletAccountType } from './types';

export function formatWalletAccountType(type: WalletAccountType): string {
  switch (type) {
    case 'eoa': return 'EOA';
    case 'smart_account': return 'Smart account';
    case 'multisig_or_proxy': return 'Multisig / proxy';
    case 'eip_7702': return 'EIP-7702 delegated EOA';
    case 'regular_contract': return 'Regular contract';
    case 'unknown': return 'Unknown';
  }
}

export function isClusterEligibleAccountType(type: WalletAccountType): boolean {
  return type === 'eoa' || type === 'eip_7702';
}
