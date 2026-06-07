import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import {
  subscribeToCall,
  unsubscribeFromCall,
  persistSignal,
  subscribeToIncomingCalls,
} from '../services/callSignaling'
import { supabase } from '../lib/supabase'
import { recordCall, updateCallStatus } from '../services/callHistory'
import { Profile, CallState, CallType } from '../types'

// @ts-ignore - react-native-webrtc types may be incomplete
import { mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, MediaStream } from 'react-native-webrtc'

interface CallContextType {
  callState: CallState
  callType: CallType
  callPartner: Profile | null
  localStream: any
  remoteStream: any
  isMuted: boolean
  isVideoOff: boolean
  isScreenSharing: boolean
  incomingCall: any
  startCall: (contact: Profile, type: 'audio' | 'video') => Promise<void>
  acceptCall: () => Promise<void>
  rejectCall: () => Promise<void>
  endCall: () => Promise<void>
  toggleMute: () => void
  toggleVideo: () => void
  toggleScreenShare: () => void
  cleanupCall: () => void
}

const CallContext = createContext<CallContextType | null>(null)

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

function generateUUID(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 10) +
    Math.random().toString(36).substring(2, 10)
  )
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [callState, setCallState] = useState<CallState>('idle')
  const [callType, setCallType] = useState<CallType>(null)
  const [remoteStream, setRemoteStream] = useState<any>(null)
  const [localStream, setLocalStream] = useState<any>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [callPartner, setCallPartner] = useState<Profile | null>(null)
  const [incomingCall, setIncomingCall] = useState<any>(null)

  const pcRef = useRef<any>(null)
  const localStreamRef = useRef<any>(null)
  const callChannelRef = useRef<any>(null)
  const currentCallIdRef = useRef<string | null>(null)
  const screenStreamRef = useRef<any>(null)
  const pendingCandidatesRef = useRef<any[]>([])
  const callStartTimeRef = useRef<number | null>(null)
  const callStateRef = useRef<CallState>('idle')

  useEffect(() => {
    callStateRef.current = callState
  }, [callState])

  const cleanupCall = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t: any) => t.stop())
      localStreamRef.current = null
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t: any) => t.stop())
      screenStreamRef.current = null
    }
    if (callChannelRef.current) {
      unsubscribeFromCall(callChannelRef.current)
      callChannelRef.current = null
    }
    setLocalStream(null)
    setRemoteStream(null)
    setIsMuted(false)
    setIsVideoOff(false)
    setIsScreenSharing(false)
    setCallState('idle')
    setCallType(null)
    setCallPartner(null)
    setIncomingCall(null)
    currentCallIdRef.current = null
    pendingCandidatesRef.current = []
  }, [])

  useEffect(() => {
    if (!user) return

    const sub = subscribeToIncomingCalls(user.id, async (callSignal) => {
      if (callStateRef.current !== 'idle') return
      try {
        const { data: callerProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', callSignal.caller_id)
          .maybeSingle()
        if (!callerProfile) return
        setIncomingCall(callSignal)
        setCallPartner(callerProfile)
        setCallState('ringing')
        currentCallIdRef.current = callSignal.call_id
      } catch (err) {
        console.error('Failed to fetch caller profile:', err)
      }
    })

    return () => { void sub.unsubscribe() }
  }, [user])

  const getLocalStream = useCallback(async (video = false) => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video,
      })
      localStreamRef.current = stream
      setLocalStream(stream)
      return stream
    } catch (err) {
      console.error('Failed to get local stream:', err)
      throw err
    }
  }, [])

  const createPeerConnection = useCallback(
    (stream: any) => {
      // @ts-ignore - RTCPeerConnection from react-native-webrtc
      const pc: any = new RTCPeerConnection(RTC_CONFIG)
      pcRef.current = pc

      stream.getTracks().forEach((track: any) => {
        pc.addTrack(track, stream)
      })

      pc.onicecandidate = (e: any) => {
        if (e.candidate && currentCallIdRef.current && callPartner) {
          const callId = currentCallIdRef.current
          persistSignal(callId, user!.id, callPartner.id, 'ice-candidate', e.candidate)
          if (callChannelRef.current) {
            callChannelRef.current
              .send({
                type: 'broadcast',
                event: 'ice-candidate',
                payload: {
                  signalData: e.candidate,
                  callerId: user!.id,
                  receiverId: callPartner.id,
                },
              })
              .catch(console.error)
          }
        }
      }

      pc.ontrack = (e: any) => {
        setRemoteStream(e.streams[0])
      }

      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === 'disconnected' ||
          pc.iceConnectionState === 'failed' ||
          pc.iceConnectionState === 'closed'
        ) {
          cleanupCall()
        }
      }

      return pc
    },
    [user, callPartner, cleanupCall]
  )

  const startCall = useCallback(
    async (contact: Profile, type: 'audio' | 'video') => {
      if (!user) return
      try {
        const stream = await getLocalStream(type === 'video')
        const callId = generateUUID()
        currentCallIdRef.current = callId
        setCallPartner(contact)
        setCallType(type)
        setCallState('connecting')

        await recordCall(callId, user.id, contact.id, type)
        callStartTimeRef.current = Date.now()

        const pc = createPeerConnection(stream)

        const channel = await subscribeToCall(callId, user.id, {
          onAnswer: async (answerDesc: any) => {
            callStartTimeRef.current = Date.now()
            await pc.setRemoteDescription(new RTCSessionDescription(answerDesc))
            for (const candidate of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            }
            pendingCandidatesRef.current = []
            setCallState('connected')
          },
          onIceCandidate: async (candidate: any) => {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } else {
              pendingCandidatesRef.current.push(candidate)
            }
          },
          onEndCall: () => {
            cleanupCall()
          },
        })
        callChannelRef.current = channel

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        await persistSignal(callId, user.id, contact.id, 'offer', offer)
        await channel.send({
          type: 'broadcast',
          event: 'offer',
          payload: { signalData: offer, callerId: user.id, receiverId: contact.id },
        })
      } catch (err) {
        console.error('Failed to start call:', err)
        cleanupCall()
      }
    },
    [user, getLocalStream, createPeerConnection, cleanupCall]
  )

  const acceptCall = useCallback(async () => {
    if (!user || !incomingCall || !callPartner) return
    const callId = currentCallIdRef.current
    if (!callId) return

    try {
      const { data: offerData } = await supabase
        .from('call_signals')
        .select('*')
        .eq('call_id', callId)
        .eq('signal_type', 'offer')
        .single()

      const hasVideo = offerData?.signal_data?.sdp?.includes('m=video')
      const isVideoCall = hasVideo || callType === 'video'
      setCallType(isVideoCall ? 'video' : 'audio')
      setCallState('connecting')

      await updateCallStatus(callId, 'answered', 0)
      callStartTimeRef.current = Date.now()

      const stream = await getLocalStream(isVideoCall)
      const pc = createPeerConnection(stream)

      const channel = await subscribeToCall(callId, user.id, {
        onIceCandidate: async (candidate: any) => {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          } else {
            pendingCandidatesRef.current.push(candidate)
          }
        },
        onEndCall: () => {
          cleanupCall()
        },
      })
      callChannelRef.current = channel

      if (offerData?.signal_data) {
        await pc.setRemoteDescription(new RTCSessionDescription(offerData.signal_data))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        await persistSignal(callId, user.id, callPartner.id, 'answer', answer)
        await channel.send({
          type: 'broadcast',
          event: 'answer',
          payload: {
            signalData: answer,
            callerId: callPartner.id,
            receiverId: user.id,
          },
        })

        for (const candidate of pendingCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        }
        pendingCandidatesRef.current = []
        setCallState('connected')
      }
    } catch (err) {
      console.error('Failed to accept call:', err)
      cleanupCall()
    }
  }, [user, incomingCall, callPartner, getLocalStream, createPeerConnection, cleanupCall])

  const rejectCall = useCallback(async () => {
    const callId = currentCallIdRef.current
    if (callId && callPartner) {
      await updateCallStatus(callId, 'rejected', 0)
      await supabase.from('call_signals').delete().eq('call_id', callId)
    }
    cleanupCall()
  }, [callPartner, cleanupCall])

  const endCall = useCallback(async () => {
    const callId = currentCallIdRef.current
    if (callId && callChannelRef.current) {
      const wasConnected = callStateRef.current === 'connected'
      const duration = callStartTimeRef.current && wasConnected
        ? (Date.now() - callStartTimeRef.current) / 1000
        : 0
      await updateCallStatus(callId, 'answered', duration)

      await callChannelRef.current.send({
        type: 'broadcast',
        event: 'end-call',
        payload: { userId: user!.id },
      })
      await supabase.from('call_signals').delete().eq('call_id', callId)
    }
    cleanupCall()
  }, [user, cleanupCall])

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }, [])

  const toggleVideo = useCallback(async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOff(!videoTrack.enabled)
      }
    }
  }, [])

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t: any) => t.stop())
        screenStreamRef.current = null
      }
      try {
        const stream = await mediaDevices.getUserMedia({ audio: true, video: true })
        const videoTrack = stream.getVideoTracks()[0]
        const sender = pcRef.current?.getSenders().find((s: any) => s.track?.kind === 'video')
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack)
        }
        localStreamRef.current?.getVideoTracks().forEach((t: any) => t.stop())
        localStreamRef.current = stream
        setLocalStream(stream)
      } catch (err) {
        console.error('Failed to switch back to camera:', err)
      }
      setIsScreenSharing(false)
    } else {
      try {
        const screenStream = await (mediaDevices as any).getDisplayMedia()
        screenStreamRef.current = screenStream
        const videoTrack = screenStream.getVideoTracks()[0]
        const sender = pcRef.current?.getSenders().find((s: any) => s.track?.kind === 'video')
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack)
        }
        ; (videoTrack as any).onended = () => {
          toggleScreenShare()
        }
        setIsScreenSharing(true)
      } catch (err) {
        console.error('Failed to start screen share:', err)
      }
    }
  }, [isScreenSharing])

  return (
    <CallContext.Provider
      value={{
        callState,
        callType,
        callPartner,
        localStream,
        remoteStream,
        isMuted,
        isVideoOff,
        isScreenSharing,
        incomingCall,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
        cleanupCall,
      }}
    >
      {children}
    </CallContext.Provider>
  )
}

export function useCall() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall must be used within a CallProvider')
  return ctx
}
