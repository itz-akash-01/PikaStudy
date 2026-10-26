import { Link } from 'react-router-dom'
import { brand } from './brand'
import { CATEGORY_NAMES, CLASS_IDS } from './curriculum'
import { getStats, listBooks } from './books'
import { getMeta } from './meta'
import { useAsync, usePageTitle } from './useAsync'
import { BookCard } from './BookCard'
import { ErrorNote, Mascot } from './Mascot'

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-14"><h2 className="mb-5 text-2xl sm:text-3xl">{title}</h2>{children}</section>
)

export default function Home() {
  usePageTitle()
  const stats = useAsync(getStats, [])
  const meta = useAsync(getMeta, [])
  const featured = useAsync(() => listBooks({ featuredOnly: true }), [])
  const recent = useAsync(() => listBooks({ sort: 'new' }), [])
  const catId = (n: string) => meta.data?.categories.find((c) => c.name === n)?.id

  return (
    <>
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <span className="inline-block rounded-full bg-brand-sky/50 px-3 py-1 text-xs font-extrabold tracking-widest">LEARN • EXPLORE • GROW</span>
          <h1 className="mt-4 text-4xl leading-[1.05] sm:text-5xl">
            Find the <span className="bg-gradient-to-t from-brand-yellow from-40% to-transparent to-40%">right book</span>, in seconds.
          </h1>
          <p className="mt-4 max-w-lg text-lg text-brand-navy/80">
            Your complete study library for Classes 10, 11 and 12. Discover books, notes and educational resources in one place.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/library" className="btn btn-primary">Browse the Library →</Link>
            <Link to="/class/10" className="btn btn-outline">Explore Classes</Link>
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['10–12', 'Classes'], [stats.data?.total ?? '–', 'Resources'], [stats.data?.notes ?? '–', 'Notes'], [stats.data?.pyqs ?? '–', 'PYQs']].map(([v, l]) => (
              <div key={l} className="card p-3 text-center">
                <dd className="text-2xl font-extrabold">{v}</dd><dt className="text-xs font-bold uppercase tracking-wide text-brand-navy/60">{l}</dt>
              </div>
            ))}
          </dl>
        </div>
        <div className="card mx-auto w-full max-w-sm p-4"><Mascot className="w-full" /></div>
      </section>

      <Section title="Pick your class">
        <div className="grid gap-4 sm:grid-cols-3">
          {CLASS_IDS.map((c) => (
            <Link key={c} to={`/class/${c}`} className="card p-5 transition-colors hover:border-brand-yellow">
              <h3 className="text-xl">Class {c}</h3>
              <p className="mt-1 text-sm text-brand-navy/70">{c === 10 ? 'Six core subjects' : 'Science, Commerce, Arts / Humanities'}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Resource categories">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_NAMES.map((n) => (
            <Link key={n} className="btn btn-outline btn-sm" to={`/library?category=${catId(n) ?? ''}`}>{n}</Link>
          ))}
        </div>
      </Section>

      <Section title="Featured books">
        {featured.error ? <ErrorNote message={featured.error} /> : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{featured.data?.items.slice(0, 4).map((b) => <BookCard key={b.id} book={b} />)}</div>
        )}
      </Section>

      <Section title="Recently added">
        {recent.error ? <ErrorNote message={recent.error} /> : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{recent.data?.items.slice(0, 4).map((b) => <BookCard key={b.id} book={b} />)}</div>
        )}
      </Section>

      <Section title={`Why ${brand.name}`}>
        <div className="grid gap-4 sm:grid-cols-3">
          {[['One place', 'Books, notes, question banks and previous year papers sorted by class and subject.'],
            ['Quick to search', 'Filter by class, subject, category, language and session.'],
            ['Authorised content only', 'We host or link only material that may be shared.']].map(([t, d]) => (
            <div key={t} className="card p-5"><h3 className="text-lg">{t}</h3><p className="mt-1 text-sm text-brand-navy/70">{d}</p></div>
          ))}
        </div>
      </Section>
    </>
  )
}
