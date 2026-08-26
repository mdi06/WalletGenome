import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ApprovalAudit from './ApprovalAudit';
import { getMockScanResult } from '@/lib/mockData';

describe('Approval exposure reporting', () => {
  it('separates USD exposure, high-risk counts, unlimited counts, and provenance', () => {
    const result = getMockScanResult().chains[0];
    const markup = renderToStaticMarkup(createElement(ApprovalAudit, { results: [result] }));

    assert.match(markup, /EST\. APPROVAL EXPOSURE/);
    assert.match(markup, /\$5\.00K/);
    assert.match(markup, /HIGH-RISK SPENDERS/);
    assert.match(markup, /Count, not USD exposure/);
    assert.match(markup, /stablecoin assumption/);
  });

  it('limits the approvals table to one paginated page', () => {
    const result = getMockScanResult().chains[0];
    const approval = result.approvalSummary.activeApprovals[0];
    result.approvalSummary.activeApprovals = Array.from({ length: 55 }, (_, index) => ({
      ...approval,
      tokenSymbol: `TKN${index}`,
      tokenName: `Token ${index}`,
      spender: `0x${String(index).padStart(40, '0')}`,
    }));

    const markup = renderToStaticMarkup(createElement(ApprovalAudit, { results: [result] }));

    assert.match(markup, /Search approvals/);
    assert.match(markup, /Filter approvals by risk/);
    assert.match(markup, /Filter approvals by chain/);
    assert.doesNotMatch(markup, /<select/);
    assert.match(markup, /role="combobox"/);
    assert.match(markup, /Showing 1–50 of 55 matching approvals/);
    assert.match(markup, /Page 1 of 2/);
    assert.match(markup, /TKN49/);
    assert.doesNotMatch(markup, /TKN50/);
  });

  it('does not render unavailable exposure as zero dollars', () => {
    const result = getMockScanResult().chains[0];
    result.approvalSummary.activeApprovals[0].estimatedExposureUSD = null;
    result.approvalSummary.activeApprovals[0].estimatedExposureUSDProvenance = 'unpriced';
    result.approvalSummary.activeApprovals[0].exposureStatus = 'unavailable';
    result.approvalSummary.totalExposureUSD = null;
    result.approvalSummary.totalExposureUSDProvenance.status = 'partial';
    result.approvalSummary.exposureStatus = 'partial';

    const markup = renderToStaticMarkup(createElement(ApprovalAudit, { results: [result] }));
    assert.match(markup, /Unavailable \(balance or price unknown\)/);
    assert.doesNotMatch(markup, /\$0 \(zero reconstructed balance\)/);
  });
});
