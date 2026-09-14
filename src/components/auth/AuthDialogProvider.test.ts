import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');
const headerSource = readSource('../SiteHeader.tsx');
const actionsSource = readSource('./AuthActions.tsx');
const providerSource = readSource('./AuthDialogProvider.tsx');
const dialogSource = readSource('./LiveScanSignInDialog.tsx');

test('header sign-in opens the shared chooser without starting a provider flow', () => {
  assert.match(actionsSource, /openSignInDialog\(\{ returnFocusFallbackRef \}, signInButtonRef\.current\)/);
  assert.doesNotMatch(actionsSource, /signInWithGoogle|discoverEthereumWallets|signInWithEthereum/);
  assert.match(headerSource, /<AuthActions onSignIn=\{closeMenu\} returnFocusFallbackRef=\{menuToggleRef\} \/>/);
  assert.match(providerSource, /<LiveScanSignInDialog[\s\S]*open=\{isOpen\}/);
  assert.match(providerSource, /!request\.onGoogleContinue && !request\.onWalletAuthenticated\) clearPendingLiveScan\(\)/);
  assert.match(providerSource, /request\.onGoogleContinue[\s\S]*signInWithGoogle\(currentPathWithSearch\(\)\)/);
});

test('provider actions start only from the selected dialog control', () => {
  assert.match(dialogSource, /onClick=\{handleGoogleContinue\}/);
  assert.match(dialogSource, /onClick=\{\(\) => void signInWithWallet\(wallet\)\}/);
  assert.match(dialogSource, /onClick=\{handleClose\}/);
  assert.doesNotMatch(dialogSource, /eth_requestAccounts|personal_sign/);
  assert.match(providerSource, /onContinue=\{\(\) => void continueWithGoogle\(\)\}/);
});

test('scanner authentication retains its pending continuation while header auth has none', () => {
  const pageSource = readSource('../../app/page.tsx');
  const scannerRequest = pageSource.slice(pageSource.indexOf('const openScanSignInDialog'), pageSource.indexOf('const requestSingleScan'));
  assert.match(scannerRequest, /onGoogleContinue: \(\) => continueWithGoogle\(pendingScan\)/);
  assert.match(scannerRequest, /onWalletAuthenticated: \(\) => resumeWalletScan\(pendingScan\)/);
  assert.match(scannerRequest, /onClose: clearPendingLiveScan/);
  assert.doesNotMatch(actionsSource, /onWalletAuthenticated|handleSingleScan|handleClusterScan/);
});

test('the shared dialog is outside the mobile disclosure and restores to its fallback trigger', () => {
  const layoutSource = readSource('../../app/layout.tsx');
  const disclosureStart = headerSource.indexOf('id="primary-navigation-menu"');
  const authStart = headerSource.indexOf('<AuthActions ');
  assert.ok(authStart > disclosureStart);
  assert.match(layoutSource, /<AuthProvider>[\s\S]*<AuthDialogProvider>[\s\S]*<div data-app-shell>/);
  assert.match(providerSource, /setReturnFocusFallbackRef\(request\.returnFocusFallbackRef\)/);
  assert.match(readSource('../AppDialog.tsx'), /canRestoreFocus\(focusReturnTarget\)[\s\S]*canRestoreFocus\(focusFallbackTarget\)/);
});
