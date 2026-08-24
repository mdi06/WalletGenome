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
