import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useAuth } from '../../src/contexts/AuthContext'
import { signOut, updateProfile } from '../../src/services/auth'

export default function SettingsScreen() {
  const { user, profile, refreshProfile } = useAuth()
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '')
      setAvatarUrl(profile.avatar_url || '')
    }
  }, [profile])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setMessage('')
    try {
      await updateProfile(user.id, { username, avatar_url: avatarUrl || null })
      await refreshProfile()
      setMessage('Profile updated!')
    } catch (err: any) {
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut()
            router.replace('/(auth)/login')
          } catch (err) {
            console.error(err)
          }
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarBig}>
            <Text style={styles.avatarBigText}>
              {profile?.username?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          {message ? (
            <View
              style={[
                styles.messageBox,
                message === 'Profile updated!'
                  ? styles.successBox
                  : styles.errorBox,
              ]}
            >
              <Text
                style={
                  message === 'Profile updated!'
                    ? styles.successText
                    : styles.errorText
                }
              >
                {message}
              </Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={user?.email || ''}
              editable={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Avatar URL (optional)</Text>
            <TextInput
              style={styles.input}
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="https://example.com/avatar.jpg"
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save changes</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
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
  scroll: { padding: 16 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarBig: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBigText: { fontSize: 36, fontWeight: 'bold', color: '#ffffff' },
  form: { gap: 16, maxWidth: 400, width: '100%', alignSelf: 'center' },
  messageBox: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  successBox: { backgroundColor: 'rgba(34, 197, 94, 0.1)' },
  errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  successText: { color: '#4ade80', fontSize: 14 },
  errorText: { color: '#f87171', fontSize: 14 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: '#d1d5db' },
  input: {
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#ffffff',
  },
  inputDisabled: { color: '#6b7280' },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    marginVertical: 24,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#7f1d1d',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  logoutText: { color: '#f87171', fontSize: 15, fontWeight: '600' },
})
