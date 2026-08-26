import { formatDemoSnapshotDate, type DemoWallet } from '@/lib/demoWallets';

interface DemoSnapshotNoticeProps {
  demo: DemoWallet;
  onRunFreshScan: () => void;
  isLoading: boolean;
}

export default function DemoSnapshotNotice({
  demo,
  onRunFreshScan,
  isLoading,
}: DemoSnapshotNoticeProps) {
  return (
    <section
      aria-label="Demo snapshot status"
      className="flex flex-col gap-3 border-2 border-[#0a0a0a] bg-[#fff7ed] p-3 shadow-[3px_3px_0_#0a0a0a] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-wider text-[#0a0a0a]">
          Demo snapshot · Updated {formatDemoSnapshotDate(demo.generatedAt)}
        </p>
        <p className="mt-1 text-xs font-medium text-[#4b5563]">
          Saved public data for {demo.name}. This view does not spend provider API quota and is not live.
        </p>
      </div>
      <button
        type="button"
        onClick={onRunFreshScan}
        disabled={isLoading}
        className="btn-3d-black min-h-11 shrink-0 px-4 py-2 text-xs font-black uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Run fresh scan
      </button>
    </section>
  );
}
