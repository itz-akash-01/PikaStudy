export interface Named { id: number; name: string }
export interface Meta { classes: Named[]; streams: Named[]; subjects: Named[]; categories: Named[] }

export interface Book {
  id: string
  title: string
  class_id: number | null
  stream_id: number | null
  subject_id: number | null
  category_id: number | null
  author: string | null
  publication: string | null
  edition: string | null
  session: string | null
  language: string | null
  description: string | null
  cover_path: string | null
  pdf_path: string | null
  external_url: string | null
  featured: boolean
  published: boolean
  download_count: number
  created_at: string
  subject?: { name: string } | null
  category?: { name: string } | null
  stream?: { name: string } | null
}

export type RequestStatus = 'pending' | 'in_progress' | 'completed' | 'rejected'
export interface BookRequest {
  id: string; ref_id: string; book_name: string; class_id: number | null; subject: string | null
  author_or_publication: string | null; info: string | null; status: RequestStatus; created_at: string
}
