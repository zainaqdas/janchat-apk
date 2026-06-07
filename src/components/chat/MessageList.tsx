import { useEffect, useRef, useMemo } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { Message, Profile } from '../../types'

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const time = `${hours}:${minutes}`

  if (isToday) return time
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`
}

interface Props {
  messages: Message[]
  typing: boolean
  contact: Profile
}

export default function MessageList({ messages, typing, contact }: Props) {
  const { user } = useAuth()
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages])

  const lastReadIndex = useMemo(() => {
    if (!messages || !contact) return -1
    let lastIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.sender_id === user?.id && msg.read) {
        lastIdx = i
        break
      }
    }
    return lastIdx
  }, [messages, user, contact])

  const renderItem = ({ item: msg, index }: { item: Message; index: number }) => {
    const isMine = msg.sender_id === user?.id

    return (
      <View>
        <View style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}>
          <View
            style={[
              styles.bubble,
              isMine ? styles.bubbleMine : styles.bubbleOther,
            ]}
          >
            <Text style={styles.messageText}>{msg.message}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.timeText}>{formatTime(msg.created_at)}</Text>
              {isMine && (
                <View
                  style={[
                    styles.dot,
                    msg.read ? styles.dotRead : styles.dotUnread,
                  ]}
                />
              )}
            </View>
          </View>
        </View>
        {isMine && lastReadIndex === index && contact && (
          <View style={styles.seenRow}>
            <Text style={styles.seenLabel}>Seen</Text>
            <View style={styles.seenAvatar}>
              <Text style={styles.seenAvatarText}>
                {contact.username?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          </View>
        )}
      </View>
    )
  }

  if (!messages || messages.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
      </View>
    )
  }

  const data = [...messages]
  if (typing) {
    data.push({ id: 'typing', sender_id: '', receiver_id: '', message: '', created_at: '', read: false } as any)
  }

  return (
    <FlatList
      ref={flatListRef}
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={(item) =>
        item.item.id === 'typing' ? (
          <View style={[styles.row, styles.rowOther]}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingDots}>...</Text>
            </View>
          </View>
        ) : (
          renderItem(item)
        )
      }
      contentContainerStyle={styles.list}
      onContentSizeChange={() =>
        flatListRef.current?.scrollToEnd({ animated: true })
      }
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bubbleMine: {
    backgroundColor: '#374151',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#111827',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#f3f4f6',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    fontSize: 10,
    color: '#9ca3af',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotRead: { backgroundColor: '#60a5fa' },
  dotUnread: { backgroundColor: '#9ca3af' },
  seenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginBottom: 4,
    paddingRight: 4,
  },
  seenLabel: { fontSize: 10, color: '#6b7280' },
  seenAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seenAvatarText: { fontSize: 8, fontWeight: '600', color: '#ffffff' },
  typingBubble: {
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  typingDots: {
    fontSize: 18,
    color: '#9ca3af',
    letterSpacing: 2,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: '#6b7280' },
})
