import assert from 'node:assert/strict';
import { it } from 'node:test';
import { getMockScanResult } from '../mockData';
import { classifyCounterparties } from './counterpartyClassification';

it('verifies token recipients per chain and preserves failed checks as unknown', async () => {
  const { chains } = getMockScanResult();
  for (const chain of chains) {
    chain.interactionsSummary.topCounterparties = [{
      address: '0xdc723b71ca7ed367624a906a008893c69f291894',
      label: null, type: 'eoa', inboundCount: 0, outboundCount: 3,
      inboundUSD: 0, outboundUSD: 10660, totalTxCount: 3,
      netFlowUSD: -10660, lastInteractionDate: '2026-09-05', chainId: chain.chainId,
    }];
  }
  await classifyCounterparties(chains, {
    classifier: async (chainId, address) => {
      if (chainId !== chains[0].chainId) throw new Error('RPC unavailable');
      return { chainId, address, chainName: 'Ethereum', type: 'regular_contract',
        confidence: 'heuristic', evidence: 'Deployed bytecode' };
    },
  });
  assert.equal(chains[0].interactionsSummary.topCounterparties[0].type, 'contract');
  assert.equal(chains[1].interactionsSummary.topCounterparties[0].type, 'unknown');
  await classifyCounterparties(chains, {
    classifier: async (chainId, address) => ({ chainId, address, chainName: 'Base',
      type: 'eip_7702', confidence: 'verified', evidence: 'Delegation bytecode' }),
  });
  assert.equal(chains[0].interactionsSummary.topCounterparties[0].type, 'contract');
  assert.equal(chains[1].interactionsSummary.topCounterparties[0].type, 'eoa');
  assert.equal(chains[1].interactionsSummary.topCounterparties[0].accountClassification?.type, 'eip_7702');
});
