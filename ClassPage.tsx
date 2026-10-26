import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CATEGORY_NAMES, CLASS_IDS, STREAM_NAMES, subjectsFor, type StreamName } from './curriculum'
import { listBooks } from './books'
import { getMeta, idByName } from './meta'
import { useAsync, usePageTitle } from './useAsync'
import { BookCard } from './BookCard'
import { ErrorNote, Loading } from './Mascot'
import NotFound from './NotFound'

export default function ClassPage() {
  const classId = Number(useParams().classId)
  const [stream, setStream] = useState<StreamName>('Science')
  usePageTitle(`Class ${classId}`)
  const valid = (CLASS_IDS as readonly number[]).includes(classId)
  const meta = useAsync(getMeta, [])
  const books = useAsync(() => listBooks({ classId }), [classId])
  if (!valid) return <NotFound />

  const subjects = subjectsFor(classId, stream)
  const visible = books.data?.items.filter((b) => classId === 10 || !b.stream || b.stream.name === stream) ?? []
  const q = (extra: string) => `/library?class=${classId}${extra}`

  return (
    <>
      <h1 className="text-3xl sm:text-4xl">Class {classId}</h1>
      <p className="mt-2 text-brand-navy/70">{classId === 10 ? 'Board-year study material for all core subjects.' : 'Pick a stream to see its subjects and resources.'}</p>
      {classId !== 10 && (
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Stream">
          {STREAM_NAMES.map((s) => (
            <button key={s} role="tab" aria-selected={s === stream} onClick={() => setStream(s)}
              className={`btn btn-sm ${s === stream ? 'btn-primary' : 'btn-outline'}`}>{s}</button>
          ))}
        </div>
      )}
      <h2 className="mt-8 text-xl">Subjects</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {subjects.map((s) => (
          <Link key={s} className="chip bg-brand-yellow/50 hover:bg-brand-yellow" to={q(`&subject=${meta.data ? idByName(meta.data.subjects, s) ?? '' : ''}`)}>{s}</Link>
        ))}
      </div>
      <h2 className="mt-8 text-xl">Resource types</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {CATEGORY_NAMES.map((c) => (
          <Link key={c} className="chip hover:bg-brand-navy/10" to={q(`&category=${meta.data ? idByName(meta.data.categories, c) ?? '' : ''}`)}>{c}</Link>
        ))}
      </div>
      <h2 className="mt-8 text-xl">Recommended for Class {classId}</h2>
      <div className="mt-3">
        {books.loading ? <Loading /> : books.error ? <ErrorNote message={books.error} /> : visible.length === 0
          ? <p className="text-sm text-brand-navy/70">Nothing listed yet for this selection.</p>
          : <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{visible.map((b) => <BookCard key={b.id} book={b} />)}</div>}
      </div>
    </>
  )
}
