'use client';

import { Loader2 } from 'lucide-react';

interface ProgressBarProps {
  message: string;
  progress?: number; // 0-100
}

export default function ProgressBar({ message, progress }: ProgressBarProps) {
  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.inner}>
        <Loader2 size={20} color="var(--accent-indigo)" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={styles.message}>{message}</span>
      </div>
      {typeof progress === 'number' && (
        <div style={styles.barTrack}>
          <div
            style={{
              ...styles.barFill,
              width: `${Math.min(100, Math.max(0, progress))}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 'var(--space-xl) var(--space-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
    alignItems: 'center',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  },
  message: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
  },
  barTrack: {
    width: '100%',
    maxWidth: 400,
    height: 4,
    background: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--accent-indigo), var(--accent-blue))',
    borderRadius: 'var(--radius-full)',
    transition: 'width 0.4s ease',
  },
};
