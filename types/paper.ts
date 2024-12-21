export interface PaperLinks {
  html: string;
  pdf: string;
  doi?: string;
}

export interface PaperData {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  links: PaperLinks;
  likes: number;
  isLikedByUser: boolean;
  bookmarked: boolean;
  categories: string[];
} 