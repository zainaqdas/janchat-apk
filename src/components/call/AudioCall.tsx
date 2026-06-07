import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useCall } from '../../contexts/CallContext'

export default function AudioCall() {
  const {
    callState,
    callType,
    callPartner,
    isMuted,
    endCall,
    toggleMute,
  } = useCall()

  if (callState === 'idle' || callType !== 'audio') return null

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {callPartner?.username?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{callPartner?.username}</Text>
        <Text style={styles.status}>
          {callState === 'connecting' ? 'Connecting…' : 'Connected'}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={toggleMute}
          style={[styles.controlBtn, isMuted && styles.mutedBtn]}
        >
          <Text style={styles.controlIcon}>
            {isMuted ? '🔇' : '🎤'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={endCall} style={styles.endBtn}>
          <Text style={styles.endIcon}>📞</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: { alignItems: 'center', marginBottom: 64 },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  avatarText: { fontSize: 48, fontWeight: 'bold', color: '#ffffff' },
  name: { fontSize: 24, fontWeight: '600', color: '#ffffff', marginBottom: 8 },
  status: { fontSize: 14, color: '#9ca3af' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedBtn: { backgroundColor: '#dc2626' },
  controlIcon: { fontSize: 24 },
  endBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '135deg' }],
  },
  endIcon: { fontSize: 28, color: '#ffffff' },
})
