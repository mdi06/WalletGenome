import assert from 'node:assert';
import { it } from 'node:test';
import {
  FLOW_GRAPH_NODE_GAP,
  FLOW_GRAPH_NODE_WIDTH,
  formatGraphNetworkLabel,
  formatGraphSummaryValue,
  formatGraphVolume,
  layoutProtocolNodes,
} from './CapitalFlowGraph';

it('labels missing transfer prices as unavailable instead of presenting zero', () => {
  assert.strictEqual(formatGraphVolume(0, 3), 'Unavailable');
  assert.strictEqual(formatGraphVolume(0, 0), '$0');
  assert.strictEqual(formatGraphVolume(1250, 3), '$1.25K');
  assert.strictEqual(formatGraphSummaryValue(null), 'Unavailable');
  assert.strictEqual(formatGraphSummaryValue(0), '$0');
});

it('uses an explicit network label for protocol graph nodes', () => {
  assert.strictEqual(formatGraphNetworkLabel('Ethereum', 1), 'Ethereum');
  assert.strictEqual(formatGraphNetworkLabel('Base', 8453), 'Base');
  assert.strictEqual(formatGraphNetworkLabel('', 8453), 'Chain 8453');
});

it('lays out zero to eight protocol nodes without horizontal box overlap', () => {
  for (let count = 0; count <= 8; count += 1) {
    const nodes = Array.from({ length: count }, (_, index) => ({
      id: `protocol-${index}`,
      x: 0,
      y: 0,
    }));
    const positioned = layoutProtocolNodes(nodes);

    assert.strictEqual(positioned.length, count);
    for (let leftIndex = 0; leftIndex < positioned.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < positioned.length; rightIndex += 1) {
        const left = positioned[leftIndex]!;
        const right = positioned[rightIndex]!;
        if (left.y !== right.y) continue;

        assert.ok(
          Math.abs(left.x - right.x) >= FLOW_GRAPH_NODE_WIDTH + FLOW_GRAPH_NODE_GAP,
          `protocol nodes ${left.id} and ${right.id} overlap at count ${count}`,
        );
      }
    }
  }

  const eightNodes = layoutProtocolNodes(Array.from({ length: 8 }, (_, index) => ({
    id: `protocol-${index}`,
    x: 0,
    y: 0,
  })));
  assert.deepStrictEqual(eightNodes.slice(0, 4).map(node => node.y), [70, 70, 70, 70]);
  assert.deepStrictEqual(eightNodes.slice(4).map(node => node.y), [490, 490, 490, 490]);
});
