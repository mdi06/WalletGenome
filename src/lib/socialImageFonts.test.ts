import assert from 'node:assert/strict';
import { it } from 'node:test';
import { loadSocialImageFonts } from './socialImageFonts';

it('loads sharing-image font bytes from the selected family rather than a fixed font', async context => {
  const requests: URL[] = [];
  const bytes = new Uint8Array([0, 1, 0, 0]);
  context.mock.method(globalThis, 'fetch', async (input: string | URL | Request, options?: RequestInit) => {
    const url = new URL(String(input));
    requests.push(url);
    assert.equal(options?.cache, 'force-cache');
    if (url.hostname === 'fonts.googleapis.com') {
      assert.equal(url.searchParams.get('text'), 'WalletGenome & Forensics');
      const weight = url.searchParams.get('family')?.split('@')[1];
      return new Response(`@font-face { src: url(https://fonts.gstatic.com/example-${weight}.ttf) format('truetype'); }`);
    }
    assert.equal(url.hostname, 'fonts.gstatic.com');
    return new Response(bytes);
  });

  for (const family of ['Inter', 'Space Grotesk']) {
    const fonts = await loadSocialImageFonts(`'${family}', '${family} Fallback'`, 'WalletGenome & Forensics');
    assert.deepEqual(fonts.map(font => [font.name, font.weight, font.style]), [
      [family, 400, 'normal'], [family, 700, 'normal'],
    ]);
    fonts.forEach(font => assert.deepEqual(new Uint8Array(font.data), bytes));
  }
  assert.deepEqual(requests.filter(url => url.hostname === 'fonts.googleapis.com').map(url => url.searchParams.get('family')), [
    'Inter:wght@400', 'Inter:wght@700', 'Space Grotesk:wght@400', 'Space Grotesk:wght@700',
  ]);
});

it('reports stylesheet failures instead of silently rendering a different font', async context => {
  context.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
  await assert.rejects(loadSocialImageFonts('Inter', 'WalletGenome'), /Unable to load sharing-image font Inter \(503\)/);
});

it('rejects unsupported font files and unexpected asset hosts', async context => {
  for (const source of [
    "src: url(https://fonts.gstatic.com/font.woff2) format('woff2');",
    "src: url(https://unexpected.example/font.ttf) format('truetype');",
  ]) {
    const fetchMock = context.mock.method(globalThis, 'fetch', async () => new Response(source));
    await assert.rejects(loadSocialImageFonts('Inter', 'WalletGenome'), /No supported sharing-image font file/);
    assert.equal(fetchMock.mock.callCount(), 2);
    fetchMock.mock.restore();
  }
});

it('reports font-download failures instead of passing invalid bytes to the renderer', async context => {
  context.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => (
    new URL(String(input)).hostname === 'fonts.googleapis.com'
      ? new Response("src: url(https://fonts.gstatic.com/font.ttf) format('truetype');")
      : new Response('', { status: 404 })
  ));
  await assert.rejects(loadSocialImageFonts('Inter', 'WalletGenome'), /Unable to download sharing-image font Inter \(404\)/);
});
