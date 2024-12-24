import { XMLParser } from 'fast-xml-parser';
import { supabase } from '@/lib/supabase/supabase';

interface ArxivAuthor {
  name: string;
}

interface ArxivLink {
  href: string;
  rel?: string;
  title?: string;
  type?: string;
}

interface ArxivCategory {
  term: string;
  scheme?: string;
}

interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  author: ArxivAuthor | ArxivAuthor[];
  published: string;
  updated: string;
  'primary_category': ArxivCategory;
  category: ArxivCategory | ArxivCategory[];
  link: ArxivLink[];
}

interface ArxivResponse {
  feed: {
    entry: ArxivEntry[];
    'opensearch:totalResults': string;
    'opensearch:startIndex': string;
    'opensearch:itemsPerPage': string;
  };
}

export interface ArxivPaper {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  published: string;
  updated: string;
  categories: string[];
  links: {
    pdf?: string;
    html?: string;
  };
  arxiv_id: string;
  year: number;
  doi?: string;
  likes?: number;
  bookmarks?: number;
}

export interface PaperData {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  year: number;
  likes: number;
  bookmarked: boolean;
  isLikedByUser: boolean;
  links: {
    pdf?: string;
    html?: string;
  };
  categories: string[];
}

interface PaperLikes {
  arxiv_id: string;
  likes: number;
}

export async function searchArxiv(query: string, start: number, maxResults: number): Promise<ArxivPaper[]> {
  const url = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&start=${start}&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
  const response = await fetch(url);
  const xmlData = await response.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
  });
  const result = parser.parse(xmlData) as ArxivResponse;

  if (!result.feed.entry) {
    return [];
  }

  const entries = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry];
  const papers = entries.map(entry => {
    const authors = Array.isArray(entry.author) ? entry.author : [entry.author];
    const categories = Array.isArray(entry.category) ? entry.category : [entry.category];
    const links = entry.link || [];

    const id = entry.id.split('/').pop()?.split('v')[0] || '';
    const version = entry.id.split('v').pop() || '';
    const arxiv_id = `${id}v${version}`;

    return {
      id: arxiv_id,
      title: entry.title.replace(/\n/g, ' ').trim(),
      abstract: entry.summary.replace(/\n/g, ' ').trim(),
      authors: authors.map(author => author.name),
      published: entry.published,
      updated: entry.updated,
      categories: categories.map(cat => cat.term),
      links: {
        pdf: links.find(link => link.title === 'pdf')?.href,
        html: links.find(link => !link.title)?.href,
      },
      arxiv_id,
      year: new Date(entry.published).getFullYear(),
      likes: 0, // Default value, will be updated below
    };
  });

  // Fetch like counts from Supabase for all papers
  const { data: existingPapers } = await supabase
    .from('papers')
    .select('arxiv_id, likes')
    .in('arxiv_id', papers.map(p => p.arxiv_id));

  // Create a map of arxiv_id to likes count
  const likesMap = new Map(
    (existingPapers as PaperLikes[] || []).map(p => [p.arxiv_id, p.likes || 0])
  );

  // Update papers with their like counts
  return papers.map(paper => ({
    ...paper,
    likes: likesMap.get(paper.arxiv_id) || 0,
  }));
}

export async function getRecommendedPapers(userInterests: string[] = []): Promise<ArxivPaper[]> {
  const query = userInterests.length > 0
    ? userInterests.map(interest => `cat:${interest}`).join('+OR+')
    : '';
  
  return searchArxiv(query, 0, 10);
}

export function transformArxivToPaperData(arxivPaper: ArxivPaper): PaperData {
  return {
    id: arxivPaper.id,
    title: arxivPaper.title,
    abstract: arxivPaper.abstract,
    authors: arxivPaper.authors,
    year: new Date(arxivPaper.published).getFullYear(),
    likes: 0,
    bookmarked: false,
    isLikedByUser: false,
    links: arxivPaper.links,
    categories: arxivPaper.categories,
  };
} 