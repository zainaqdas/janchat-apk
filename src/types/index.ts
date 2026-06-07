// =============================================================================
// Shared TypeScript types for the mobile app
// =============================================================================

export interface Profile {
  id: string
  username: string
  avatar_url?: string | null
  created_at: string
  last_seen: string
}

export interface Contact {
  id: string
  user_id: string
  contact_id: string
  status: 'pending' | 'accepted' | 'blocked'
  created_at: string
  contact?: Profile
  user?: Profile
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  message: string
  created_at: string
  read: boolean
}

export interface CallHistoryEntry {
  id: string
  call_id: string
  caller_id: string
  receiver_id: string
  call_type: 'audio' | 'video'
  status: 'missed' | 'answered' | 'rejected'
  duration: number
  started_at: string
  ended_at?: string
  caller?: Profile
  receiver?: Profile
  otherUser?: Profile
  isCaller?: boolean
}

export type CallState = 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended'

export type CallType = 'audio' | 'video' | null
