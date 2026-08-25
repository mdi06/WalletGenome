import { ImageResponse } from 'next/og';

export const alt = 'WalletGenome — EVM Wallet Analytics & Forensics';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '68px 76px',
          background: '#ebebeb',
          color: '#0a0a0a',
          fontFamily: 'Arial, sans-serif',
          border: '18px solid #0a0a0a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 34, fontWeight: 900, letterSpacing: '-1px' }}>
          WALLET<span style={{ color: '#ff5500' }}>.</span>GENOME
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 72, lineHeight: 1.02, fontWeight: 900, maxWidth: 980 }}>
            EVM Wallet Analytics &amp; Forensics
          </div>
          <div style={{ fontSize: 29, lineHeight: 1.3, color: '#374151', maxWidth: 960 }}>
            Behavior · Risk · Token Approvals · Capital Flows · Sybil Signals
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 22, fontWeight: 700 }}>
          <div style={{ width: 18, height: 18, background: '#ff5500' }} />
          Ethereum · Base · Arbitrum · Optimism
        </div>
      </div>
    ),
    size,
  );
}
