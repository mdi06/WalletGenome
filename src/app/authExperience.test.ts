import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const betaSource = readFileSync(new URL('../components/auth/BetaUpdatesCard.tsx', import.meta.url), 'utf8');

test('signed-out single and cluster submits open the app-owned dialog before OAuth', () => {
  const singleRequest = pageSource.slice(pageSource.indexOf('const requestSingleScan'), pageSource.indexOf('const requestClusterScan'));
  const clusterRequest = pageSource.slice(pageSource.indexOf('const requestClusterScan'), pageSource.indexOf('React.useEffect'));

  assert.match(singleRequest, /openSignInDialog\(\{ mode: 'single'/);
  assert.doesNotMatch(singleRequest, /signInWithGoogle/);
  assert.match(clusterRequest, /openSignInDialog\(\{ mode: 'cluster'/);
  assert.doesNotMatch(clusterRequest, /signInWithGoogle/);
  assert.match(pageSource, /setIsSignInDialogOpen\(true\)/);
});

test('continue writes the pending request and the authenticated effect resumes it', () => {
  assert.match(pageSource, /localStorage\.setItem\(PENDING_LIVE_SCAN_KEY, serializePendingLiveScan\(pendingLiveScan\)\)/);
  assert.match(pageSource, /signInWithGoogle\(\`\$\{window\.location\.pathname\}/);
  assert.match(pageSource, /parsePendingLiveScan\(serialized\)/);
  assert.match(pageSource, /handleSingleScan\(pendingScan\.address, pendingScan\.chainIds/);
  assert.match(pageSource, /handleClusterScan\(pendingScan\.addresses, pendingScan\.chainIds/);
});

test('cancel path clears only pending storage and the signed-out guidance is compact', () => {
  assert.match(pageSource, /localStorage\.removeItem\(PENDING_LIVE_SCAN_KEY\)/);
  assert.match(pageSource, /Google sign-in is required for live scans\. Saved demos remain available without signing in\./);
  assert.match(pageSource, /!user && !isAuthLoading/);
  assert.match(pageSource, /if \(user\) setIsScanEditorOpen\(false\);/);
  assert.match(pageSource, /onSelectDemo=\{demo => void handleDemoSnapshot\(demo\)\}/);
});

test('beta updates are authenticated-only and remain an explicit opt-in action', () => {
  assert.match(betaSource, /if \(!user \|\| !isConfigured\) return null/);
  assert.doesNotMatch(betaSource, /signInWithGoogle/);
  assert.match(betaSource, /updateSubscription\(!subscribed\)/);
  assert.match(pageSource, /user && !isAuthLoading && !isLoading && <BetaUpdatesCard \/>/);
});
