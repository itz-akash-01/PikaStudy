import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CLASS_IDS, LANGUAGES, SESSIONS } from './curriculum'
import { listBooks, PAGE_SIZE, type SortKey } from './books'
import { getMeta } from './meta'
import { useAsync, usePageTitle } from './useAsync'
import { BookCard } from './BookCard'
import { EmptyState, ErrorNote, Loading } from './Mascot'
import { Link } from 'react-router-dom'

const num = (v: string | null) => (v && Number(v) > 0 ? Number(v) : undefined)

export default function Library() {
  usePageTitle('Library')
  const [params, setParams] = useSearchParams()
  const get = (k: string) => params.get(k) ?? ''
  const [text, setText] = useState(get('q'))
  const meta = useAsync(getMeta, [])

  const set = (patch: Record<string, string>, keepPage = false) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    if (!keepPage) next.delete('page')
    setParams(next, { replace: true })
  }
  useEffect(() => { // debounce search box → URL
    const t = setTimeout(() => text !== get('q') && set({ q: text.trim() }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  const query = {
    q: get('q') || undefined, classId: num(params.get('class')), subjectId: num(params.get('subject')),
    categoryId: num(params.get('category')), language: get('language') || undefined, session: get('session') || undefined,
    sort: (get('sort') || 'new') as SortKey, page: num(params.get('page')) ?? 1,
  }
  const res = useAsync(() => listBooks(query), [params.toString()])
  const pages = Math.max(1, Math.ceil((res.data?.total ?? 0) / PAGE_SIZE))

  const select = (key: string, label: string, options: { value: string | number; label: string }[]) => (
    <select className="input" aria-label={label} value={get(key)} onChange={(e) => set({ [key]: e.target.value })}>
      <option value="">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )

  return (
    <>
      <h1 className="text-3xl sm:text-4xl">The PikaStudy Library</h1>
      <p className="mt-1 text-brand-navy/70">Discover the right study material for your learning journey.</p>
      <input className="input mt-5" type="search" placeholder="Search title, author, publication…" aria-label="Search books"
        value={text} onChange={(e) => setText(e.target.value)} />
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2">
        <button className={`btn btn-sm shrink-0 ${!get('category') ? 'btn-primary' : 'btn-outline'}`} onClick={() => set({ category: '' })}>All</button>
        {meta.data?.categories.map((c) => (
          <button key={c.id} className={`btn btn-sm shrink-0 ${get('category') === String(c.id) ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => set({ category: String(c.id) })}>{c.name}</button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-5">
        {select('class', 'Class', CLASS_IDS.map((c) => ({ value: c, label: `Class ${c}` })))}
        {select('subject', 'Subject', meta.data?.subjects.map((s) => ({ value: s.id, label: s.name })) ?? [])}
        {select('language', 'Language', LANGUAGES.map((l) => ({ value: l, label: l })))}
        {select('session', 'Session', SESSIONS.map((s) => ({ value: s, label: s })))}
        <select className="input" aria-label="Sort" value={get('sort') || 'new'} onChange={(e) => set({ sort: e.target.value })}>
          <option value="new">Recently added</option><option value="az">Alphabetical</option>
          <option value="downloads">Most downloaded</option><option value="featured">Featured</option>
        </select>
      </div>

      <div className="mt-6">
        {res.loading ? <Loading /> : res.error ? <ErrorNote message={res.error} /> : res.data!.items.length === 0 ? (
          <EmptyState title="No books found">Try a different search, or <Link to="/request" className="font-bold underline">request this book</Link>.</EmptyState>
        ) : (
          <>
            <p className="mb-3 text-sm text-brand-navy/70">{res.data!.total} result{res.data!.total === 1 ? '' : 's'}</p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{res.data!.items.map((b) => <BookCard key={b.id} book={b} />)}</div>
            {pages > 1 && (
              <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Pagination">
                <button className="btn btn-outline btn-sm" disabled={query.page <= 1} onClick={() => set({ page: String(query.page - 1) }, true)}>Previous</button>
                <span className="text-sm font-bold">Page {query.page} of {pages}</span>
                <button className="btn btn-outline btn-sm" disabled={query.page >= pages} onClick={() => set({ page: String(query.page + 1) }, true)}>Next</button>
              </nav>
            )}
          </>
        )}
      </div>
    </>
  )
}
