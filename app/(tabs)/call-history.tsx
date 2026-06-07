import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { useAuth } from '../../src/contexts/AuthContext'
import { useChat } from '../../src/contexts/ChatContext'
import { getCallHistory } from '../../src/services/callHistory'
import { CallHistoryEntry } from '../../src/types'

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return ''
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

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

  if (isToday) return `Today ${time}`
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`
}

export default function CallHistoryScreen() {
  const { user } = useAuth()
  const { selectChat } = useChat()
  const [calls, setCalls] = useState<CallHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCalls()
  }, [])

  const loadCalls = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getCallHistory(user.id)
      setCalls(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChat = (entry: CallHistoryEntry) => {
    if (entry.otherUser) {
      selectChat(entry.otherUser)
      router.push(`/(tabs)/chat/${entry.otherUser.id}`)
    }
  }

  const getStatusIcon = (entry: CallHistoryEntry) => {
    if (entry.status === 'missed') return '❌'
    return entry.isCaller ? '✅' : '✅'
  }

  const renderItem = ({ item }: { item: CallHistoryEntry }) => (
    <TouchableOpacity
      style={styles.callItem}
      onPress={() => handleChat(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.otherUser?.username?.[0]?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.callInfo}>
        <Text style={styles.callName}>
          {item.otherUser?.username || 'Unknown'}
        </Text>
        <View style={styles.callMeta}>
          <Text style={styles.statusText}>
            {getStatusIcon(item)} {item.status === 'missed' ? 'Missed' : item.isCaller ? 'Outgoing' : 'Incoming'}
          </Text>
          {item.duration > 0 && (
            <Text style={styles.durationText}> · {formatDuration(item.duration)}</Text>
          )}
        </View>
      </View>
      <Text style={styles.timeText}>
        {formatTime(item.started_at)}
      </Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Call History</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#3b82f6" size="large" />
        </View>
      ) : calls.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No call history yet</Text>
          <Text style={styles.emptySubtitle}>Your past calls will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  header: {
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingBottom: 16 },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  callInfo: { flex: 1 },
  callName: { fontSize: 14, fontWeight: '500', color: '#ffffff' },
  callMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusText: { fontSize: 12, color: '#6b7280' },
  durationText: { fontSize: 12, color: '#6b7280' },
  timeText: { fontSize: 11, color: '#4b5563' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: '#4b5563' },
})
