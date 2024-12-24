import React, { useState } from 'react'
import { Alert, StyleSheet, View, Text, SafeAreaView, AppState } from 'react-native'
import { makeRedirectUri } from 'expo-auth-session'
import * as QueryParams from 'expo-auth-session/build/QueryParams'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { supabase } from '../lib/supabase/supabase'
import { Button, Input } from './ui'

WebBrowser.maybeCompleteAuthSession()
const redirectTo = makeRedirectUri()

const createSessionFromUrl = async (url: string) => {
  const { params, errorCode } = QueryParams.getQueryParams(url)

  if (errorCode) throw new Error(errorCode)
  const { access_token, refresh_token } = params

  if (!access_token) return

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  })
  if (error) throw error
  return data.session
}

AppState.addEventListener('change', (state: string) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Handle linking into app from email app
  const url = Linking.useURL()
  if (url) createSessionFromUrl(url)

  async function signInWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) Alert.alert(error.message)
    setLoading(false)
  }

  async function signUpWithEmail() {
    setLoading(true)
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (error) Alert.alert(error.message)
    if (!session) Alert.alert('Please check your inbox for email verification!')
    setLoading(false)
  }

  async function signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      })
      if (error) throw error

      const res = await WebBrowser.openAuthSessionAsync(
        data?.url ?? '',
        redirectTo
      )

      if (res.type === 'success') {
        const { url } = res
        await createSessionFromUrl(url)
      }
    } catch (error) {
      if (error instanceof Error) Alert.alert(error.message)
    }
  }

  async function sendMagicLink() {
    if (!email) {
      Alert.alert('Please enter your email first')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      Alert.alert(error.message)
    } else {
      Alert.alert('Check your email for the magic link!')
    }
    setLoading(false)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Scholarly</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.subtitle}>Sign in or create an account</Text>
        
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Input
              label="Email"
              leftIcon={{ type: 'material', name: 'email' }}
              onChangeText={(text) => setEmail(text)}
              value={email}
              placeholder="email@address.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Input
              label="Password"
              leftIcon={{ type: 'material', name: 'lock' }}
              onChangeText={(text) => setPassword(text)}
              value={password}
              secureTextEntry
              placeholder="Password"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button 
              title="Sign in" 
              disabled={loading} 
              onPress={signInWithEmail}
              style={styles.signInButton}
            />
            <Button 
              title="Sign up" 
              disabled={loading} 
              onPress={signUpWithEmail}
              style={styles.signUpButton}
            />
            <Button 
              title="Continue with Google" 
              disabled={loading} 
              onPress={signInWithGoogle}
              style={styles.googleButton}
            />
            <Button 
              title="Send Magic Link" 
              disabled={loading} 
              onPress={sendMagicLink}
              style={styles.magicLinkButton}
            />
          </View>
        </View>

        <Text style={styles.acknowledgment}>
          Thank you to arXiv for use of its open access interoperability.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  form: {
    marginTop: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 20,
    gap: 12,
  },
  signInButton: {
    backgroundColor: '#666666',
  },
  signUpButton: {
    backgroundColor: '#666666',
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  magicLinkButton: {
    backgroundColor: '#5856D6',
  },
  acknowledgment: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});