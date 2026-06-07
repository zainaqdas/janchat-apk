import { supabase } from '../lib/supabase'
import { CallHistoryEntry } from '../types'

export async function recordCall(
  callId: string,
  callerId: string,
  receiverId: string,
  callType: string
) {
  const { error } = await supabase.from('call_history').insert({
    call_id: callId,
    caller_id: callerId,
    receiver_id: receiverId,
    call_type: callType,
    status: 'missed',
    started_at: new Date().toISOString(),
  })
  if (error) console.error('Failed to record call:', error)
}

export async function updateCallStatus(
  callId: string,
  status: string,
  duration: number
) {
  const { error } = await supabase
    .from('call_history')
    .update({
      status,
      duration: Math.floor(duration),
      ended_at: new Date().toISOString(),
    })
    .eq('call_id', callId)

  if (error) console.error('Failed to update call status:', error)
}

export async function getCallHistory(userId: string): Promise<CallHistoryEntry[]> {
  const { data, error } = await supabase
    .from('call_history')
    .select('*, caller:caller_id(id, username, avatar_url), receiver:receiver_id(id, username, avatar_url)')
    .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('started_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Failed to fetch call history:', error)
    return []
  }

  return (data || []).map((entry: any) => ({
    ...entry,
    otherUser:
      entry.caller_id === userId ? entry.receiver : entry.caller,
    isCaller: entry.caller_id === userId,
  }))
}
