import { useEffect, useCallback, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Stack, useLocalSearchParams, router } from 'expo-router'
import { useAuth } from '../../../src/contexts/AuthContext'
import { useChat } from '../../../src/contexts/ChatContext'
import { useCall } from '../../../src/contexts/CallContext'
import MessageList from '../../../src/components/chat/MessageList'
import MessageInput from '../../../src/components/chat/MessageInput'
import { supabase } from '../../../src/lib/supabase'
import { Profile } from '../../../src/types'

export default function ChatScreen() {
  const { id: contactId } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const {
    contacts,
    activeChat,
    messages,
    sendMessage,
    sendTypingIndicator,
    typingUsers,
    selectChat,
  } = useChat()
  const { startCall, callState } = useCall()

  useEffect(() => {
    if (!contactId) return

    const contact = contacts.find((c) => c.contact?.id === contactId)
    if (contact?.contact) {
      selectChat(contact.contact)
    } else {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', contactId)
        .single()
        .then(({ data }) => {
          if (data) {
            selectChat(data as Profile)
          }
        })
    }
  }, [contactId, contacts, selectChat])

  const contact = activeChat?.contact
  const isTyping = contact && typingUsers[contact.id]

  const handleSend = useCallback(
    (text: string) => {
      if (!contactId) return
      sendMessage(contactId, text)
    },
    [contactId, sendMessage]
  )

  const handleTyping = useCallback(() => {
    if (!contactId) return
    sendTypingIndicator(contactId)
  }, [contactId, sendTypingIndicator])

  const handleAudioCall = () => {
    if (contact) startCall(contact, 'audio')
  }

  const handleVideoCall = () => {
    if (contact) startCall(contact, 'video')
  }

  if (!contact) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Chat', headerShown: true }} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Loading…</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: contact.username || 'Chat',
          headerShown: true,
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '600', fontSize: 16 },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.callBtns}>
              <TouchableOpacity
                onPress={handleAudioCall}
                disabled={callState !== 'idle'}
                style={styles.callBtn}
              >
                <Text style={styles.callBtnText}>📞</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleVideoCall}
                disabled={callState !== 'idle'}
                style={styles.callBtn}
              >
                <Text style={styles.callBtnText}>📹</Text>
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* Subtitle */}
      {isTyping && (
        <View style={styles.typingBar}>
          <Text style={styles.typingText}>typing…</Text>
        </View>
      )}

      <MessageList messages={messages} typing={!!isTyping} contact={contact} />
      <MessageInput
        onSend={handleSend}
        onTyping={handleTyping}
        disabled={callState !== 'idle'}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 14 },
  backBtn: { paddingRight: 12 },
  backText: { fontSize: 22, color: '#ffffff' },
  callBtns: { flexDirection: 'row', gap: 4 },
  callBtn: { padding: 6 },
  callBtnText: { fontSize: 18 },
  typingBar: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#111827',
  },
  typingText: { fontSize: 12, color: '#60a5fa' },
})
