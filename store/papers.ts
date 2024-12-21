import { create } from 'zustand';
import { PaperData } from '../services/arxiv';

interface PapersStore {
  bookmarkedPapers: PaperData[];
  addBookmark: (paper: PaperData) => void;
  removeBookmark: (paperId: string) => void;
  isBookmarked: (paperId: string) => boolean;
}

export const usePapersStore = create<PapersStore>((set, get) => ({
  bookmarkedPapers: [],
  addBookmark: (paper: PaperData) => {
    if (!get().isBookmarked(paper.id)) {
      set(state => ({
        bookmarkedPapers: [...state.bookmarkedPapers, { ...paper, bookmarked: true }]
      }));
    }
  },
  removeBookmark: (paperId: string) => {
    set(state => ({
      bookmarkedPapers: state.bookmarkedPapers.filter(p => p.id !== paperId)
    }));
  },
  isBookmarked: (paperId: string) => {
    return get().bookmarkedPapers.some(p => p.id === paperId);
  },
})); 