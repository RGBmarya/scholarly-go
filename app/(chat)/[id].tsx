import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

export default function ChatScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hello! I'm your AI assistant. Ask me anything about "${title}"`,
      sender: 'ai',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleSend = () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Simulate AI response
    // In production, this would make an API call to your AI service
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'This is a simulated AI response. In production, this would be replaced with actual AI-generated responses based on the paper content.',
        sender: 'ai',
      };
      setMessages(prev => [...prev, aiMessage]);
      // Scroll to bottom after new message
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }} 
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
        </View>
      </SafeAreaView>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={[
          styles.messagesContent,
          { paddingBottom: 100 }
        ]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(message => (
          <View 
            key={message.id} 
            style={[
              styles.messageBox,
              message.sender === 'user' ? styles.userMessage : styles.aiMessage
            ]}
          >
            <Text style={[
              styles.messageText,
              message.sender === 'user' ? styles.userMessageText : styles.aiMessageText
            ]}>
              {message.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={[
          styles.keyboardAvoid,
          { marginBottom: keyboardVisible ? 0 : 0 }
        ]}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask a question..."
            multiline={false}
            keyboardAppearance="dark"
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <IconSymbol 
              name="arrow.up.circle.fill" 
              size={32} 
              color={inputText.trim() ? '#007AFF' : '#C7C7CC'} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  safeArea: {
    backgroundColor: 'white',
    marginTop: -50,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesContent: {
    padding: 15,
    paddingBottom: 20,
  },
  messageBox: {
    maxWidth: '80%',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
  },
  userMessageText: {
    color: 'white',
  },
  aiMessageText: {
    color: '#333',
  },
  keyboardAvoid: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 40,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
    marginBottom: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
}); 