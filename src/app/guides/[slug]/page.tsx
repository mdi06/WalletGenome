import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GuideArticle from '@/components/GuideArticle';
import { buildGuideMetadata, getGuide, GUIDES } from '@/lib/guides';

export const dynamicParams = true;

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return GUIDES.map(guide => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  return guide ? buildGuideMetadata(guide) : {};
}

export default async function GuidePageRoute({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  return <GuideArticle guide={guide} />;
}
