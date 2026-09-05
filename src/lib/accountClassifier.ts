import { getChainConfig } from './chains';
import { getRpcAccountState, type RpcHeadOptions } from './rpc';
import type { WalletAccountClassification, WalletAccountType } from './types';

export interface AccountClassifierOptions extends RpcHeadOptions {
  classifier?: AccountClassifier;
}

export type AccountClassifier = (
  chainId: number,
  address: string,
  options?: RpcHeadOptions,
) => Promise<WalletAccountClassification>;

const EIP_7702_CODE = /^0xef0100([0-9a-f]{40})$/i;
const MINIMAL_PROXY_CODE = /^0x363d3d373d3d3d363d73[0-9a-f]{40}5af43d82803e903d91602b57fd5bf3$/i;
const SMART_ACCOUNT_CODE_MARKERS = [
  '35567e1a', // entryPoint()
  '3a871cdd', // validateUserOp(...)
  '1626ba7e', // isValidSignature(...)
];
const SAFE_THRESHOLD_SELECTOR = '0xe75235b8';
const ENTRY_POINT_SELECTOR = '0x35567e1a';

function chainNameFor(chainId: number): string {
  try {
    return getChainConfig(chainId).name;
  } catch {
    return `Chain ${chainId}`;
  }
}

function classification(
  address: string,
  chainId: number,
  type: WalletAccountType,
  confidence: WalletAccountClassification['confidence'],
  evidence: string,
): WalletAccountClassification {
  return { address, chainId, chainName: chainNameFor(chainId), type, confidence, evidence };
}

function nonZeroCallResult(value: string | null): boolean {
  return typeof value === 'string' && /^0x[0-9a-f]+$/i.test(value) && !/^0x0+$/i.test(value);
}

/**
 * Classify an EVM account from canonical RPC bytecode plus narrowly scoped
 * account-interface probes. The result is deliberately evidence-bearing so
 * UI and cluster eligibility decisions do not collapse into wallet/contract.
 */
export async function classifyWalletAccount(
  chainId: number,
  address: string,
  options: Omit<AccountClassifierOptions, 'classifier'> = {},
): Promise<WalletAccountClassification> {
  const state = await getRpcAccountState(chainId, address, options);
  if (!state) {
    return classification(
      address,
      chainId,
      'unknown',
      'unknown',
      'RPC account code could not be verified on the selected chain.',
    );
  }

  if (/^0x0*$/i.test(state.code)) {
    return classification(address, chainId, 'eoa', 'verified', 'RPC returned empty deployed code.');
  }

  const delegatedImplementation = state.code.match(EIP_7702_CODE)?.[1];
  if (delegatedImplementation) {
    return classification(
      address,
      chainId,
      'eip_7702',
      'verified',
      `RPC returned EIP-7702 delegation code for implementation 0x${delegatedImplementation}.`,
    );
  }

  if (MINIMAL_PROXY_CODE.test(state.code)) {
    return classification(
      address,
      chainId,
      'multisig_or_proxy',
      'verified',
      'RPC bytecode matches the EIP-1167 minimal proxy pattern.',
    );
  }

  const lowerCode = state.code.toLowerCase();
  const hasSmartAccountMarker = SMART_ACCOUNT_CODE_MARKERS.some(marker => lowerCode.includes(marker));
  const entryPoint = await state.call(ENTRY_POINT_SELECTOR);
  if (hasSmartAccountMarker || nonZeroCallResult(entryPoint)) {
    return classification(
      address,
      chainId,
      'smart_account',
      nonZeroCallResult(entryPoint) ? 'verified' : 'heuristic',
      nonZeroCallResult(entryPoint)
        ? 'The account exposes a non-zero ERC-4337 entryPoint() response.'
        : 'Bytecode contains known ERC-4337 or ERC-1271 smart-account interface markers.',
    );
  }

  const threshold = await state.call(SAFE_THRESHOLD_SELECTOR);
  if (nonZeroCallResult(threshold)) {
    return classification(
      address,
      chainId,
      'multisig_or_proxy',
      'verified',
      'The account exposes a non-zero Safe-compatible getThreshold() response.',
    );
  }

  return classification(
    address,
    chainId,
    'regular_contract',
    'heuristic',
    'RPC returned deployed bytecode, but no recognized smart-account or multisig/proxy signal was found.',
  );
}

export async function classifyWalletAccounts(
  address: string,
  chainIds: readonly number[],
  options: Omit<AccountClassifierOptions, 'classifier'> = {},
): Promise<WalletAccountClassification[]> {
  return await Promise.all(chainIds.map(chainId => classifyWalletAccount(chainId, address, options)));
}

export { formatWalletAccountType, isClusterEligibleAccountType } from './accountClassification';
