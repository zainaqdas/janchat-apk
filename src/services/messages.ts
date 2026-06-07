import { supabase } from '../lib/supabase'
import { Message } from '../types'

export async function getMessages(userId1: string, userId2: string, limit = 50): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []).reverse()
}

export async function sendMessage(senderId: string, receiverId: string, message: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, message })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markAsRead(messageIds: string[]) {
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .in('id', messageIds)
  if (error) throw error
}

export async function getUnreadCount(userId: string) {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('read', false)
  if (error) throw error
  return count || 0
}

export async function getUnreadCountBySender(userId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('sender_id')
    .eq('receiver_id', userId)
    .eq('read', false)
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const row of data || []) {
    counts[row.sender_id] = (counts[row.sender_id] || 0) + 1
  }
  return counts
}

export function subscribeToMessages(userId: string, callback: (msg: Message) => void) {
  return supabase
    .channel(`messages-channel-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => callback(payload.new as Message)
    )
    .subscribe()
}

export function subscribeToSentMessages(userId: string, callback: (msg: Message) => void) {
  return supabase
    .channel(`sent-messages-channel-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${userId}`,
      },
      (payload) => callback(payload.new as Message)
    )
    .subscribe()
}
