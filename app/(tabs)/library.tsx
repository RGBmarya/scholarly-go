import { View, StyleSheet, FlatList, Text, TouchableOpacity, Linking } from 'react-native';
import { useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { usePapersStore } from '../../store/papers';

export default function LibraryScreen() {
  const { bookmarkedPapers, removeBookmark } = usePapersStore();

  const handleUnbookmark = useCallback((paperId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeBookmark(paperId);
  }, [removeBookmark]);

  const renderPaper = useCallback(({ item: paper }) => (
    <View style={styles.paperCard}>
      <View style={styles.paperContent}>
        <Text style={styles.title} numberOfLines={2}>{paper.title}</Text>
        <Text style={styles.authors} numberOfLines={1}>
          {paper.authors.length > 2 
            ? `${paper.authors[0]} et al.` 
            : paper.authors.join(', ')} • {paper.year}
        </Text>
        <Text style={styles.abstract} numberOfLines={3}>{paper.abstract}</Text>
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.unbookmarkButton} 
            onPress={() => handleUnbookmark(paper.id)}
          >
            <Text style={styles.unbookmarkText}>Remove</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.readButton}
            onPress={() => paper.links.html && Linking.openURL(paper.links.html)}
          >
            <Text style={styles.readButtonText}>Read</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ), [handleUnbookmark]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Library</Text>
      </View>
      {bookmarkedPapers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No bookmarked papers yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Swipe right on papers in the feed to bookmark them
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarkedPapers}
          renderItem={renderPaper}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  list: {
    padding: 15,
  },
  paperCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  paperContent: {
    padding: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  authors: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  abstract: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  unbookmarkButton: {
    padding: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ff4d4d',
  },
  unbookmarkText: {
    color: '#ff4d4d',
    fontSize: 14,
  },
  readButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  readButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
}); 