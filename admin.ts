import { supabase } from './supabase'
import type { Book, BookRequest, RequestStatus } from './types'

const db = () => { if (!supabase) throw new Error('Supabase is not configured'); return supabase }
const SELECT = '*, subject:subjects(name), category:categories(name), stream:streams(name)'

export type BookInput = Pick<Book, 'title' | 'class_id' | 'stream_id' | 'subject_id' | 'category_id' | 'author' | 'publication' | 'edition' | 'session' | 'language' | 'description' | 'external_url' | 'featured' | 'published'> & { cover_path?: string | null; pdf_path?: string | null }

export async function listAllBooks(): Promise<Book[]> {
  const { data, error } = await db().from('books').select(SELECT).order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as unknown as Book[]
}
export async function saveBook(input: BookInput, id?: string) {
  const { error } = id ? await db().from('books').update(input).eq('id', id) : await db().from('books').insert(input)
  if (error) throw new Error(error.message)
}
export async function deleteBook(id: string) {
  const { error } = await db().from('books').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
export async function setFlag(id: string, patch: Partial<Pick<Book, 'featured' | 'published'>>) {
  const { error } = await db().from('books').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}
export async function uploadFile(bucket: 'covers' | 'pdfs', file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await db().storage.from(bucket).upload(path, file, { contentType: file.type })
  if (error) throw new Error(error.message)
  return path
}
export async function listRequests(): Promise<BookRequest[]> {
  const { data, error } = await db().from('book_requests').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as BookRequest[]
}
export async function setRequestStatus(id: string, status: RequestStatus) {
  const { error } = await db().from('book_requests').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}
export async function adminCounts() {
  const c = async (t: string) => (await db().from(t).select('id', { count: 'exact', head: true })).count ?? 0
  const [books, subjects, requests] = await Promise.all([c('books'), c('subjects'), c('book_requests')])
  return { books, subjects, classes: 3, requests }
}
