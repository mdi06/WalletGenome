import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { formatClusterConnectionSummary } from './ClusterFlowGraph';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('P3 accessibility contracts', () => {
  it('implements complete landing, dashboard, and cluster tab semantics', () => {
    for (const relativePath of ['../app/page.tsx', './Dashboard.tsx', './BulkDashboard.tsx']) {
      const source = readSource(relativePath);
      assert.match(source, /role="tablist"/);
      assert.match(source, /role="tab"/);
      assert.match(source, /aria-selected=/);
      assert.match(source, /aria-controls=/);
      assert.match(source, /tabIndex=/);
      assert.match(source, /onKeyDown=/);
      assert.match(source, /role="tabpanel"/);
      assert.match(source, /aria-labelledby=/);
    }
  });

  it('uses a button inside each sortable cluster header and exposes sort state', () => {
    const source = readSource('./BulkDashboard.tsx');
    assert.match(source, /aria-sort=/);
    assert.match(source, /<th[^>]*>[\s\S]*?<button/);
    assert.doesNotMatch(source, /<th\s+onClick=/);
  });

  it('keeps demo profile cards non-clickable outside their explicit action', () => {
    const source = readSource('./WelcomeGuide.tsx');
    assert.doesNotMatch(source, /<div[\s\S]{0,220}card-3d-interactive[\s\S]{0,220}onClick=/);
    assert.match(source, /aria-label=\{`Load saved demo snapshot for \$\{demo\.name\}`\}/);
  });

  it('renders the original saved-demo cards only once', () => {
    const pageSource = readSource('../app/page.tsx');
    const guideSource = readSource('./WelcomeGuide.tsx');
    assert.doesNotMatch(pageSource, /Explore demo wallets/);
    assert.doesNotMatch(pageSource, /DEMO_WALLETS\.map/);
    assert.match(guideSource, /Explore saved demo wallets/);
    assert.match(guideSource, /card-3d-interactive/);
  });

  it('provides non-visual chart and heatmap summaries', () => {
    for (const relativePath of ['./BehavioralRadarChart.tsx', './ActivityHeatmap.tsx', './CapitalFlowGraph.tsx', './ClusterFlowGraph.tsx']) {
      const source = readSource(relativePath);
      assert.match(source, /sr-only/);
    }
  });

  it('names icon-only explorer and graph controls', () => {
    for (const relativePath of ['./TransferTable.tsx', './ApprovalAudit.tsx', './InteractionsPanel.tsx', './CapitalFlowGraph.tsx', './ClusterFlowGraph.tsx']) {
      const source = readSource(relativePath);
      assert.match(source, /aria-label=/);
    }
  });

  it('describes direct and shared-counterparty graph connections without undefined counts', () => {
    assert.strictEqual(
      formatClusterConnectionSummary({
        sourceName: 'Wallet A',
        targetName: 'Wallet B',
        type: 'direct',
        txCount: 3,
      }),
      'Wallet A to Wallet B: 3 transactions.',
    );
    assert.strictEqual(
      formatClusterConnectionSummary({
        sourceName: 'Wallet A',
        targetName: 'Shared hub',
        type: 'hub',
      }),
      'Wallet A to Shared hub: shared counterparty connection.',
    );
  });
});
