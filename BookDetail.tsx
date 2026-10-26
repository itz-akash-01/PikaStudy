import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { coverUrl, getBook, hasFile, listBooks, recordDownload, resolveFileUrl } from './books'
import { useAsync, usePageTitle } from './useAsync'
import { BookCard } from './BookCard'
import { PdfViewer } from './PdfViewer'
import { ErrorNote, Loading } from './Mascot'
import NotFound from './NotFound'

export default function BookDetail() {
  const { id = '' } = useParams()
  const { data: book, loading, error } = useAsync(() => getBook(id), [id])
  const related = useAsync(async () => book ? (await listBooks({ subjectId: book.subject_id ?? undefined })).items.filter((b) => b.id !== book.id).slice(0, 4) : [], [book?.id])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  usePageTitle(book?.title)

  if (loading) return <Loading />
  if (error) return <ErrorNote message={error} />
  if (!book) return <NotFound />

  const open = async (mode: 'preview' | 'download') => {
    try {
      const url = await resolveFileUrl(book)
      if (!url) return setMsg('No file is attached to this book.')
      if (mode === 'preview') return setPreviewUrl(url)
      void recordDownload(book.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not open the file.') }
  }
  const copy = () => navigator.clipboard?.writeText(location.href).then(() => setMsg('Link copied.'), () => setMsg('Copy failed.'))
  const cover = coverUrl(book)
  const rows: [string, string | null | undefined][] = [
    ['Class', book.class_id ? `Class ${book.class_id}` : null], ['Stream', book.stream?.name], ['Subject', book.subject?.name],
    ['Category', book.category?.name], ['Author', book.author], ['Publication', book.publication], ['Edition', book.edition],
    ['Session', book.session], ['Language', book.language],
  ]
  return (
    <>
      <Link to="/library" className="btn btn-outline btn-sm">← Back to library</Link>
      <div className="mt-5 grid gap-6 md:grid-cols-[240px_1fr]">
        {cover ? <img src={cover} alt={`Cover of ${book.title}`} className="w-full max-w-[240px] rounded-2xl" />
          : <div className="flex aspect-[3/4] w-full max-w-[240px] items-center justify-center rounded-2xl bg-brand-yellow/60 p-4 text-center text-xl font-extrabold">{book.title}</div>}
        <div>
          <h1 className="text-3xl">{book.title}</h1>
          <dl className="mt-4 grid grid-cols-[110px_1fr] gap-x-4 gap-y-1 text-sm">
            {rows.filter(([, v]) => v).map(([k, v]) => (<div key={k} className="contents"><dt className="font-bold text-brand-navy/60">{k}</dt><dd>{v}</dd></div>))}
          </dl>
          {book.description && <p className="mt-4 max-w-prose">{book.description}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {hasFile(book) ? (<>
              <button className="btn btn-primary" onClick={() => open('preview')}>Preview</button>
              <button className="btn btn-outline" onClick={() => open('download')}>Download</button>
            </>) : <span className="chip">No file attached yet</span>}
            <button className="btn btn-outline" onClick={copy}>Copy link</button>
          </div>
          {msg && <p role="status" className="mt-2 text-sm font-bold">{msg}</p>}
          {previewUrl && <PdfViewer url={previewUrl} />}
        </div>
      </div>
      {!!related.data?.length && (
        <section className="mt-12"><h2 className="mb-4 text-2xl">Related resources</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{related.data.map((b) => <BookCard key={b.id} book={b} />)}</div>
        </section>
      )}
    </>
  )
}
