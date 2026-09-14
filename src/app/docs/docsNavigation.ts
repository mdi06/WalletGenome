export interface DocumentationTopic {
  id: string;
  category: string;
  title: string;
  summary: string;
  filePath: string;
}

export function shouldShowMobileTopicJump(entry: {
  isIntersecting: boolean;
  boundingClientRect: Pick<DOMRectReadOnly, 'bottom'>;
}): boolean {
  return !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
}

export function filterDocumentationTopics<T extends DocumentationTopic>(
  topics: readonly T[],
  query: string,
): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [...topics];

  return topics.filter(topic => [
    topic.title,
    topic.summary,
    topic.category,
    topic.filePath,
  ].some(value => value.toLowerCase().includes(normalizedQuery)));
}

export function getFirstMatchingDocumentationTopicId<T extends DocumentationTopic>(
  topics: readonly T[],
  query: string,
  activeTopicId: string,
): string | null {
  const matchingTopics = filterDocumentationTopics(topics, query);
  if (matchingTopics.length === 0 || matchingTopics.some(topic => topic.id === activeTopicId)) return null;
  return matchingTopics[0].id;
}
