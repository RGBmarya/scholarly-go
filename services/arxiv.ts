import { XMLParser } from 'fast-xml-parser';

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

export async function searchArxiv(query: string = '', start: number = 0, maxResults: number = 10): Promise<ArxivPaper[]> {
  try {
    const baseUrl = 'http://export.arxiv.org/api/query';
    console.log(query) 
    // Default search query for ML/AI papers if no query provided
    const defaultQuery = 'cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL';
    const searchQuery = query 
      ? `search_query=${encodeURIComponent(query)}`
      : `search_query=${defaultQuery}`;
    
    // Add sorting to get most recent papers first
    const url = `${baseUrl}?${searchQuery}&start=${start}&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ArXiv API error: ${response.status} ${response.statusText}`);
    }
    
    const xmlData = await response.text();
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '__text',
      isArray: (name: string) => ['author', 'category', 'link'].indexOf(name) !== -1,
      parseAttributeValue: true,
      ignoreDeclaration: true,
      removeNSPrefix: true,
      processEntities: true,
      tagValueProcessor: (tagName: string, tagValue: string) => {
        if (typeof tagValue === 'string') {
          return tagValue.trim();
        }
        return tagValue;
      }
    });
    
    const result = parser.parse(xmlData) as ArxivResponse;
    
    if (!result.feed?.entry) {
      console.warn('No entries found in ArXiv response');
      return [];
    }

    // Keep track of used IDs to ensure uniqueness
    const usedIds = new Set<string>();

    return result.feed.entry
      .filter(entry => {
        // Filter out entries without required fields
        const isValid = !!(
          entry?.id &&
          entry?.title &&
          entry?.author &&
          entry?.summary
        );
        if (!isValid) {
          console.warn('Invalid entry:', JSON.stringify(entry, null, 2));
        }
        return isValid;
      })
      .map((entry, index) => {
        // Extract PDF and HTML links
        const links = {
          pdf: entry.link?.find(link => link.title === 'pdf' || link.type === 'application/pdf')?.href,
          html: entry.link?.find(link => link.rel === 'alternate' && link.type === 'text/html')?.href
        };
        
        // Extract authors (handle both single author and multiple authors cases)
        const authors = Array.isArray(entry.author)
          ? entry.author
              .filter(author => author?.name)
              .map(author => author.name.trim())
          : entry.author?.name
              ? [entry.author.name.trim()]
              : ['Unknown Author'];
        
        // Extract categories (including primary category)
        const categories = [];
        if (entry['primary_category']?.term) {
          categories.push(entry['primary_category'].term);
        }
        if (Array.isArray(entry.category)) {
          categories.push(
            ...entry.category
              .filter(cat => cat?.term)
              .map(cat => cat.term)
          );
        } else if (entry.category?.term) {
          categories.push(entry.category.term);
        }

        // Remove duplicates from categories
        const uniqueCategories = [...new Set(categories)];

        // Extract arXiv ID from the full URL or generate a unique one
        let arxivId: string;
        if (entry.id) {
          const idMatch = entry.id.match(/abs\/([^\/]+)(?:v\d+)?$/);
          arxivId = idMatch ? idMatch[1] : entry.id;
        } else {
          // Generate a unique ID based on title and index
          const baseId = entry.title
            ? `generated-${entry.title.slice(0, 20).toLowerCase().replace(/[^a-z0-9]/g, '-')}`
            : `paper-${index}`;
          
          // Ensure uniqueness by appending a number if necessary
          let uniqueId = baseId;
          let counter = 1;
          while (usedIds.has(uniqueId)) {
            uniqueId = `${baseId}-${counter}`;
            counter++;
          }
          arxivId = uniqueId;
        }
        usedIds.add(arxivId);

        // Clean and validate text content
        const cleanText = (text: string) => {
          if (!text) return '';
          // Decode HTML entities and clean whitespace
          return text
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
        };
        
        const title = cleanText(entry.title);
        const abstract = cleanText(entry.summary);
        const published = entry.published || new Date().toISOString();
        const updated = entry.updated || published;

        return {
          id: arxivId,
          title: title || 'Untitled',
          abstract: abstract || 'No abstract available',
          authors: authors.length > 0 ? authors : ['Unknown Author'],
          published,
          updated,
          categories: uniqueCategories.length > 0 ? uniqueCategories : ['uncategorized'],
          links,
          arxiv_id: arxivId,
          year: new Date(published).getFullYear(),
          doi: undefined // arXiv API doesn't provide DOI directly
        };
      });
  } catch (error) {
    console.error('Error fetching from arXiv:', error);
    throw error;
  }
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