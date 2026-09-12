export const PERSISTENCE_POLICY = {
  mode: 'stateless',
  durableStorage: true,
  durableStorageScope: 'optional-update-subscription-preferences-only',
  runtimeFilesystemWrites: false,
  reports: {
    saved: false,
    comparableHistory: false,
    retention: 'request-only',
  },
  subscriptions: {
    storage: 'public.update_subscriptions',
    userOptInRequired: true,
    retention: 'Retained while needed for the update list; unsubscribed rows preserve consent and withdrawal audit fields; account deletion cascades the row.',
  },
  curatedDemoSnapshots: {
    enabled: true,
    storage: 'versioned-static-assets',
    userGenerated: false,
    liveProviderCallsOnLoad: false,
  },
  caches: {
    scope: 'shared-with-process-fallback',
    requiredForCorrectness: false,
    scanTtlSeconds: 300,
    historyDatasetTtlSeconds: 3_600,
    refreshCooldownSeconds: 300,
    identityTtlSeconds: 1_800,
    emptyIdentityTtlSeconds: 600,
  },
} as const;
