import { supabase } from './supabase'

export interface NewRequest { book_name: string; class_id: number | null; subject: string; author_or_publication: string; info: string }

const makeRef = () => 'PS-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()

export async function submitRequest(r: NewRequest): Promise<string> {
  if (!supabase) throw new Error('Requests are disabled in demo mode. Connect Supabase to enable them.')
  const ref_id = makeRef()
  const { error } = await supabase.from('book_requests').insert({ ...r, ref_id })
  if (error) throw new Error(error.message)
  return ref_id
}
