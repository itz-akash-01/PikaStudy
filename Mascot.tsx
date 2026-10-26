import type { ReactNode } from 'react'
import { brand } from './brand'

export function Mascot({ className = '', width }: { className?: string; width?: number }) {
  return (
    <img src={brand.mascot} alt={`${brand.name} mascot`} {...brand.mascotSize}
      style={width ? { width } : undefined} className={`h-auto max-w-full object-contain ${className}`} />
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-sm py-12 text-center">
      <Mascot width={140} className="mx-auto" />
      <h2 className="mt-4 text-xl">{title}</h2>
      <div className="mt-1 text-sm text-brand-navy/70">{children}</div>
    </div>
  )
}

export function Loading() {
  return (
    <div className="flex items-center justify-center gap-3 py-16" role="status">
      <Mascot width={56} className="animate-bounce" />
      <span className="text-sm font-bold">Loading…</span>
    </div>
  )
}

export const ErrorNote = ({ message }: { message: string }) => (
  <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{message}</p>
)
