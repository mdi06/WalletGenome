import assert from 'node:assert';
import { describe, it } from 'node:test';
import { filterDocumentationTopics, getFirstMatchingDocumentationTopicId, shouldShowMobileTopicJump } from './docsNavigation';

const topics = [
  {
    id: 'pipeline-architecture',
    category: '1. Architecture & Ingestion',
    title: 'Multi-Chain Pipeline',
    summary: 'Data gateway and provider failover.',
    filePath: 'src/lib/etherscan.ts',
  },
  {
    id: 'approvals-exposure-audit',
    category: '6. Token Allowances',
    title: 'ERC-20 Approval Exposure',
    summary: 'Allowance and capital at risk.',
    filePath: 'src/lib/analysis/approvals.ts',
  },
] as const;

describe('documentation topic filtering', () => {
  it('matches topic title, category, and file path while preserving order', () => {
    assert.deepStrictEqual(
      filterDocumentationTopics(topics, 'approvals').map(topic => topic.id),
      ['approvals-exposure-audit'],
    );
    assert.deepStrictEqual(
      filterDocumentationTopics(topics, 'architecture').map(topic => topic.id),
      ['pipeline-architecture'],
    );
    assert.deepStrictEqual(
      filterDocumentationTopics(topics, '   ').map(topic => topic.id),
      ['pipeline-architecture', 'approvals-exposure-audit'],
    );
  });

  it('selects the first match only when the active topic is outside the results', () => {
    assert.strictEqual(
      getFirstMatchingDocumentationTopicId(topics, 'approvals', 'pipeline-architecture'),
      'approvals-exposure-audit',
    );
    assert.strictEqual(
      getFirstMatchingDocumentationTopicId(topics, 'approvals', 'approvals-exposure-audit'),
      null,
    );
  });

  it('returns no active replacement for a no-results query', () => {
    assert.deepStrictEqual(filterDocumentationTopics(topics, 'does-not-exist'), []);
    assert.strictEqual(
      getFirstMatchingDocumentationTopicId(topics, 'does-not-exist', 'pipeline-architecture'),
      null,
    );
  });

  it('shows the mobile topic jump only after the contents index has passed above the viewport', () => {
    assert.strictEqual(
      shouldShowMobileTopicJump({ isIntersecting: false, boundingClientRect: { bottom: 1 } }),
      false,
    );
    assert.strictEqual(
      shouldShowMobileTopicJump({ isIntersecting: true, boundingClientRect: { bottom: 200 } }),
      false,
    );
    assert.strictEqual(
      shouldShowMobileTopicJump({ isIntersecting: false, boundingClientRect: { bottom: -1 } }),
      true,
    );
  });
});
