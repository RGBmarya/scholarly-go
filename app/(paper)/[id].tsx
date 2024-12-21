import { View, Text, StyleSheet, ScrollView, Animated as RNAnimated } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { SharedTransition, withSpring } from 'react-native-reanimated';

export default function PaperScreen() {
  const { id, title, abstract, authors, year } = useLocalSearchParams<{
    id: string;
    title: string;
    abstract: string;
    authors: string;
    year: string;
  }>();

  const animatedValue = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.spring(animatedValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <RNAnimated.View
          style={[
            styles.content,
            {
              opacity: animatedValue,
              transform: [
                {
                  scale: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.authors}>
            {authors ? JSON.parse(authors).join(', ') : ''} • {year}
          </Text>
          <Text style={styles.abstract}>{abstract}</Text>
          
          {/* Placeholder for full paper content */}
          <Text style={styles.paperContent}>
            This is where the full paper content would be displayed. You can integrate
            with your paper content API to show the complete paper, including:
            {'\n\n'}
            • Introduction
            {'\n'}
            • Methods
            {'\n'}
            • Results
            {'\n'}
            • Discussion
            {'\n'}
            • References
          </Text>
        </RNAnimated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  authors: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  abstract: {
    fontSize: 18,
    lineHeight: 24,
    color: '#444',
    marginBottom: 30,
  },
  paperContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
}); 