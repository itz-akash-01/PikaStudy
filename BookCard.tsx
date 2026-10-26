import { Link } from 'react-router-dom'
import type { Book } from './types'
import { coverUrl, hasFile } from './books'

export function BookCard({ book }: { book: Book }) {
  const cover = coverUrl(book)
  return (
    <article className="card flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link to={`/book/${book.id}`} className="block">
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="aspect-[3/4] w-full object-cover" />
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center bg-brand-yellow/60 p-4 text-center text-lg font-extrabold">
            {book.title}
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base leading-snug">
          <Link to={`/book/${book.id}`} className="hover:underline">{book.title}</Link>
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {book.class_id && <span className="chip">Class {book.class_id}</span>}
          {book.subject && <span className="chip">{book.subject.name}</span>}
          {book.category && <span className="chip bg-brand-yellow/50">{book.category.name}</span>}
        </div>
        {book.publication && <p className="text-xs text-brand-navy/70">{book.publication}</p>}
        <div className="mt-auto pt-2">
          <Link to={`/book/${book.id}`} className="btn btn-outline btn-sm w-full">
            {hasFile(book) ? 'Preview & download' : 'View details'}
          </Link>
        </div>
      </div>
    </article>
  )
}
