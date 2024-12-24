import { create } from 'zustand';
import { supabase } from '@/lib/supabase/supabase';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

interface Paper {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  year: number;
  arxiv_id: string;
  categories: string[];
  likes: number;
  bookmarks: number;
  links: {
    pdf?: string;
    html?: string;
  };
  doi?: string;
}

interface BookmarkResponse {
  paper_id: string;
  papers: {
    id: string;
    title: string;
    abstract: string;
    authors: string[];
    year: number;
    arxiv_id: string;
    categories: string[];
    likes: number;
    bookmarks: number;
    pdf_url?: string;
    html_url?: string;
    doi?: string;
  };
}

interface PapersState {
  bookmarkedPapers: Paper[];
  fetchBookmarkedPapers: () => Promise<void>;
  addBookmark: (paper: Paper) => Promise<void>;
  removeBookmark: (paperId: string) => Promise<void>;
}

export const usePapersStore = create<PapersState>((set, get) => ({
  bookmarkedPapers: [],

  fetchBookmarkedPapers: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bookmarks, error } = await supabase
        .from('user_bookmarks')
        .select(`
          paper_id,
          papers (
            id,
            title,
            abstract,
            authors,
            year,
            arxiv_id,
            categories,
            likes,
            bookmarks,
            pdf_url,
            html_url,
            doi
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const papers = (bookmarks as unknown as BookmarkResponse[])?.map(bookmark => ({
        id: bookmark.papers.id,
        title: bookmark.papers.title,
        abstract: bookmark.papers.abstract,
        authors: bookmark.papers.authors,
        year: bookmark.papers.year,
        arxiv_id: bookmark.papers.arxiv_id,
        categories: bookmark.papers.categories,
        likes: bookmark.papers.likes,
        bookmarks: bookmark.papers.bookmarks,
        links: {
          pdf: bookmark.papers.pdf_url,
          html: bookmark.papers.html_url,
        },
        doi: bookmark.papers.doi,
      })) || [];

      set({ bookmarkedPapers: papers });
    } catch (error) {
      console.error('Error fetching bookmarked papers:', error);
    }
  },

  addBookmark: async (paper: Paper) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Generate a UUID for the paper
      const paperId = uuidv4();

      // First, ensure the paper exists in the papers table
      const { error: paperError } = await supabase
        .from('papers')
        .upsert({
          id: paperId,  // Use generated UUID instead of arXiv ID
          title: paper.title,
          abstract: paper.abstract,
          authors: paper.authors,
          year: paper.year,
          arxiv_id: paper.arxiv_id,  // Keep arXiv ID as a separate field
          categories: paper.categories,
          pdf_url: paper.links.pdf,
          html_url: paper.links.html,
          doi: paper.doi,
          bookmarks: 0,
          likes: 0,
        });

      if (paperError) throw paperError;

      // Then create the bookmark
      const { error: bookmarkError } = await supabase
        .from('user_bookmarks')
        .insert({
          user_id: user.id,
          paper_id: paperId,  // Use the generated UUID
        });

      if (bookmarkError) throw bookmarkError;

      // Increment the bookmarks count
      const { error: updateError } = await supabase
        .from('papers')
        .update({ bookmarks: (paper.bookmarks || 0) + 1 })
        .eq('id', paperId);  // Use the generated UUID

      if (updateError) throw updateError;

      // Refresh the bookmarked papers
      await get().fetchBookmarkedPapers();
    } catch (error) {
      console.error('Error adding bookmark:', error);
    }
  },

  removeBookmark: async (paperId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First get the current paper to check its bookmark count
      const { data: paper, error: fetchError } = await supabase
        .from('papers')
        .select('bookmarks')
        .eq('id', paperId)
        .single();

      if (fetchError) throw fetchError;

      // Delete the bookmark
      const { error: bookmarkError } = await supabase
        .from('user_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('paper_id', paperId);

      if (bookmarkError) throw bookmarkError;

      // Decrement the bookmarks count, ensuring it doesn't go below 0
      const newBookmarks = Math.max((paper?.bookmarks || 0) - 1, 0);
      const { error: updateError } = await supabase
        .from('papers')
        .update({ bookmarks: newBookmarks })
        .eq('id', paperId);

      if (updateError) throw updateError;

      // Update local state
      set(state => ({
        bookmarkedPapers: state.bookmarkedPapers.filter(p => p.id !== paperId)
      }));
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  },
})); 