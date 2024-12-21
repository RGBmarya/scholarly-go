import { View, Dimensions, StyleSheet, ViewToken, Text, TouchableOpacity, ActivityIndicator, Linking, TextInput, ScrollView, SafeAreaView } from 'react-native';
import { useCallback, useState, useRef, useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { router, useNavigation } from 'expo-router';
import { searchArxiv, transformArxivToPaperData, PaperData } from '../../services/arxiv';
import * as Haptics from 'expo-haptics';
import { usePapersStore } from '../../store/papers';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;
const VERTICAL_SWIPE_THRESHOLD = 50;
const PAPERS_PER_PAGE = 10;
const BOTTOM_TAB_HEIGHT = 49;

const CATEGORIES = [
  { id: 'cs.AI', label: 'AI' },
  { id: 'cs.LG', label: 'Machine Learning' },
  { id: 'cs.CL', label: 'Computation & Language' },
  { id: 'cs.CV', label: 'Computer Vision' },
  { id: 'cs.RO', label: 'Robotics' },
  { id: 'cs.NE', label: 'Neural Networks' },
];

const SCREEN_PADDING = {
  TOP: 60,
  BOTTOM: 49,
};

const VERTICAL_OFFSET = -80;
const AVAILABLE_HEIGHT = SCREEN_HEIGHT - SCREEN_PADDING.TOP - SCREEN_PADDING.BOTTOM;
const CARD_HEIGHT = AVAILABLE_HEIGHT * 0.7;
const VERTICAL_PADDING = (AVAILABLE_HEIGHT - CARD_HEIGHT) / 2;
const DEFAULT_TOPICS = ['artificial intelligence', 'machine learning', 'deep learning'];

function FilterBar({ 
  selectedCategories,
  onToggleCategory,
  searchQuery,
  onSearchChange,
}: {
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}) {
  return (
    <SafeAreaView style={styles.filterContainer}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search papers..."
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholderTextColor="#999"
        />
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {CATEGORIES.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategories.includes(category.id) && styles.categoryChipSelected
            ]}
            onPress={() => onToggleCategory(category.id)}
          >
            <Text style={[
              styles.categoryLabel,
              selectedCategories.includes(category.id) && styles.categoryLabelSelected
            ]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function PaperCard({ 
  paper, 
  onLike, 
  onSwipeLeft, 
  onSwipeRight,
  isVisible,
  isFocused,
  onVerticalSwipe
}: { 
  paper: PaperData; 
  onLike: (id: string) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isVisible: boolean;
  isFocused: boolean;
  onVerticalSwipe: (direction: 'up' | 'down') => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isLocked = useSharedValue(false);
  const lastTap = useRef(0);

  useEffect(() => {
    if (isVisible || isFocused) {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      isLocked.value = false;
    }
  }, [isVisible, isFocused]);

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLike(paper.id);
    }
    lastTap.current = now;
  };

  const gesture = Gesture.Pan()
    .onBegin(() => {
      if (isLocked.value) return;
    })
    .onUpdate((event) => {
      if (isLocked.value) return;
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (isLocked.value) return;

      const isVerticalSwipe = Math.abs(event.translationY) > Math.abs(event.translationX);

      if (isVerticalSwipe) {
        if (event.translationY < -VERTICAL_SWIPE_THRESHOLD) {
          runOnJS(onVerticalSwipe)('up');
        } else if (event.translationY > VERTICAL_SWIPE_THRESHOLD) {
          runOnJS(onVerticalSwipe)('down');
        }
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      } else {
        if (event.translationX > SWIPE_THRESHOLD) {
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
          runOnJS(onSwipeRight)();
        } else if (event.translationX < -SWIPE_THRESHOLD) {
          translateX.value = withSpring(-SCREEN_WIDTH);
          isLocked.value = true;
          runOnJS(onSwipeLeft)();
        } else {
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
        }
      }
    });

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      runOnJS(handleDoubleTap)();
    });

  const composedGesture = Gesture.Simultaneous(gesture, tapGesture);

  const rStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotate: `${interpolate(
          translateX.value,
          [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
          [-10, 0, 10]
        )}deg`,
      },
    ],
  }));

  const rBookmarkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1]
    ),
  }));

  const rChatStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0]
    ),
  }));

  const formatAuthors = (authors: string[]) => {
    if (authors.length <= 2) return authors.join(', ');
    return `${authors[0]} et al.`;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  return (
    <View style={styles.paperContainer}>
      {paper.bookmarked && (
        <View style={styles.cornerBookmark}>
          <Text style={styles.cornerBookmarkText}>🔖</Text>
        </View>
      )}
      <Animated.View style={[styles.swipeIndicator, styles.bookmarkIndicator, rBookmarkStyle]}>
        <Text style={styles.swipeIndicatorText}>🔖</Text>
      </Animated.View>
      <Animated.View style={[styles.swipeIndicator, styles.chatIndicator, rChatStyle]}>
        <Text style={styles.swipeIndicatorText}>Chat</Text>
      </Animated.View>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.paperContent, rStyle]}>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {truncateText(paper.title, 100)}
            </Text>
            <Text style={styles.authors} numberOfLines={1}>
              {formatAuthors(paper.authors)} • {paper.year}
            </Text>
          </View>
          <Text style={styles.abstract} numberOfLines={12}>
            {truncateText(paper.abstract, 800)}
          </Text>
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[
                styles.likeButton,
                paper.isLikedByUser && styles.likeButtonActive
              ]} 
              onPress={() => onLike(paper.id)}
            >
              <Text style={[
                styles.likeText,
                paper.isLikedByUser && styles.likeTextActive
              ]}>♥ {paper.likes}</Text>
            </TouchableOpacity>
            <View style={styles.footerRight}>
              {paper.bookmarked && (
                <Text style={styles.bookmarkIndicatorText}>🔖</Text>
              )}
              <TouchableOpacity 
                style={styles.readButton}
                onPress={() => paper.links.html && Linking.openURL(paper.links.html)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.readButtonText}>Read</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function ExploreScreen() {
  const [papers, setPapers] = useState<PaperData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleItems, setVisibleItems] = useState<string[]>([]);
  const [focusedPaperId, setFocusedPaperId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startIndex, setStartIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const navigation = useNavigation();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const { addBookmark, removeBookmark, isBookmarked } = usePapersStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPapers([]);
    setStartIndex(0);
    setHasMore(true);
    loadInitialPapers();
  }, [selectedCategories, debouncedSearchQuery]);

  const buildSearchQuery = useCallback(() => {
    const hasSearch = Boolean(debouncedSearchQuery);
    const hasFilters = selectedCategories.length > 0;

    if (hasSearch && !hasFilters) {
      return debouncedSearchQuery;
    }

    if (hasSearch && hasFilters) {
      const filterTerms = selectedCategories.map(cat => {
        switch(cat) {
          case 'cs.AI': return 'artificial intelligence';
          case 'cs.LG': return 'machine learning';
          case 'cs.CL': return 'natural language processing';
          case 'cs.CV': return 'computer vision';
          case 'cs.RO': return 'robotics';
          case 'cs.NE': return 'neural networks';
          default: return '';
        }
      }).filter(Boolean);

      return `(${debouncedSearchQuery}) AND (${filterTerms.join(' OR ')})`;
    }

    if (!hasSearch && hasFilters) {
      return selectedCategories.map(cat => {
        switch(cat) {
          case 'cs.AI': return 'artificial intelligence';
          case 'cs.LG': return 'machine learning';
          case 'cs.CL': return 'natural language processing';
          case 'cs.CV': return 'computer vision';
          case 'cs.RO': return 'robotics';
          case 'cs.NE': return 'neural networks';
          default: return '';
        }
      })
      .filter(Boolean)
      .join(' OR ');
    }

    return DEFAULT_TOPICS.join(' OR ');
  }, [selectedCategories, debouncedSearchQuery]);

  const loadInitialPapers = async () => {
    try {
      setIsLoading(true);
      const query = buildSearchQuery();
      const arxivPapers = await searchArxiv(query, 0, PAPERS_PER_PAGE);
      const transformedPapers = arxivPapers.map(transformArxivToPaperData);
      setPapers(transformedPapers);
      setStartIndex(PAPERS_PER_PAGE);
      setHasMore(arxivPapers.length === PAPERS_PER_PAGE);
    } catch (error) {
      console.error('Error loading papers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMorePapers = useCallback(async () => {
    if (!hasMore || isLoading) return;

    try {
      setIsLoading(true);
      const query = buildSearchQuery();
      const arxivPapers = await searchArxiv(query, startIndex, PAPERS_PER_PAGE);
      const transformedPapers = arxivPapers.map(transformArxivToPaperData);
      
      setPapers(prev => [...prev, ...transformedPapers]);
      setStartIndex(prev => prev + PAPERS_PER_PAGE);
      setHasMore(arxivPapers.length === PAPERS_PER_PAGE);
    } catch (error) {
      console.error('Error loading more papers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [startIndex, hasMore, isLoading, selectedCategories, searchQuery]);

  const handleToggleCategory = useCallback((categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (focusedPaperId) {
        setFocusedPaperId(null);
      }
    });
    return unsubscribe;
  }, [focusedPaperId, navigation]);

  const handleLike = useCallback((id: string) => {
    setPapers(prevPapers => 
      prevPapers.map(paper => 
        paper.id === id 
          ? { 
              ...paper, 
              likes: paper.isLikedByUser ? paper.likes - 1 : paper.likes + 1,
              isLikedByUser: !paper.isLikedByUser
            }
          : paper
      )
    );
  }, []);

  const handleSwipeLeft = useCallback((paper: PaperData) => {
    setFocusedPaperId(paper.id);
    router.push(`/(chat)/${paper.id}?title=${encodeURIComponent(paper.title)}`);
  }, []);

  const handleSwipeRight = useCallback((paper: PaperData) => {
    if (isBookmarked(paper.id)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      removeBookmark(paper.id);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addBookmark(paper);
    }
    setPapers(prevPapers =>
      prevPapers.map(p =>
        p.id === paper.id
          ? { ...p, bookmarked: !p.bookmarked }
          : p
      )
    );
  }, [addBookmark, removeBookmark, isBookmarked]);

  const onViewableItemsChanged = useCallback(({ changed }: { 
    changed: ViewToken[] 
  }) => {
    const newVisibleItems = changed
      .filter(token => token.isViewable)
      .map(token => token.item.id);
    
    if (changed.some(token => token.isViewable)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setVisibleItems(prev => {
      const updated = [...prev];
      changed.forEach(token => {
        if (token.isViewable) {
          if (!updated.includes(token.item.id)) {
            updated.push(token.item.id);
          }
        } else {
          const index = updated.indexOf(token.item.id);
          if (index !== -1) {
            updated.splice(index, 1);
          }
        }
      });
      return updated;
    });

    const item = changed[0];
    if (item?.isViewable && item.index !== null) {
      setCurrentIndex(item.index);
      if (item.index === papers.length - 2) {
        loadMorePapers();
      }
    }
  }, [papers.length, loadMorePapers]);

  const handleVerticalSwipe = useCallback((direction: 'up' | 'down') => {
    if (direction === 'up' && currentIndex < papers.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true
      });
    } else if (direction === 'down' && currentIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true
      });
    }
  }, [currentIndex, papers.length]);

  const flatListRef = useRef<Animated.FlatList<PaperData>>(null);

  if (isLoading && papers.length === 0) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.filterBar}>
        <FilterBar
          selectedCategories={selectedCategories}
          onToggleCategory={handleToggleCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </View>
      <Animated.FlatList
        ref={flatListRef}
        data={papers}
        renderItem={({ item }) => (
          <PaperCard 
            paper={item} 
            onLike={handleLike}
            onSwipeLeft={() => handleSwipeLeft(item)}
            onSwipeRight={() => handleSwipeRight(item)}
            onVerticalSwipe={handleVerticalSwipe}
            isVisible={visibleItems.includes(item.id)}
            isFocused={focusedPaperId === item.id}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
        keyExtractor={(item) => item.id}
        ListFooterComponent={
          hasMore ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        snapToInterval={AVAILABLE_HEIGHT}
        decelerationRate="fast"
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterBar: {
    backgroundColor: 'white',
    paddingTop: SCREEN_PADDING.TOP - 45,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listContent: {
    flexGrow: 1,
  },
  paperContainer: {
    height: AVAILABLE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: VERTICAL_PADDING,
    paddingBottom: VERTICAL_PADDING,
    paddingHorizontal: 20,
    transform: [{ translateY: VERTICAL_OFFSET }],
  },
  paperContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    height: CARD_HEIGHT,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cornerBookmark: {
    position: 'absolute',
    top: VERTICAL_PADDING + VERTICAL_OFFSET,
    right: 25,
    zIndex: 2,
    transform: [{ translateY: -10 }],
  },
  cornerBookmarkText: {
    fontSize: 24,
    transform: [{ rotate: '0deg' }],
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    lineHeight: 24,
  },
  authors: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  abstract: {
    fontSize: 16,
    lineHeight: 22,
    color: '#444',
    marginBottom: 20,
    flex: 1,
  },
  titleContainer: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  likeButton: {
    padding: 8,
    borderRadius: 20,
  },
  likeButtonActive: {
    backgroundColor: '#ffebee',
  },
  likeText: {
    fontSize: 20,
    color: '#ff4d4d',
  },
  likeTextActive: {
    color: '#f44336',
  },
  readButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  readButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  swipeIndicator: {
    position: 'absolute',
    top: '50%',
    padding: 20,
    borderRadius: 10,
    zIndex: 1,
    transform: [{ translateY: VERTICAL_OFFSET }],
  },
  bookmarkIndicator: {
    right: 40,
    backgroundColor: '#4CAF50',
  },
  chatIndicator: {
    left: 40,
    backgroundColor: '#2196F3',
  },
  swipeIndicatorText: {
    color: 'white',
    fontSize: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchContainer: {
    marginHorizontal: 15,
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 10,
    fontSize: 16,
    color: '#333',
  },
  categoriesContainer: {
    paddingVertical: 5,
    paddingHorizontal: 15,
  },
  categoryChip: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  categoryChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryLabel: {
    fontSize: 14,
    color: '#666',
  },
  categoryLabelSelected: {
    color: 'white',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookmarkIndicatorText: {
    fontSize: 18,
  },
});
