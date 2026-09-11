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

  it('keeps the demo list as keyboard-accessible actions', () => {
    const source = readSource('./WelcomeGuide.tsx');
    assert.match(source, /DEMO_WALLETS\.map\(demo =>/);
    assert.match(source, /aria-label=\{`Load saved demo snapshot for \$\{demo\.name\}`\}/);
    assert.match(source, /onClick=\{\(\) => onSelectDemo\(demo\)\}/);
    assert.doesNotMatch(source, /absolute inset-0/);
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

  it('keeps scan evidence state logic out of the shared navigation chrome', () => {
    const pageSource = readSource('../app/page.tsx');
    const headerSource = readSource('./SiteHeader.tsx');
    const statusSource = readSource('../lib/indexingStatus.ts');
    assert.doesNotMatch(pageSource, /Live indexing/);
    assert.match(pageSource, /evidenceMode=\{indexingStatus\}/);
    assert.doesNotMatch(headerSource, /Indexing status:/);
    assert.doesNotMatch(headerSource, /STATUS_PRESENTATION/);
    assert.match(statusSource, /'ready' \| 'scanning' \| 'completed' \| 'saved' \| 'partial' \| 'unavailable'/);
    assert.match(statusSource, /scanMode === 'single' && activeDemoSnapshot/);
  });

  it('uses one standardized primary header on scanner and docs', () => {
    const pageSource = readSource('../app/page.tsx');
    const docsSource = readSource('../app/docs/page.tsx');
    const headerSource = readSource('./SiteHeader.tsx');

    assert.match(pageSource, /<SiteHeader[\s\S]*activePage="scanner"/);
    assert.match(docsSource, /<SiteHeader activePage="docs" \/>/);
    assert.match(docsSource, /Live scanner available/);
    assert.match(headerSource, /aria-label="Primary navigation"/);
    assert.match(headerSource, /aria-current=\{activePage === 'scanner'/);
    assert.match(headerSource, /aria-current=\{activePage === 'docs'/);
    assert.match(headerSource, />Docs \/ methodology</);
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
    assert.match(footerSource, /inline-flex min-h-11 w-full items-center justify-start/);
    assert.match(footerSource, /<nav aria-label="Wallet analytics topics"[\s\S]*SEO_LANDING_PAGES\.map/);
    assert.match(footerSource, /<div className="max-w-md space-y-2">[\s\S]*href="https:\/\/x\.com\/wallet_genome"[\s\S]*@wallet_genome/);
    assert.match(footerSource, /<svg aria-hidden="true" className="h-3\.5 w-3\.5"/);
    assert.doesNotMatch(footerSource, /md:border-l/);
    assert.match(footerSource, /flex flex-col gap-3 border-t/);
    assert.match(footerSource, /target="_blank"[\s\S]*rel="noopener noreferrer"/);
    assert.match(transferSource, /grid grid-cols-3 gap-2 md:flex/);
    assert.match(transferSource, /min-h-11 w-full justify-center/);
    assert.match(interactionSource, /min-h-11 text-xs font-bold px-3 py-1/);
  });

  it('documents the four supported EVM networks', () => {
    const docsSource = readSource('../app/docs/page.tsx');
    assert.match(docsSource, /4 supported EVM networks/);
    assert.match(docsSource, /Ethereum, Base, Arbitrum, and Optimism/);
    assert.doesNotMatch(docsSource, /5 EVM Networks/);
  });

  it('uses one compact mobile documentation index and keeps the full desktop index', () => {
    const docsSource = readSource('../app/docs/page.tsx');
    assert.match(docsSource, /<details[^>]*className="lg:hidden/);
    assert.match(docsSource, /TABLE OF CONTENTS/);
    assert.match(docsSource, /aria-label="Documentation sections"/);
    assert.match(docsSource, /<aside className="hidden lg:col-span-4/);
  });

  it('provides a mobile jump control that returns focus to the native topic index', () => {
    const docsSource = readSource('../app/docs/page.tsx');
    assert.match(docsSource, /IntersectionObserver/);
    assert.match(docsSource, /id="mobile-docs-index" ref=\{mobileDocsIndexRef\}/);
    assert.match(docsSource, /aria-label="Jump to documentation topics"/);
    assert.match(docsSource, /mobileDocsIndex\.open = true/);
    assert.match(docsSource, /mobileDocsIndex\.scrollIntoView/);
    assert.match(docsSource, /mobileDocsIndexSummaryRef\.current\?\.focus\(\)/);
    assert.match(docsSource, /href=\{`#\$\{s\.id\}`\}/);
    assert.match(docsSource, /addEventListener\('hashchange', syncActiveSectionFromHash\)/);
    assert.match(docsSource, /removeEventListener\('hashchange', syncActiveSectionFromHash\)/);
    assert.match(docsSource, /pb-32 lg:pb-6/);
    assert.match(docsSource, /line-clamp-2 whitespace-normal break-words/);
    assert.match(docsSource, /setActiveSection\(visibleSection\.target\.id\)/);
    assert.match(docsSource, /rootMargin: '-96px 0px -65% 0px'/);
  });

  it('uses framed dashboard modules with dividers inside dense groups', () => {
    const guideSource = readSource('./WelcomeGuide.tsx');
    const dashboardSource = readSource('./Dashboard.tsx');
    const docsSource = readSource('../app/docs/page.tsx');

    assert.match(guideSource, /divide-y divide-\[#c8c8c8\]/);
    assert.match(guideSource, /border-y border-\[#272a38\]/);
    assert.match(dashboardSource, /id="dashboard-flow-panel"[^>]*className="border-t border-\[#c8c8c8\]/);
    assert.match(dashboardSource, /aria-labelledby="transaction-heatmap-heading"[^>]*className="card-3d p-6/);
    assert.match(dashboardSource, /className="grid grid-cols-1 gap-4 md:grid-cols-2"/);
    assert.match(docsSource, /id="pipeline-architecture" className="pt-10 space-y-5 text-\[#0a0a0a\]/);
  });

  it('groups flow and gas summaries into readable cards', () => {
    const flowSource = readSource('./CapitalFlowGraph.tsx');
    const gasSource = readSource('./GasSummaryPanel.tsx');

    assert.match(flowSource, /aria-labelledby="flow-summary-heading" className="card-3d/);
    assert.match(flowSource, /aria-labelledby="most-interacted-heading" className="card-3d/);
    assert.match(flowSource, /card-3d flex flex-col gap-3 p-3/);
    assert.match(gasSource, /grid grid-cols-1 gap-3 sm:grid-cols-3/);
    assert.match(gasSource, /card-3d space-y-1 p-4 text-\[#0a0a0a\] sm:p-5/);
    assert.match(gasSource, /grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4/);
  });

  it('keeps the flow graph prominent and labels unavailable values explicitly', () => {
    const flowSource = readSource('./CapitalFlowGraph.tsx');
    assert.match(flowSource, /id="capital-flow-graph-heading"/);
    assert.match(flowSource, /min-w-\[720px\]/);
    assert.match(flowSource, /flow-graph-scroll/);
    assert.match(flowSource, /Capital flow graph visualization with/);
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
    const tableSource = readSource('../lib/transferTable.ts');
    assert.match(source, /collectTransferTableRows/);
    assert.match(tableSource, /deduplicateTokenTransfers/);
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
