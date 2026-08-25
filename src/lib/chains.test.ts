import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CHAINS,
  SUPPORTED_CHAIN_IDS,
  getExplorerAddressUrl,
  getExplorerTxUrl,
} from './chains';

describe('Supported-chain display and explorer contracts', () => {
  it('defines native-token labels for every supported chain', () => {
    for (const chainId of SUPPORTED_CHAIN_IDS) {
      const chain = CHAINS[chainId];
      assert.ok(chain, `missing chain configuration for ${chainId}`);
      assert.match(chain.nativeToken.symbol, /^[A-Z0-9]+$/);
      assert.equal(chain.nativeToken.decimals, 18);
    }
  });

  it('builds chain-specific transaction and address links', () => {
    const transactionHash = '0xabc123';
    const address = '0x1111111111111111111111111111111111111111';

    for (const chainId of SUPPORTED_CHAIN_IDS) {
      const explorerUrl = CHAINS[chainId].explorerUrl;
      assert.equal(getExplorerTxUrl(chainId, transactionHash), `${explorerUrl}/tx/${transactionHash}`);
      assert.equal(getExplorerAddressUrl(chainId, address), `${explorerUrl}/address/${address}`);
    }
  });
});
