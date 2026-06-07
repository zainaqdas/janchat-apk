import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useAuth } from '../../src/contexts/AuthContext'
import { useChat } from '../../src/contexts/ChatContext'
import { searchUsers } from '../../src/services/auth'
import { getContactRequests, acceptContactRequest, removeContact, sendContactRequest } from '../../src/services/contacts'
import { Contact, Profile } from '../../src/types'

export default function ContactsScreen() {
  const { user } = useAuth()
  const { contacts, unreadCounts, loadContacts, selectChat } = useChat()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [requests, setRequests] = useState<Contact[]>([])
  const [searching, setSearching] = useState(false)
  const [addingContact, setAddingContact] = useState<string | null>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  useEffect(() => {
    loadContacts()
    loadRequests()
  }, [])

  const loadRequests = async () => {
    if (!user) return
    try {
      const data = await getContactRequests(user.id)
      setRequests(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchUsers(query)
        setSearchResults(results.filter((u: Profile) => u.id !== user?.id))
      } catch (err) {
        console.error(err)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, user])

  const handleAddContact = async (contactId: string) => {
    if (!user) return
    setAddingContact(contactId)
    try {
      await sendContactRequest(user.id, contactId)
      setQuery('')
      setSearchResults([])
    } catch (err: any) {
      if (err?.code === '23505') {
        Alert.alert('Already Added', 'This user is already a contact or has a pending request.')
      } else {
        console.error(err)
      }
    } finally {
      setAddingContact(null)
    }
  }

  const handleAccept = async (id: string) => {
    setAcceptingId(id)
    try {
      await acceptContactRequest(id)
      loadRequests()
      loadContacts()
    } catch (err) {
      console.error(err)
    } finally {
      setAcceptingId(null)
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await removeContact(id)
      loadContacts()
    } catch (err) {
      console.error(err)
    }
  }

  const handleChat = (contact: Profile) => {
    selectChat(contact)
    router.push(`/(tabs)/chat/${contact.id}`)
  }

  const acceptedContacts = contacts.filter((c) => c.status === 'accepted' && c.contact)

  const renderContact = ({ item }: { item: Contact }) => {
    const contactId = item.contact?.id
    const unread = contactId ? unreadCounts[contactId] || 0 : 0

    return (
      <View style={styles.contactItem}>
        <TouchableOpacity style={styles.contactContent} onPress={() => handleChat(item.contact!)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.contact?.username?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.contactInfo}>
            <View style={styles.contactNameRow}>
              <Text style={styles.contactName} numberOfLines={1}>
                {item.contact?.username || 'Unknown'}
              </Text>
              {unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              )}
            </View>
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleRemove(item.id)}
          style={styles.removeButton}
        >
          <Text style={styles.removeIcon}>🗑</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contacts</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search users by username…"
          placeholderTextColor="#6b7280"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && (
          <ActivityIndicator style={styles.searchSpinner} color="#3b82f6" size="small" />
        )}
        {searchResults.length > 0 && (
          <View style={styles.searchDropdown}>
            {searchResults.map((u) => (
              <View key={u.id} style={styles.searchResult}>
                <View style={styles.searchResultLeft}>
                  <View style={styles.searchAvatar}>
                    <Text style={styles.avatarText}>
                      {u.username?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <Text style={styles.searchName}>{u.username}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleAddContact(u.id)}
                  disabled={addingContact === u.id}
                  style={styles.addButton}
                >
                  <Text style={styles.addButtonText}>
                    {addingContact === u.id ? '…' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {requests.length > 0 && (
        <View style={styles.requestsSection}>
          <Text style={styles.sectionTitle}>
            Contact Requests ({requests.length})
          </Text>
          {requests.map((r) => (
            <View key={r.id} style={styles.requestItem}>
              <View style={styles.requestLeft}>
                <View style={[styles.avatar, { backgroundColor: '#7c3aed' }]}>
                  <Text style={styles.avatarText}>
                    {r.user?.username?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
                <Text style={styles.contactName}>{r.user?.username}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleAccept(r.id)}
                disabled={acceptingId === r.id}
                style={styles.acceptButton}
              >
                <Text style={styles.acceptButtonText}>
                  {acceptingId === r.id ? '…' : 'Accept'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {acceptedContacts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No contacts yet</Text>
          <Text style={styles.emptySubtitle}>
            Search for users above to send contact requests
          </Text>
        </View>
      ) : (
        <FlatList
          data={acceptedContacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContact}
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
  searchContainer: {
    position: 'relative',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    zIndex: 100,
  },
  searchInput: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#ffffff',
  },
  searchSpinner: {
    position: 'absolute',
    right: 24,
    top: 24,
  },
  searchDropdown: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 52,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 200,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchResultLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchName: { fontSize: 14, color: '#ffffff' },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addButtonText: { fontSize: 12, fontWeight: '600', color: '#ffffff' },
  requestsSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  requestLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  acceptButton: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  acceptButtonText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contactContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  contactInfo: { flex: 1 },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactName: { fontSize: 14, fontWeight: '500', color: '#ffffff' },
  unreadBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  onlineText: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  removeButton: { padding: 8 },
  removeIcon: { fontSize: 16 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: '#4b5563' },
  list: { paddingBottom: 16 },
})
