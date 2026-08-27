import assert from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ApprovalAudit from './ApprovalAudit';
import { getMockScanResult } from '@/lib/mockData';

const readSource = () => readFileSync(new URL('./ApprovalAudit.tsx', import.meta.url), 'utf8');

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

  it('keeps approval summary metrics compact and grouped on small screens', () => {
    const source = readSource();

    assert.match(source, /grid grid-cols-2/);
    assert.match(source, /lg:grid-cols-4/);
    assert.match(source, /EST\. APPROVAL EXPOSURE/);
    assert.match(source, /Unavailable/);
  });

  it('keeps unknown tokens distinguishable and links each contract independently', () => {
    const result = getMockScanResult().chains[0];
    const firstApproval = result.approvalSummary.activeApprovals[0];
    const firstTokenAddress = '0x1111111111111111111111111111111111111111';
    const secondTokenAddress = '0x2222222222222222222222222222222222222222';
    const firstSpenderAddress = '0x3333333333333333333333333333333333333333';
    const secondSpenderAddress = '0x4444444444444444444444444444444444444444';
    result.approvalSummary.activeApprovals = [
      {
        ...firstApproval,
        tokenSymbol: '???',
        tokenName: 'Unknown token one',
        tokenAddress: firstTokenAddress,
        spender: firstSpenderAddress,
      },
      {
        ...firstApproval,
        tokenSymbol: '???',
        tokenName: 'Unknown token two',
        tokenAddress: secondTokenAddress,
        spender: secondSpenderAddress,
      },
    ];

    const markup = renderToStaticMarkup(createElement(ApprovalAudit, { results: [result] }));

    assert.match(markup, /0x1111\.\.\.1111/);
    assert.match(markup, /0x2222\.\.\.2222/);
    assert.match(markup, new RegExp(`href="https://etherscan\\.io/address/${firstTokenAddress}"`));
    assert.match(markup, new RegExp(`href="https://etherscan\\.io/address/${secondTokenAddress}"`));
    assert.match(markup, new RegExp(`href="https://etherscan\\.io/address/${firstSpenderAddress}"`));
    assert.match(markup, new RegExp(`href="https://etherscan\\.io/address/${secondSpenderAddress}"`));
  });

  it('names the token copy action with the full address and reports clipboard success', () => {
    const tokenAddress = getMockScanResult().chains[0].approvalSummary.activeApprovals[0].tokenAddress;
    const markup = renderToStaticMarkup(createElement(ApprovalAudit, { results: [getMockScanResult().chains[0]] }));
    const source = readSource();

    assert.match(markup, new RegExp(`aria-label="Copy token contract ${tokenAddress}"`));
    assert.match(markup, /aria-live="polite"/);
    assert.match(source, /navigator\.clipboard\.writeText\(tokenAddress\)/);
    assert.match(source, /setCopiedTokenAddress\(tokenAddress\)/);
  });
});
