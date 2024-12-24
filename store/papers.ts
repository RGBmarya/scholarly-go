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
  removeBookmark: (arxivId: string) => Promise<void>;
  isBookmarked: (arxivId: string) => { isBookmarked: boolean; paperId?: string };
  addLike: (paper: Paper) => Promise<void>;
  removeLike: (arxivId: string) => Promise<void>;
  isLiked: (arxivId: string) => Promise<boolean>;
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

  removeBookmark: async (arxivId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { paperId } = get().isBookmarked(arxivId);
      if (!paperId) {
        console.error('Paper not found in bookmarks');
        return;
      }

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

  isBookmarked: (arxivId: string) => {
    const paper = get().bookmarkedPapers.find(paper => paper.arxiv_id === arxivId);
    return {
      isBookmarked: Boolean(paper),
      paperId: paper?.id
    };
  },

  addLike: async (paper: Paper) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found when trying to add like');
        return;
      }

      console.log(`Attempting to add like for paper with arXiv ID: ${paper.arxiv_id}`);

      // First, check if the paper already exists
      const { data: existingPapers, error: findError } = await supabase
        .from('papers')
        .select('id, likes')
        .eq('arxiv_id', paper.arxiv_id)
        .limit(1);

      if (findError) {
        console.error('Error finding existing paper:', findError);
        throw findError;
      }

      let paperId: string;
      
      if (!existingPapers || existingPapers.length === 0) {
        // Paper doesn't exist, create it
        const newPaperId = uuidv4();
        const { error: paperError } = await supabase
          .from('papers')
          .insert({
            id: newPaperId,
            title: paper.title,
            abstract: paper.abstract,
            authors: paper.authors,
            year: paper.year,
            arxiv_id: paper.arxiv_id,
            categories: paper.categories,
            pdf_url: paper.links.pdf,
            html_url: paper.links.html,
            doi: paper.doi,
            likes: 1,  // Start with 1 like
            bookmarks: 0,
          });

        if (paperError) {
          console.error('Error creating paper:', paperError);
          throw paperError;
        }
        paperId = newPaperId;
        console.log('Created new paper with ID:', paperId);
      } else {
        // Paper exists, increment its likes
        paperId = existingPapers[0].id;
        const { error: updateError } = await supabase
          .from('papers')
          .update({ likes: (existingPapers[0].likes || 0) + 1 })
          .eq('id', paperId);

        if (updateError) {
          console.error('Error updating paper likes:', updateError);
          throw updateError;
        }
        console.log('Updated existing paper likes:', existingPapers[0].id);
      }

      // Create the like entry
      const { error: likeError } = await supabase
        .from('user_likes')
        .insert({
          user_id: user.id,
          paper_id: paperId,
        });

      if (likeError) {
        console.error('Error creating like:', likeError);
        throw likeError;
      }
      console.log('Created like for paper:', paperId);

    } catch (error) {
      console.error('Error adding like:', error);
    }
  },

  removeLike: async (arxivId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found when trying to remove like');
        return;
      }

      console.log(`Attempting to remove like for paper with arXiv ID: ${arxivId}`);

      // Find the paper by arXiv ID
      const { data: papers, error: paperError } = await supabase
        .from('papers')
        .select('id, likes')
        .eq('arxiv_id', arxivId)
        .limit(1);

      if (paperError) {
        console.error('Error finding paper:', paperError);
        throw paperError;
      }
      
      if (!papers || papers.length === 0) {
        console.log('No paper found with arXiv ID:', arxivId);
        return;
      }

      const paper = papers[0];
      console.log('Found paper:', paper);

      // Delete the like
      const { error: likeError, data: deletedLike } = await supabase
        .from('user_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('paper_id', paper.id)
        .select();

      if (likeError) {
        console.error('Error deleting like:', likeError);
        throw likeError;
      }
      console.log('Deleted like:', deletedLike);

      // Decrement the likes count
      const newLikes = Math.max((paper.likes || 0) - 1, 0);
      const { error: updateError, data: updatedPaper } = await supabase
        .from('papers')
        .update({ likes: newLikes })
        .eq('id', paper.id)
        .select();

      if (updateError) {
        console.error('Error updating likes count:', updateError);
        throw updateError;
      }
      console.log('Updated paper likes:', updatedPaper);

    } catch (error) {
      console.error('Error removing like:', error);
    }
  },

  isLiked: async (arxivId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Find the paper by arXiv ID
      const { data: paper, error: paperError } = await supabase
        .from('papers')
        .select('id')
        .eq('arxiv_id', arxivId)
        .single();

      if (paperError || !paper) return false;

      // Check if user has liked this paper
      const { data: like, error: likeError } = await supabase
        .from('user_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('paper_id', paper.id)
        .single();

      if (likeError) return false;
      return Boolean(like);
    } catch (error) {
      console.error('Error checking like status:', error);
      return false;
    }
  },
})); 