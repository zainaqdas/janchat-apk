import { supabase } from '../lib/supabase'
import { Contact } from '../types'

export async function getContacts(userId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*, contact:contact_id(*)')
    .eq('user_id', userId)
    .in('status', ['accepted', 'pending'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getContactRequests(userId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*, user:user_id(*)')
    .eq('contact_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function sendContactRequest(userId: string, contactId: string) {
  const { data, error } = await supabase
    .from('contacts')
    .insert({ user_id: userId, contact_id: contactId, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function acceptContactRequest(contactId: string) {
  const { data, error } = await supabase
    .from('contacts')
    .update({ status: 'accepted' })
    .eq('id', contactId)
    .select()
    .single()
  if (error) throw error

  const { error: recipError } = await supabase.from('contacts').insert({
    user_id: data.contact_id,
    contact_id: data.user_id,
    status: 'accepted',
  })
  if (recipError) throw recipError

  return data
}

export async function removeContact(contactId: string) {
  const { data: entry, error: fetchError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single()
  if (fetchError) throw fetchError

  const { error: delError } = await supabase
    .from('contacts')
    .delete()
    .or(
      `and(user_id.eq.${entry.user_id},contact_id.eq.${entry.contact_id}),and(user_id.eq.${entry.contact_id},contact_id.eq.${entry.user_id})`
    )
  if (delError) throw delError
}

export async function getAcceptedContacts(userId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*, contact:contact_id(*)')
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
