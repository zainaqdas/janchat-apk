import { supabase } from '../lib/supabase'

/**
 * Save an Expo push token subscription to Supabase.
 * The token (e.g. "ExponentPushToken[xxxxxxxx]") is stored in the `endpoint` field.
 * The `p256dh_key` and `auth_key` fields are left empty since they are only
 * relevant for Web Push API (browser) subscriptions — not Expo push.
 */
export async function saveSubscription(userId: string, subscription: { endpoint: string }) {
  if (!userId || !subscription?.endpoint) return

  try {
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: '',
        auth_key: '',
      },
      { onConflict: 'user_id' }
    )
    if (error) console.error('Failed to save push subscription:', error)
  } catch (err) {
    console.error('Failed to save push subscription:', err)
  }
}

/**
 * Remove a user's push subscription.
 */
export async function removeSubscription(userId: string) {
  if (!userId) return

  try {
    await supabase.from('push_subscriptions').delete().eq('user_id', userId)
  } catch (err) {
    console.error('Failed to remove push subscription:', err)
  }
}
