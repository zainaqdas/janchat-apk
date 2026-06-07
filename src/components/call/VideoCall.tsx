import { useRef, useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { RTCView } from 'react-native-webrtc'
import { useCall } from '../../contexts/CallContext'

const HIDE_DELAY = 3000

export default function VideoCall() {
  const {
    callState,
    callType,
    callPartner,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  } = useCall()

  const [show, setShow] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reveal = () => {
    setShow(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setShow(false), HIDE_DELAY)
  }

  useEffect(() => {
    reveal()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (callState === 'idle' || callType !== 'video') return null

  return (
    <View style={styles.container} onTouchStart={reveal}>
      {/* Remote video */}
      <View style={styles.remoteContainer}>
        {remoteStream ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="contain"
          />
        ) : (
          <View style={styles.remotePlaceholder}>
            <View style={styles.placeholderAvatar}>
              <Text style={styles.placeholderAvatarText}>
                {callPartner?.username?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
            <Text style={styles.connectingText}>Connecting…</Text>
          </View>
        )}
      </View>

      {/* Local video (PiP) */}
      {localStream && (
        <View style={[styles.localContainer, isVideoOff && styles.hidden]}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror={true}
          />
        </View>
      )}

      {/* Controls */}
      <View
        style={[
          styles.controlsBar,
          show ? styles.controlsVisible : styles.controlsHidden,
        ]}
      >
        <TouchableOpacity
          onPress={toggleMute}
          style={[styles.ctrlBtn, isMuted && styles.ctrlBtnActive]}
        >
          <Text style={styles.ctrlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleVideo}
          style={[styles.ctrlBtn, isVideoOff && styles.ctrlBtnActive]}
        >
          <Text style={styles.ctrlIcon}>{isVideoOff ? '📷' : '📹'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleScreenShare}
          style={[styles.ctrlBtn, isScreenSharing && styles.ctrlBtnScreen]}
        >
          <Text style={styles.ctrlIcon}>🖥</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={endCall} style={styles.endCallBtn}>
          <Text style={styles.endCallIcon}>📞</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
    zIndex: 1000,
  },
  remoteContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  remoteVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  remotePlaceholder: { alignItems: 'center' },
  placeholderAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  placeholderAvatarText: { fontSize: 36, fontWeight: 'bold', color: '#ffffff' },
  connectingText: { color: '#9ca3af', fontSize: 14 },
  localContainer: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 120,
    height: 180,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4b5563',
    overflow: 'hidden',
    backgroundColor: '#1f2937',
  },
  hidden: { opacity: 0 },
  localVideo: { flex: 1, width: '100%', height: '100%' },
  controlsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlsVisible: { opacity: 1 },
  controlsHidden: { opacity: 0 },
  ctrlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBtnActive: { backgroundColor: '#dc2626' },
  ctrlBtnScreen: { backgroundColor: '#2563eb' },
  ctrlIcon: { fontSize: 20 },
  endCallBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '135deg' }],
  },
  endCallIcon: { fontSize: 24, color: '#ffffff' },
})
