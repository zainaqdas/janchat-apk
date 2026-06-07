import { supabase } from '../lib/supabase'

export function getCallChannel(callId: string) {
  return supabase.channel(`call:${callId}`, {
    config: {
      broadcast: { self: true },
    },
  })
}

export async function persistSignal(
  callId: string,
  callerId: string,
  receiverId: string,
  signalType: string,
  signalData: any
) {
  const { error } = await supabase.from('call_signals').insert({
    caller_id: callerId,
    receiver_id: receiverId,
    signal_type: signalType,
    signal_data: signalData,
    call_id: callId,
  })
  if (error) console.error('Failed to persist signal:', error)
}

export async function subscribeToCall(
  callId: string,
  userId: string,
  handlers: {
    onOffer?: (data: any, callerId: string) => void
    onAnswer?: (data: any) => void
    onIceCandidate?: (data: any) => void
    onEndCall?: (data: any) => void
    onMuteChanged?: (data: any) => void
  }
) {
  const callChannel = getCallChannel(callId)

  callChannel.on('broadcast', { event: 'offer' }, ({ payload }: any) => {
    if (payload.receiverId === userId && handlers.onOffer) {
      handlers.onOffer(payload.signalData, payload.callerId)
    }
  })

  callChannel.on('broadcast', { event: 'answer' }, ({ payload }: any) => {
    if (payload.callerId === userId || payload.receiverId === userId) {
      if (handlers.onAnswer) handlers.onAnswer(payload.signalData)
    }
  })

  callChannel.on('broadcast', { event: 'ice-candidate' }, ({ payload }: any) => {
    if (handlers.onIceCandidate) handlers.onIceCandidate(payload.signalData)
  })

  callChannel.on('broadcast', { event: 'end-call' }, ({ payload }: any) => {
    if (handlers.onEndCall) handlers.onEndCall(payload)
  })

  callChannel.on('broadcast', { event: 'mute-changed' }, ({ payload }: any) => {
    if (handlers.onMuteChanged) handlers.onMuteChanged(payload)
  })

  await callChannel.subscribe()
  return callChannel
}

export function unsubscribeFromCall(callChannel: any) {
  if (callChannel) {
    supabase.removeChannel(callChannel)
  }
}

export function subscribeToIncomingCalls(userId: string, onCall: (signal: any) => void) {
  return supabase
    .channel(`incoming-calls-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'call_signals',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new.signal_type === 'offer') {
          onCall(payload.new)
        }
      }
    )
    .subscribe()
}
