import { ImageResponse } from 'next/og';
import { mainFont } from './fonts';
import { loadSocialImageFonts } from '@/lib/socialImageFonts';

export const alt = 'WalletGenome — EVM Wallet Analytics & Forensics';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const title = 'EVM Wallet Analytics & Forensics';
const description = 'Behavior · Risk · Token Approvals · Capital Flows · Sybil Signals';
const networks = 'Ethereum · Base · Arbitrum · Optimism';

export default async function OpenGraphImage() {
  const fonts = await loadSocialImageFonts(
    mainFont.style.fontFamily,
    ['WALLET.GENOME', title, description, networks].join(' '),
  );

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
          fontFamily: fonts[0].name,
          border: '18px solid #0a0a0a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 34, fontWeight: 900, letterSpacing: '-1px' }}>
          WALLET<span style={{ color: '#ff5500' }}>.</span>GENOME
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 72, lineHeight: 1.02, fontWeight: 900, maxWidth: 980 }}>
            {title}
          </div>
          <div style={{ fontSize: 29, lineHeight: 1.3, color: '#374151', maxWidth: 960 }}>
            {description}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 22, fontWeight: 700 }}>
          <div style={{ width: 18, height: 18, background: '#ff5500' }} />
          {networks}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
