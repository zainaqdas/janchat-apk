import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useCall } from '../../contexts/CallContext'

export default function IncomingCall() {
  const { incomingCall, callPartner, callState, acceptCall, rejectCall } = useCall()

  if (callState !== 'ringing' || !callPartner) return null

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {callPartner.username?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{callPartner.username}</Text>
        <Text style={styles.status}>Incoming call…</Text>

        <View style={styles.buttons}>
          <TouchableOpacity onPress={rejectCall} style={styles.rejectBtn}>
            <Text style={styles.btnIcon}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={acceptCall} style={styles.acceptBtn}>
            <Text style={styles.btnIcon}>📞</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '85%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  name: { fontSize: 20, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  status: { fontSize: 14, color: '#9ca3af', marginBottom: 32 },
  buttons: {
    flexDirection: 'row',
    gap: 24,
  },
  rejectBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnIcon: { fontSize: 24, color: '#ffffff' },
})
