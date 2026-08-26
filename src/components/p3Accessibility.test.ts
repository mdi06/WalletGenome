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

  it('makes each complete demo profile card a keyboard-accessible action', () => {
    const source = readSource('./WelcomeGuide.tsx');
    assert.match(source, /card-3d-interactive[\s\S]{0,400}<button[\s\S]{0,300}onClick=\{\(\) => onSelectDemo\(demo\)\}[\s\S]{0,300}absolute inset-0/);
    assert.match(source, /aria-label=\{`Load saved demo snapshot for \$\{demo\.name\}`\}/);
    assert.doesNotMatch(source, /card-3d-interactive[\s\S]{0,500}<button[\s\S]{0,500}<button/);
  });

  it('renders the original saved-demo cards only once', () => {
    const pageSource = readSource('../app/page.tsx');
    const guideSource = readSource('./WelcomeGuide.tsx');
    assert.doesNotMatch(pageSource, /Explore demo wallets/);
    assert.doesNotMatch(pageSource, /DEMO_WALLETS\.map/);
    assert.match(guideSource, /Explore saved demo wallets/);
    assert.match(guideSource, /card-3d-interactive/);
  });

  it('keeps single-wallet demo notices scoped to single-wallet mode', () => {
    const pageSource = readSource('../app/page.tsx');
    assert.match(pageSource, /shouldShowDemoSnapshotNotice/);
    assert.match(pageSource, /activeDemoSnapshot: Boolean\(activeDemoSnapshot\)/);
  });

  it('renders a state-aware top-level indexing status', () => {
    const pageSource = readSource('../app/page.tsx');
    const statusSource = readSource('../lib/indexingStatus.ts');
    assert.doesNotMatch(pageSource, /Live indexing/);
    assert.match(pageSource, /Indexing status:/);
    assert.match(statusSource, /'live' \| 'saved-snapshot' \| 'partial' \| 'unavailable'/);
    assert.match(statusSource, /scanMode === 'single' && activeDemoSnapshot/);
  });

  it('keeps navigation, footer links, and compact actions near 44px tap targets', () => {
    const pageSource = readSource('../app/page.tsx');
    const docsSource = readSource('../app/docs/page.tsx');
    const landingSource = readSource('../app/[slug]/page.tsx');
    const footerSource = readSource('./SiteFooter.tsx');
    const transferSource = readSource('./TransferTable.tsx');
    const interactionSource = readSource('./InteractionsPanel.tsx');

    assert.match(pageSource, /btn-3d-neutral min-h-11/);
    assert.match(docsSource, /inline-flex min-h-11 min-w-11/);
    assert.match(landingSource, /inline-flex min-h-11 items-center/);
    assert.match(footerSource, /inline-flex min-h-11 items-center/);
    assert.match(transferSource, /min-h-11 px-3\.5 py-1\.5/);
    assert.match(interactionSource, /min-h-11 text-xs font-bold px-3 py-1/);
  });

  it('documents the four supported EVM networks', () => {
    const docsSource = readSource('../app/docs/page.tsx');
    assert.match(docsSource, /4 EVM Networks/);
    assert.doesNotMatch(docsSource, /5 EVM Networks/);
  });

  it('uses one compact mobile documentation index and keeps the full desktop index', () => {
    const docsSource = readSource('../app/docs/page.tsx');
    assert.match(docsSource, /<details className="lg:hidden/);
    assert.match(docsSource, /TABLE OF CONTENTS/);
    assert.match(docsSource, /aria-label="Documentation sections"/);
    assert.match(docsSource, /<aside className="hidden lg:col-span-4/);
  });

  it('uses framed dashboard modules with dividers inside dense groups', () => {
    const guideSource = readSource('./WelcomeGuide.tsx');
    const dashboardSource = readSource('./Dashboard.tsx');
    const docsSource = readSource('../app/docs/page.tsx');

    assert.match(guideSource, /divide-y divide-\[#c8c8c8\]/);
    assert.match(guideSource, /border-y border-\[#272a38\]/);
    assert.match(dashboardSource, /id="dashboard-flow-panel"[^>]*className="border-t border-\[#c8c8c8\]/);
    assert.match(dashboardSource, /aria-labelledby="persona-identity-heading"[^>]*className="card-3d p-6/);
    assert.match(dashboardSource, /aria-labelledby="transaction-heatmap-heading"[^>]*className="card-3d p-6/);
    assert.match(dashboardSource, /className="grid grid-cols-1 gap-4 md:grid-cols-2"/);
    assert.match(docsSource, /id="pipeline-architecture" className="border-y border-\[#c8c8c8\]/);
  });

  it('keeps the flow graph prominent and labels unavailable values explicitly', () => {
    const flowSource = readSource('./CapitalFlowGraph.tsx');
    assert.match(flowSource, /id="capital-flow-graph-heading"/);
    assert.match(flowSource, /min-w-\[720px\]/);
    assert.match(flowSource, /flow-graph-scroll/);
    assert.match(flowSource, /Interactive capital flow graph with/);
    assert.match(flowSource, /formatGraphVolume/);
    assert.match(flowSource, /USD value unavailable/);
    assert.match(flowSource, /Cannot derive from unavailable values/);
  });

  it('consolidates provider warnings behind one native disclosure summary', () => {
    const dashboardSource = readSource('./Dashboard.tsx');
    const summarySource = readSource('./status/ProviderStatusSummary.tsx');
    assert.match(dashboardSource, /hasProviderWarnings/);
    assert.doesNotMatch(dashboardSource, /Chain Warnings \/ Degradation Alert/);
    assert.match(summarySource, /<details/);
    assert.match(summarySource, /<summary/);
    assert.match(summarySource, /role="region"/);
  });

  it('provides non-visual chart and heatmap summaries', () => {
    for (const relativePath of ['./BehavioralRadarChart.tsx', './CapitalFlowGraph.tsx', './ClusterFlowGraph.tsx']) {
      const source = readSource(relativePath);
      assert.match(source, /sr-only/);
    }

    const heatmapSource = readSource('./ActivityHeatmap.tsx');
    assert.doesNotMatch(heatmapSource, /<table className="sr-only">/);
    assert.match(heatmapSource, /aria-label=\{`Transaction activity heatmap by UTC day and hour;/);
  });

  it('names icon-only explorer and graph controls', () => {
    for (const relativePath of ['./TransferTable.tsx', './ApprovalAudit.tsx', './InteractionsPanel.tsx', './CapitalFlowGraph.tsx', './ClusterFlowGraph.tsx']) {
      const source = readSource(relativePath);
      assert.match(source, /aria-label=/);
    }
  });

  it('renders transfer chain provenance and deduplicates rows before rendering', () => {
    const source = readSource('./TransferTable.tsx');
    assert.match(source, /deduplicateTokenTransfers/);
    assert.match(source, />CHAIN<\/th>/);
    assert.match(source, /\{t\.chainName\}/);
  });

  it('keeps the approvals table searchable, filterable, and paginated', () => {
    const source = readSource('./ApprovalAudit.tsx');
    const dropdownSource = readSource('./FilterDropdown.tsx');
    assert.match(source, /id="approval-search"/);
    assert.match(source, /Filter approvals by risk/);
    assert.match(source, /Filter approvals by chain/);
    assert.doesNotMatch(source, /<select/);
    assert.match(dropdownSource, /role="combobox"/);
    assert.match(dropdownSource, /role="listbox"/);
    assert.match(dropdownSource, /role="option"/);
    assert.match(dropdownSource, /event\.key === 'Escape'/);
    assert.match(source, /APPROVALS_PAGE_SIZE = 50/);
    assert.match(source, /Previous approvals page/);
    assert.match(source, /Next approvals page/);
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
