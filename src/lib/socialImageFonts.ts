interface SocialImageFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: 'normal';
}

// ImageResponse needs font bytes; browser font classes alone cannot style a PNG.
// Derive the family from the shared next/font object so there is no second selector.
export async function loadSocialImageFonts(cssFontFamily: string, text: string): Promise<SocialImageFont[]> {
  const family = cssFontFamily.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  if (!family) throw new Error('The shared main font has no family name.');

  return Promise.all(([400, 700] as const).map(async weight => {
    const url = new URL('https://fonts.googleapis.com/css2');
    url.searchParams.set('family', `${family}:wght@${weight}`);
    url.searchParams.set('text', text);
    const stylesheet = await fetch(url, { cache: 'force-cache', signal: AbortSignal.timeout(10_000) });
    if (!stylesheet.ok) throw new Error(`Unable to load sharing-image font ${family} (${stylesheet.status}).`);

    const css = await stylesheet.text();
    const source = css.match(/src:\s*url\(['"]?(https:\/\/fonts\.gstatic\.com\/[^\s)'";]+)['"]?\)\s*format\(['"](?:truetype|opentype|woff)['"]\)/);
    if (!source) throw new Error(`No supported sharing-image font file found for ${family}.`);

    const response = await fetch(source[1], { cache: 'force-cache', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`Unable to download sharing-image font ${family} (${response.status}).`);

    return { name: family, data: await response.arrayBuffer(), weight, style: 'normal' };
  }));
}
