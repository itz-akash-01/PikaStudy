import { useState, type FormEvent } from 'react'
import { submitRequest } from './requests'
import { CLASS_IDS } from './curriculum'
import { isConfigured } from './supabase'
import { usePageTitle } from './useAsync'
import { Mascot } from './Mascot'

export default function RequestBook() {
  usePageTitle('Request a Book')
  const [ref, setRef] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const s = (k: string) => String(f.get(k) ?? '').trim()
    if (s('book_name').length < 2 || !s('class_id') || !s('subject')) return setError('Enter the book name, class and subject.')
    setBusy(true); setError('')
    try {
      setRef(await submitRequest({
        book_name: s('book_name'), class_id: Number(s('class_id')), subject: s('subject'),
        author_or_publication: s('author_or_publication'), info: s('info'),
      }))
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not send the request.') }
    finally { setBusy(false) }
  }

  if (ref) return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <Mascot width={150} className="mx-auto" />
      <h1 className="mt-4 text-2xl">Request sent</h1>
      <p className="mt-2">Your reference ID is <strong>{ref}</strong>. Keep it to check back with us.</p>
    </div>
  )
  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-lg space-y-4 p-6" noValidate>
      <h1 className="text-3xl">Request a book</h1>
      <p className="text-sm text-brand-navy/70">Can’t find what you need? Tell us and we’ll look for an authorised copy.</p>
      {!isConfigured && <p className="rounded-xl bg-brand-sky/40 p-3 text-sm font-bold">Demo mode: requests can’t be saved until Supabase is connected.</p>}
      <div><label className="label" htmlFor="book_name">Book name</label><input id="book_name" name="book_name" className="input" maxLength={200} required /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="class_id">Class</label>
          <select id="class_id" name="class_id" className="input" defaultValue="">
            <option value="" disabled>Choose class</option>{CLASS_IDS.map((c) => <option key={c} value={c}>Class {c}</option>)}
          </select></div>
        <div><label className="label" htmlFor="subject">Subject</label><input id="subject" name="subject" className="input" maxLength={100} /></div>
      </div>
      <div><label className="label" htmlFor="author_or_publication">Author or publication</label><input id="author_or_publication" name="author_or_publication" className="input" maxLength={200} /></div>
      <div><label className="label" htmlFor="info">Additional information</label><textarea id="info" name="info" className="input min-h-[100px] py-2" maxLength={1000} /></div>
      {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
    </form>
  )
}
