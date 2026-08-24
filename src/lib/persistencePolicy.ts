export const PERSISTENCE_POLICY = {
  mode: 'stateless',
  durableStorage: false,
  runtimeFilesystemWrites: false,
  reports: {
    saved: false,
    comparableHistory: false,
    retention: 'request-only',
  },
  caches: {
    scope: 'process-local',
    requiredForCorrectness: false,
    scanTtlSeconds: 300,
    identityTtlSeconds: 1_800,
    emptyIdentityTtlSeconds: 600,
  },
} as const;
