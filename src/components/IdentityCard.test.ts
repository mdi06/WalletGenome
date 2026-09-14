import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import IdentityCard from './IdentityCard';
import type { WalletAccountClassification } from '@/lib/types';

const identityCardSource = readFileSync(new URL('./IdentityCard.tsx', import.meta.url), 'utf8');

const address = '0x1234567890123456789012345678901234567890';

function classification(
  chainId: number,
  chainName: string,
  type: WalletAccountClassification['type'],
): WalletAccountClassification {
  return {
    address,
    chainId,
    chainName,
    type,
    confidence: type === 'unknown' ? 'unknown' : 'verified',
    evidence: 'test evidence',
  };
}

function render(accountClassifications: WalletAccountClassification[]) {
  return renderToStaticMarkup(createElement(IdentityCard, { address, accountClassifications }));
}

describe('IdentityCard account type display', () => {
  it('hides the classification section for a regular wallet on every checked chain', () => {
    const markup = render([
      classification(1, 'Ethereum', 'eoa'),
      classification(8453, 'Base', 'eoa'),
    ]);

    assert.doesNotMatch(markup, /Account type|Account classification/);
  });

  it('shows compact contract and smart-wallet labels', () => {
    assert.match(render([classification(1, 'Ethereum', 'regular_contract')]), /Account type: Contract/);
    assert.match(render([classification(1, 'Ethereum', 'smart_account')]), /Account type: Smart wallet/);
    assert.doesNotMatch(render([classification(1, 'Ethereum', 'regular_contract')]), /<details/);
    assert.doesNotMatch(render([classification(1, 'Ethereum', 'smart_account')]), /<details/);
  });

  it('puts different network types behind a native details disclosure', () => {
    const markup = render([
      classification(1, 'Ethereum', 'eoa'),
      classification(8453, 'Base', 'regular_contract'),
    ]);

    assert.match(markup, /Account type varies by network/);
    assert.match(markup, /<details/);
    assert.match(markup, /Ethereum/);
    assert.match(markup, /Base/);
    assert.doesNotMatch(markup, /<details[^>]*open/);
  });

  it('puts failed checks and only their affected networks behind details', () => {
    const markup = render([
      classification(1, 'Ethereum', 'eoa'),
      classification(42161, 'Arbitrum', 'unknown'),
    ]);

    assert.match(markup, /Account type could not be verified/);
    assert.match(markup, /<details/);
    assert.match(markup, /Arbitrum/);
    assert.doesNotMatch(markup, /Check failed[^<]*Ethereum/);
    assert.doesNotMatch(markup, /RPC evidence|confidence|Classification is derived/);
  });

  it('restores the reserved avatar fallback after a failed image and resets it for a new source', () => {
    assert.match(identityCardSource, /const \[avatarFailed, setAvatarFailed\] = useState\(false\)/);
    assert.match(identityCardSource, /setAvatarFailed\(false\)/);
    assert.match(identityCardSource, /\}, \[identity\?\.primaryAvatar\]\)/);
    assert.match(identityCardSource, /identity\?\.primaryAvatar && !avatarFailed/);
    assert.match(identityCardSource, /onError=\{\(\) => setAvatarFailed\(true\)\}/);
    assert.match(identityCardSource, /aria-hidden="true" className="text-xl"/);
  });
});
