import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import {
  getMessages,
  sendMessage as sendMessageService,
  markAsRead,
  subscribeToMessages,
  subscribeToSentMessages,
  getUnreadCountBySender,
} from '../services/messages'
import { getAcceptedContacts } from '../services/contacts'
import { supabase } from '../lib/supabase'
import { Profile, Message, Contact } from '../types'

interface ChatContextType {
  contacts: Contact[]
  activeChat: { contact: Profile; messages: Message[] } | null
  messages: Message[]
  unreadCounts: Record<string, number>
  typingUsers: Record<string, boolean>
  selectChat: (contact: Profile) => void
  sendMessage: (receiverId: string, message: string) => Promise<void>
  sendTypingIndicator: (receiverId: string) => Promise<void>
  loadContacts: () => Promise<void>
  loadMessages: (contactId: string) => Promise<void>
  clearUnread: (senderId: string) => void
}

const ChatContext = createContext<ChatContextType | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activeChat, setActiveChat] = useState<{ contact: Profile; messages: Message[] } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const activeChatUserRef = useRef<{ contact: Profile; messages: Message[] } | null>(null)

  useEffect(() => {
    activeChatUserRef.current = activeChat
  }, [activeChat])

  const loadContacts = useCallback(async () => {
    if (!user) return
    try {
      const data = await getAcceptedContacts(user.id)
      setContacts(data || [])
      const counts = await getUnreadCountBySender(user.id)
      setUnreadCounts(counts)
    } catch (err) {
      console.error('Failed to load contacts:', err)
    }
  }, [user])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const loadMessages = useCallback(async (contactId: string) => {
    if (!user || !contactId) return
    try {
      const msgs = await getMessages(user.id, contactId)
      setMessages(msgs)
      const unreadIds = msgs
        .filter((m) => m.receiver_id === user.id && !m.read)
        .map((m) => m.id)
      if (unreadIds.length > 0) {
        await markAsRead(unreadIds)
        setUnreadCounts((prev) => ({ ...prev, [contactId]: 0 }))
      }
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }, [user])

  useEffect(() => {
    if (activeChat?.contact?.id) {
      loadMessages(activeChat.contact.id)
    }
  }, [activeChat?.contact?.id, loadMessages])

  useEffect(() => {
    if (!user) return

    const incomingSub = subscribeToMessages(user.id, (newMsg) => {
      const activeChatId = activeChatUserRef.current?.contact?.id
      if (activeChatId === newMsg.sender_id) {
        setMessages((prev) => [...prev, newMsg])
        markAsRead([newMsg.id]).catch(console.error)
      } else {
        setUnreadCounts((prev) => ({
          ...prev,
          [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1,
        }))
      }
    })

    const sentSub = subscribeToSentMessages(user.id, (newMsg) => {
      const activeChatId = activeChatUserRef.current?.contact?.id
      if (activeChatId === newMsg.receiver_id) {
        setMessages((prev) => [...prev, newMsg])
      }
    })

    const readReceiptSub = supabase
      .channel(`read-receipts-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload: any) => {
          const updated = payload.new
          if (updated.read) {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === updated.id ? { ...msg, read: true } : msg))
            )
          }
        }
      )
      .subscribe()

    return () => {
      incomingSub.unsubscribe()
      sentSub.unsubscribe()
      supabase.removeChannel(readReceiptSub)
    }
  }, [user])

  const typingChannelRef = useRef<any>(null)

  useEffect(() => {
    if (!user) return

    const channel = supabase.channel(`typing-indicators-${user.id}`)
    typingChannelRef.current = channel

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
        if (payload.senderId !== user.id) {
          setTypingUsers((prev) => ({ ...prev, [payload.senderId]: true }))
          if (typingTimeouts.current[payload.senderId]) {
            clearTimeout(typingTimeouts.current[payload.senderId])
          }
          typingTimeouts.current[payload.senderId] = setTimeout(() => {
            setTypingUsers((prev) => ({ ...prev, [payload.senderId]: false }))
          }, 3000)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      typingChannelRef.current = null
      Object.values(typingTimeouts.current).forEach(clearTimeout)
    }
  }, [user])

  const sendMessage = useCallback(async (receiverId: string, message: string) => {
    if (!user || !message.trim()) return
    try {
      await sendMessageService(user.id, receiverId, message.trim())
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }, [user])

  const sendTypingIndicator = useCallback(async (receiverId: string) => {
    if (!user || !typingChannelRef.current) return
    await typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { senderId: user.id, receiverId },
    })
  }, [user])

  const selectChat = useCallback((contact: Profile) => {
    setActiveChat({ contact, messages: [] })
  }, [])

  const clearUnread = useCallback((senderId: string) => {
    setUnreadCounts((prev) => ({ ...prev, [senderId]: 0 }))
  }, [])

  return (
    <ChatContext.Provider
      value={{
        contacts,
        activeChat,
        messages,
        unreadCounts,
        typingUsers,
        selectChat,
        sendMessage,
        sendTypingIndicator,
        loadContacts,
        loadMessages,
        clearUnread,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within a ChatProvider')
  return ctx
}
