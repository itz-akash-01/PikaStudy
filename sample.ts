import type { Book } from './types'
import { ALL_SUBJECT_NAMES, CATEGORY_NAMES, STREAM_NAMES } from './curriculum'

// Demo-only data, shown when Supabase env vars are not set. Clearly labelled "(Sample)".
const subjectId = (n: string) => ALL_SUBJECT_NAMES.indexOf(n) + 1
const categoryId = (n: string) => (CATEGORY_NAMES as readonly string[]).indexOf(n) + 1
const streamId = (n: string | null) => (n ? (STREAM_NAMES as readonly string[]).indexOf(n) + 1 : null)

type Row = [title: string, cls: number, stream: string | null, subject: string, category: string, publication: string, featured?: boolean]
const rows: Row[] = [
  ['Mathematics Textbook (Sample)', 10, null, 'Mathematics', 'NCERT', 'NCERT', true],
  ['Science Textbook (Sample)', 10, null, 'Science', 'NCERT', 'NCERT', true],
  ['Sample Paper Set (Sample)', 10, null, 'Mathematics', 'Sample Papers', 'Sample Publisher'],
  ['Hindi Question Bank (Sample)', 10, null, 'Hindi', 'Question Banks', 'Sample Publisher'],
  ['Physics Part 1 (Sample)', 11, 'Science', 'Physics', 'NCERT', 'NCERT', true],
  ['Chemistry Notes (Sample)', 11, 'Science', 'Chemistry', 'Notes', 'Sample Publisher'],
  ['Accountancy Question Bank (Sample)', 11, 'Commerce', 'Accountancy', 'Question Banks', 'Sample Publisher'],
  ['Political Science Part 1 (Sample)', 12, 'Arts / Humanities', 'Political Science', 'NCERT', 'NCERT', true],
  ['Biology PYQs (Sample)', 12, 'Science', 'Biology', 'PYQs', 'Sample Publisher'],
  ['Economics Reference (Sample)', 12, 'Commerce', 'Economics', 'Reference Books', 'Sample Publisher'],
]

export const sampleBooks: Book[] = rows.map(([title, cls, stream, subject, category, publication, featured], i) => ({
  id: `sample-${i + 1}`, title, class_id: cls, stream_id: streamId(stream),
  subject_id: subjectId(subject), category_id: categoryId(category),
  author: null, publication, edition: null, session: '2025-26', language: 'English',
  description: 'Sample listing used in demo mode. No file is attached.',
  cover_path: null, pdf_path: null, external_url: null,
  featured: !!featured, published: true, download_count: 0,
  created_at: new Date(2026, 0, 1 + i).toISOString(),
  subject: { name: subject }, category: { name: category }, stream: stream ? { name: stream } : null,
}))
