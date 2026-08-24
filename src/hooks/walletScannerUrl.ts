const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const ENS_NAME = /^(?=.{1,255}$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,62}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,62}[a-zA-Z0-9])?)+$/;

export function getUrlScanTarget(search: string): string | null {
  const params = new URLSearchParams(search);
  const target = params.get('address') || params.get('wallet');
  if (!target) return null;
  const trimmed = target.trim();
  return EVM_ADDRESS.test(trimmed) || ENS_NAME.test(trimmed) ? trimmed : null;
}
