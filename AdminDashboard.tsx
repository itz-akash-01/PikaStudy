import { useState, type FormEvent } from 'react'
import { useAuth } from './auth'
import { adminCounts, deleteBook, listAllBooks, listRequests, saveBook, setFlag, setRequestStatus, uploadFile, type BookInput } from './admin'
import { getMeta } from './meta'
import { LANGUAGES, SESSIONS } from './curriculum'
import { useAsync, usePageTitle } from './useAsync'
import { ErrorNote, Loading } from './Mascot'
import type { Book, Meta, RequestStatus } from './types'

type Tab = 'overview' | 'books' | 'requests'
const STATUSES: RequestStatus[] = ['pending', 'in_progress', 'completed', 'rejected']

export default function AdminDashboard() {
  usePageTitle('Admin')
  const { signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-3xl">Admin</h1>
        {(['overview', 'books', 'requests'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`btn btn-sm capitalize ${tab === t ? 'btn-primary' : 'btn-outline'}`}>{t}</button>
        ))}
        <button className="btn btn-danger btn-sm" onClick={() => void signOut()}>Log out</button>
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'books' && <Books />}
      {tab === 'requests' && <Requests />}
    </>
  )
}

function Overview() {
  const c = useAsync(adminCounts, [])
  if (c.loading) return <Loading />
  if (c.error) return <ErrorNote message={c.error} />
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Object.entries(c.data!).map(([k, v]) => (
        <div key={k} className="card p-4 text-center"><dd className="text-3xl font-extrabold">{v}</dd><dt className="text-xs font-bold uppercase text-brand-navy/60">Total {k}</dt></div>
      ))}
    </dl>
  )
}

function Requests() {
  const [n, setN] = useState(0)
  const r = useAsync(listRequests, [n])
  const [err, setErr] = useState('')
  if (r.loading) return <Loading />
  if (r.error) return <ErrorNote message={r.error} />
  if (!r.data?.length) return <p className="text-sm">No requests yet.</p>
  return (
    <div className="overflow-x-auto">
      {err && <ErrorNote message={err} />}
      <table className="card w-full text-left text-sm">
        <thead><tr className="border-b border-brand-navy/10"><th className="p-3">Ref</th><th className="p-3">Book</th><th className="p-3">Class</th><th className="p-3">Status</th></tr></thead>
        <tbody>{r.data.map((q) => (
          <tr key={q.id} className="border-b border-brand-navy/5 align-top">
            <td className="p-3 font-bold">{q.ref_id}</td>
            <td className="p-3">{q.book_name}<div className="text-xs text-brand-navy/60">{[q.subject, q.author_or_publication].filter(Boolean).join(' · ')}</div>{q.info && <div className="mt-1 text-xs">{q.info}</div>}</td>
            <td className="p-3">{q.class_id}</td>
            <td className="p-3">
              <select className="input" aria-label={`Status for ${q.ref_id}`} value={q.status}
                onChange={(e) => setRequestStatus(q.id, e.target.value as RequestStatus).then(() => setN((x) => x + 1), (x: Error) => setErr(x.message))}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </td>
          </tr>))}
        </tbody>
      </table>
    </div>
  )
}

function Books() {
  const [n, setN] = useState(0)
  const [editing, setEditing] = useState<Book | 'new' | null>(null)
  const [err, setErr] = useState('')
  const books = useAsync(listAllBooks, [n])
  const meta = useAsync(getMeta, [])
  const refresh = () => setN((x) => x + 1)
  const run = (p: Promise<unknown>) => p.then(refresh, (e: Error) => setErr(e.message))

  if (books.loading || meta.loading) return <Loading />
  if (books.error || meta.error) return <ErrorNote message={(books.error || meta.error)!} />
  return (
    <>
      {err && <ErrorNote message={err} />}
      {editing ? <BookForm meta={meta.data!} book={editing === 'new' ? undefined : editing} onDone={() => { setEditing(null); refresh() }} onCancel={() => setEditing(null)} />
        : <button className="btn btn-primary mb-4" onClick={() => setEditing('new')}>Add book</button>}
      <div className="overflow-x-auto">
        <table className="card w-full text-left text-sm">
          <thead><tr className="border-b border-brand-navy/10"><th className="p-3">Title</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
          <tbody>{books.data!.map((b) => (
            <tr key={b.id} className="border-b border-brand-navy/5">
              <td className="p-3 font-bold">{b.title}<div className="text-xs font-normal text-brand-navy/60">Class {b.class_id} · {b.subject?.name} · {b.category?.name}</div></td>
              <td className="p-3">{b.published ? 'Published' : 'Draft'}{b.featured ? ' · Featured' : ''}</td>
              <td className="flex flex-wrap gap-1 p-3">
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(b)}>Edit</button>
                <button className="btn btn-outline btn-sm" onClick={() => run(setFlag(b.id, { published: !b.published }))}>{b.published ? 'Unpublish' : 'Publish'}</button>
                <button className="btn btn-outline btn-sm" onClick={() => run(setFlag(b.id, { featured: !b.featured }))}>{b.featured ? 'Unfeature' : 'Feature'}</button>
                <button className="btn btn-danger btn-sm" onClick={() => confirm(`Delete "${b.title}"?`) && run(deleteBook(b.id))}>Delete</button>
              </td>
            </tr>))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function BookForm({ meta, book, onDone, onCancel }: { meta: Meta; book?: Book; onDone: () => void; onCancel: () => void }) {
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const opt = (list: { id: number; name: string }[]) => list.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const s = (k: string) => String(f.get(k) ?? '').trim()
    const n = (k: string) => (s(k) ? Number(s(k)) : null)
    const url = s('external_url')
    if (s('title').length < 2) return setErr('Enter a title.')
    if (url && !/^https:\/\/\S+$/.test(url)) return setErr('External URL must start with https://')
    setBusy(true); setErr('')
    try {
      const cover = f.get('cover') as File, pdf = f.get('pdf') as File
      const input: BookInput = {
        title: s('title'), class_id: n('class_id'), stream_id: n('stream_id'), subject_id: n('subject_id'), category_id: n('category_id'),
        author: s('author') || null, publication: s('publication') || null, edition: s('edition') || null,
        session: s('session') || null, language: s('language') || null, description: s('description') || null,
        external_url: url || null, featured: f.get('featured') === 'on', published: f.get('published') === 'on',
        ...(cover.size ? { cover_path: await uploadFile('covers', cover) } : {}),
        ...(pdf.size ? { pdf_path: await uploadFile('pdfs', pdf) } : {}),
      }
      await saveBook(input, book?.id)
      onDone()
    } catch (x) { setErr(x instanceof Error ? x.message : 'Save failed.') } finally { setBusy(false) }
  }

  return (
    <form onSubmit={onSubmit} className="card mb-6 grid gap-3 p-5 sm:grid-cols-2" noValidate>
      <h2 className="text-xl sm:col-span-2">{book ? 'Edit book' : 'Add book'}</h2>
      <input name="title" className="input sm:col-span-2" placeholder="Title" defaultValue={book?.title} maxLength={200} aria-label="Title" />
      <select name="class_id" className="input" defaultValue={book?.class_id ?? ''} aria-label="Class"><option value="">Class</option>{opt(meta.classes)}</select>
      <select name="stream_id" className="input" defaultValue={book?.stream_id ?? ''} aria-label="Stream"><option value="">Stream (11–12)</option>{opt(meta.streams)}</select>
      <select name="subject_id" className="input" defaultValue={book?.subject_id ?? ''} aria-label="Subject"><option value="">Subject</option>{opt(meta.subjects)}</select>
      <select name="category_id" className="input" defaultValue={book?.category_id ?? ''} aria-label="Category"><option value="">Category</option>{opt(meta.categories)}</select>
      <input name="author" className="input" placeholder="Author" defaultValue={book?.author ?? ''} aria-label="Author" />
      <input name="publication" className="input" placeholder="Publication" defaultValue={book?.publication ?? ''} aria-label="Publication" />
      <input name="edition" className="input" placeholder="Edition" defaultValue={book?.edition ?? ''} aria-label="Edition" />
      <select name="session" className="input" defaultValue={book?.session ?? ''} aria-label="Session"><option value="">Session</option>{SESSIONS.map((x) => <option key={x}>{x}</option>)}</select>
      <select name="language" className="input" defaultValue={book?.language ?? 'English'} aria-label="Language">{LANGUAGES.map((x) => <option key={x}>{x}</option>)}</select>
      <input name="external_url" className="input" placeholder="Official URL (https://…)" defaultValue={book?.external_url ?? ''} aria-label="External URL" />
      <textarea name="description" className="input min-h-[80px] py-2 sm:col-span-2" placeholder="Description" defaultValue={book?.description ?? ''} aria-label="Description" />
      <label className="text-sm font-bold">Cover image<input name="cover" type="file" accept="image/*" className="input mt-1 py-2" /></label>
      <label className="text-sm font-bold">PDF (max 50 MB)<input name="pdf" type="file" accept="application/pdf" className="input mt-1 py-2" /></label>
      <label className="flex items-center gap-2 text-sm font-bold"><input name="published" type="checkbox" defaultChecked={book?.published} /> Published</label>
      <label className="flex items-center gap-2 text-sm font-bold"><input name="featured" type="checkbox" defaultChecked={book?.featured} /> Featured</label>
      {err && <div className="sm:col-span-2"><ErrorNote message={err} /></div>}
      <div className="flex gap-2 sm:col-span-2"><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button><button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button></div>
    </form>
  )
}
