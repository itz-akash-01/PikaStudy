import { supabase } from './supabase'
import type { Book } from './types'
import { sampleBooks } from './sample'
import { getMeta } from './meta'

export const PAGE_SIZE = 8
const SELECT = '*, subject:subjects(name), category:categories(name), stream:streams(name)'

export type SortKey = 'new' | 'az' | 'downloads' | 'featured'
export interface BookQuery {
  q?: string; classId?: number; subjectId?: number; categoryId?: number
  language?: string; session?: string; sort?: SortKey; page?: number; featuredOnly?: boolean
}

export async function listBooks(f: BookQuery = {}): Promise<{ items: Book[]; total: number }> {
  const page = Math.max(1, f.page ?? 1)
  const sort = f.sort ?? 'new'

  if (!supabase) {
    let items = sampleBooks.filter((b) =>
      (!f.classId || b.class_id === f.classId) && (!f.subjectId || b.subject_id === f.subjectId) &&
      (!f.categoryId || b.category_id === f.categoryId) && (!f.language || b.language === f.language) &&
      (!f.session || b.session === f.session) && (!f.featuredOnly || b.featured) &&
      (!f.q || [b.title, b.author, b.publication, b.subject?.name].join(' ').toLowerCase().includes(f.q.toLowerCase())))
    items = [...items].sort(
      sort === 'az' ? (a, b) => a.title.localeCompare(b.title)
      : sort === 'downloads' ? (a, b) => b.download_count - a.download_count
      : sort === 'featured' ? (a, b) => Number(b.featured) - Number(a.featured)
      : (a, b) => b.created_at.localeCompare(a.created_at))
    return { items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: items.length }
  }

  let qb = supabase.from('books').select(SELECT, { count: 'exact' }).eq('published', true)
  if (f.classId) qb = qb.eq('class_id', f.classId)
  if (f.subjectId) qb = qb.eq('subject_id', f.subjectId)
  if (f.categoryId) qb = qb.eq('category_id', f.categoryId)
  if (f.language) qb = qb.eq('language', f.language)
  if (f.session) qb = qb.eq('session', f.session)
  if (f.featuredOnly) qb = qb.eq('featured', true)
  const term = f.q?.replace(/[%,()]/g, ' ').trim()
  if (term) qb = qb.or(`title.ilike.%${term}%,author.ilike.%${term}%,publication.ilike.%${term}%`)
  qb = sort === 'az' ? qb.order('title')
    : sort === 'downloads' ? qb.order('download_count', { ascending: false })
    : sort === 'featured' ? qb.order('featured', { ascending: false }).order('created_at', { ascending: false })
    : qb.order('created_at', { ascending: false })
  const { data, error, count } = await qb.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
  if (error) throw new Error(error.message)
  return { items: (data ?? []) as unknown as Book[], total: count ?? 0 }
}

export async function getBook(id: string): Promise<Book | null> {
  if (!supabase) return sampleBooks.find((b) => b.id === id) ?? null
  const { data, error } = await supabase.from('books').select(SELECT).eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as unknown as Book) ?? null
}

export async function getStats() {
  const meta = await getMeta()
  const catId = (n: string) => meta.categories.find((c) => c.name === n)?.id
  const sb = supabase
  if (!sb) {
    const n = (name: string) => sampleBooks.filter((b) => b.category?.name === name).length
    return { total: sampleBooks.length, notes: n('Notes'), pyqs: n('PYQs') }
  }
  const count = async (categoryId?: number) => {
    let qb = sb.from('books').select('id', { count: 'exact', head: true }).eq('published', true)
    if (categoryId) qb = qb.eq('category_id', categoryId)
    return (await qb).count ?? 0
  }
  const [total, notes, pyqs] = await Promise.all([count(), count(catId('Notes')), count(catId('PYQs'))])
  return { total, notes, pyqs }
}

export const hasFile = (b: Book) => Boolean(b.pdf_path || (b.external_url && /^https:\/\//.test(b.external_url)))

export function coverUrl(b: Book): string | null {
  if (!supabase || !b.cover_path) return null
  return supabase.storage.from('covers').getPublicUrl(b.cover_path).data.publicUrl
}

/** Resolves the URL to preview or download: external link, or a short-lived signed URL for stored PDFs. */
export async function resolveFileUrl(b: Book): Promise<string | null> {
  if (b.external_url && /^https:\/\//.test(b.external_url)) return b.external_url
  if (!supabase || !b.pdf_path) return null
  const { data, error } = await supabase.storage.from('pdfs').createSignedUrl(b.pdf_path, 3600)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

export async function recordDownload(id: string) {
  if (supabase) await supabase.rpc('record_download', { b: id })
}
