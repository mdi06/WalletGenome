import assert from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('P1 design-audit contracts', () => {
  it('gives every input and search field a visible focus treatment', () => {
    const wrapperSources = [
      './WalletInput.tsx',
      './BulkScanInput.tsx',
      '../app/docs/page.tsx',
      './InteractionsPanel.tsx',
      './ApprovalAudit.tsx',
      './TransferTable.tsx',
    ];

    for (const relativePath of wrapperSources) {
      assert.match(readSource(relativePath), /focus-within:ring-2/);
    }

    assert.match(readSource('./TransferTable.tsx'), /id="transfer-network"[\s\S]*focus:ring-2/);
  });

  it('jumps to the first matching documentation topic and restores focus when cleared', () => {
    const source = readSource('../app/docs/page.tsx');
    const updateStart = source.indexOf('const updateTopicFilter');
    const clearStart = source.indexOf('const clearTopicFilter');
    const updateSource = source.slice(updateStart, clearStart);

    assert.match(updateSource, /scrollToDocumentationTopic\(nextSectionId\)/);
    assert.match(source, /section\.scrollIntoView\(\{[\s\S]*prefersReducedMotion/);
    assert.match(source, /ref=\{docsSearchInputRef\}/);
    assert.match(source, /const clearTopicFilter[\s\S]*docsSearchInputRef\.current\?\.focus\(\)/);
    assert.match(source, /href=\{`#\$\{s\.id\}`\}/);
  });

  it('keeps the canonical contract linkable and qualifies unbenchmarked figures', () => {
    const source = readSource('../app/docs/page.tsx');

    assert.match(source, /id="reporting-contract"/);
    assert.match(source, /In plain language:/);
    assert.match(source, /id=\{`metric-\$\{metric\.field\}`\}/);
    assert.match(source, /illustrative/);
  });
});
