import { Link } from 'react-router-dom'
import { CLASS_10_SUBJECTS, STREAM_SUBJECTS } from './curriculum'
import { getMeta, idByName } from './meta'
import { useAsync, usePageTitle } from './useAsync'

export default function Subjects() {
  usePageTitle('Subjects')
  const meta = useAsync(getMeta, [])
  const groups: [string, string[]][] = [['Class 10', CLASS_10_SUBJECTS], ...Object.entries(STREAM_SUBJECTS).map(([k, v]) => [`Class 11 & 12 · ${k}`, v] as [string, string[]])]
  return (
    <>
      <h1 className="text-3xl sm:text-4xl">Subjects</h1>
      {groups.map(([title, list]) => (
        <section key={title} className="mt-6"><h2 className="text-xl">{title}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {list.map((s) => <Link key={s} className="chip bg-brand-yellow/50 hover:bg-brand-yellow" to={`/library?subject=${meta.data ? idByName(meta.data.subjects, s) ?? '' : ''}`}>{s}</Link>)}
          </div>
        </section>
      ))}
    </>
  )
}
