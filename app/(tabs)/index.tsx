import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Linking, RefreshControl } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePapersStore } from '../../store/papers';
import type { Paper } from '../../store/papers';

function TrendingPaperCard({ paper }: { paper: Paper }) {
  return (
    <TouchableOpacity 
      style={styles.paperCard}
      onPress={() => paper.links.html && Linking.openURL(paper.links.html)}
    >
      <Text style={styles.paperTitle} numberOfLines={2}>
        {paper.title}
      </Text>
      <Text style={styles.paperAuthors} numberOfLines={1}>
        {paper.authors.length > 2 
          ? `${paper.authors[0]} et al.` 
          : paper.authors.join(', ')} • {paper.year}
      </Text>
      <View style={styles.paperStats}>
        <Text style={styles.likesText}>♥ {paper.likes || 0}</Text>
      </View>
    </TouchableOpacity>
  );
}

function TrendingSection({ title, papers }: { title: string; papers: Paper[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {papers.map((paper) => (
          <TrendingPaperCard key={paper.id} paper={paper} />
        ))}
      </ScrollView>
    </View>
  );
}

export default function IndexScreen() {
  const [trendingPapers, setTrendingPapers] = useState<{
    weeklyHot: Paper[];
    allTimePopular: Paper[];
  }>({ weeklyHot: [], allTimePopular: [] });
  const [refreshing, setRefreshing] = useState(false);

  const loadTrendingPapers = async () => {
    const papers = await usePapersStore.getState().fetchTrendingPapers();
    setTrendingPapers(papers);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTrendingPapers();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadTrendingPapers();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trending</Text>
        </View>
        
        <TrendingSection 
          title="Hot This Week" 
          papers={trendingPapers.weeklyHot} 
        />
        
        <TrendingSection 
          title="Most Popular" 
          papers={trendingPapers.allTimePopular} 
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 20,
    marginBottom: 15,
  },
  scrollContent: {
    paddingHorizontal: 15,
  },
  paperCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 5,
    width: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  paperTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  paperAuthors: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  paperStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  likesText: {
    fontSize: 16,
    color: '#ff4d4d',
  },
});
