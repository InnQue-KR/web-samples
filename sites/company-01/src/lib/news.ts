import { getCollection, type CollectionEntry } from 'astro:content';

export type News = CollectionEntry<'news'>;
/** 최신 글이 먼저. 같은 날짜면 주소 순(빌드마다 순서가 같게). */
export async function getNews(): Promise<News[]> {
  const all = await getCollection('news');
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}
/** 2026-10-14 형식(UTC 기준, 빌드 환경 시간대와 무관) */
export const ymd = (d: Date) => d.toISOString().slice(0, 10);
export const newsPath = (n: News) => `news/${n.id}/`;
