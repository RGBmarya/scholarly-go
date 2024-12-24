import { create } from 'zustand';
import { supabase } from '@/lib/supabase/supabase';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface Paper {
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
  isBookmarked: (arxivId: string) => Promise<{ isBookmarked: boolean; paperId?: string }>;
  addLike: (paper: Paper) => Promise<void>;
  removeLike: (arxivId: string) => Promise<void>;
  isLiked: (arxivId: string) => Promise<boolean>;
  fetchTrendingPapers: () => Promise<{ weeklyHot: Paper[]; allTimePopular: Paper[] }>;
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

      // First, check if the paper already exists
      const { data: existingPapers, error: findError } = await supabase
        .from('papers')
        .select('id, bookmarks')
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
            bookmarks: 1,  // Start with 1 bookmark
            likes: 0,
          });

        if (paperError) {
          console.error('Error creating paper:', paperError);
          throw paperError;
        }
        paperId = newPaperId;
        console.log('Created new paper with ID:', paperId);
      } else {
        // Paper exists, increment its bookmarks
        paperId = existingPapers[0].id;
        const { error: updateError } = await supabase
          .from('papers')
          .update({ bookmarks: (existingPapers[0].bookmarks || 0) + 1 })
          .eq('id', paperId);

        if (updateError) {
          console.error('Error updating paper bookmarks:', updateError);
          throw updateError;
        }
        console.log('Updated existing paper bookmarks:', existingPapers[0].id);
      }

      // Create the bookmark entry
      const { error: bookmarkError } = await supabase
        .from('user_bookmarks')
        .insert({
          user_id: user.id,
          paper_id: paperId,
        });

      if (bookmarkError) {
        console.error('Error creating bookmark:', bookmarkError);
        throw bookmarkError;
      }
      console.log('Created bookmark for paper:', paperId);

      // Refresh bookmarked papers
      await get().fetchBookmarkedPapers();
    } catch (error) {
      console.error('Error adding bookmark:', error);
    }
  },

  removeBookmark: async (arxivId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found when trying to remove bookmark');
        return;
      }

      console.log(`Attempting to remove bookmark for paper with arXiv ID: ${arxivId}`);

      // Find the paper by arXiv ID
      const { data: papers, error: paperError } = await supabase
        .from('papers')
        .select('id, bookmarks')
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

      // Delete the bookmark
      const { error: bookmarkError } = await supabase
        .from('user_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('paper_id', paper.id);

      if (bookmarkError) {
        console.error('Error deleting bookmark:', bookmarkError);
        throw bookmarkError;
      }

      // Decrement the bookmarks count
      const newBookmarks = Math.max((paper.bookmarks || 0) - 1, 0);
      const { error: updateError } = await supabase
        .from('papers')
        .update({ bookmarks: newBookmarks })
        .eq('id', paper.id);

      if (updateError) {
        console.error('Error updating bookmarks count:', updateError);
        throw updateError;
      }

      // Update local state
      set(state => ({
        bookmarkedPapers: state.bookmarkedPapers.filter(p => p.arxiv_id !== arxivId)
      }));

      console.log('Successfully removed bookmark');
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  },

  isBookmarked: async (arxivId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isBookmarked: false };

      // Find the paper by arXiv ID
      const { data: paper, error: paperError } = await supabase
        .from('papers')
        .select('id')
        .eq('arxiv_id', arxivId)
        .single();

      if (paperError || !paper) return { isBookmarked: false };

      // Check if user has bookmarked this paper
      const { data: bookmark, error: bookmarkError } = await supabase
        .from('user_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('paper_id', paper.id)
        .single();

      return {
        isBookmarked: Boolean(bookmark),
        paperId: paper.id
      };
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      return { isBookmarked: false };
    }
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

  fetchTrendingPapers: async () => {
    try {
      // Fetch papers liked in the past week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data: weeklyHot, error: weeklyError } = await supabase
        .from('papers')
        .select('*')
        .gte('likes', 1)
        .gte('created_at', oneWeekAgo.toISOString())
        .order('likes', { ascending: false })
        .limit(10);

      if (weeklyError) throw weeklyError;

      // Fetch all-time most liked papers
      const { data: allTimePopular, error: allTimeError } = await supabase
        .from('papers')
        .select('*')
        .gte('likes', 1)
        .order('likes', { ascending: false })
        .limit(10);

      if (allTimeError) throw allTimeError;

      return {
        weeklyHot: weeklyHot?.map(paper => ({
          id: paper.id,
          title: paper.title,
          abstract: paper.abstract,
          authors: paper.authors,
          year: paper.year,
          arxiv_id: paper.arxiv_id,
          categories: paper.categories,
          likes: paper.likes,
          bookmarks: paper.bookmarks,
          links: {
            pdf: paper.pdf_url,
            html: paper.html_url,
          },
          doi: paper.doi,
        })) || [],
        allTimePopular: allTimePopular?.map(paper => ({
          id: paper.id,
          title: paper.title,
          abstract: paper.abstract,
          authors: paper.authors,
          year: paper.year,
          arxiv_id: paper.arxiv_id,
          categories: paper.categories,
          likes: paper.likes,
          bookmarks: paper.bookmarks,
          links: {
            pdf: paper.pdf_url,
            html: paper.html_url,
          },
          doi: paper.doi,
        })) || [],
      };
    } catch (error) {
      console.error('Error fetching trending papers:', error);
      return { weeklyHot: [], allTimePopular: [] };
    }
  },
})); 