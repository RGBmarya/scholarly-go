import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/supabase';
import Auth from '../components/Auth';
import { Session } from '@supabase/supabase-js';
import 'react-native-reanimated';
import { Button, View } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [session, setSession] = useState<Session | null>(null)

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      // Clear any local storage or state if needed
      setSession(null)
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error signing out:', error.message)
      }
    }
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {session && session.user ? (
      <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ 
          headerShown: false,
          headerRight: () => (
            <Button onPress={handleSignOut} title="Sign Out" />
          )
        }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
      </>
      ) : <Auth />}
    </ThemeProvider>
  );
}
