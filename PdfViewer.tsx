import { useRef, useState } from 'react'

/** Embeds a document with zoom, page jump (PDF open parameters), fullscreen and open-in-new-tab. */
export function PdfViewer({ url }: { url: string }) {
  const [zoom, setZoom] = useState(1)
  const [page, setPage] = useState(1)
  const box = useRef<HTMLDivElement>(null)
  const src = `${url.split('#')[0]}#page=${page}`
  return (
    <div className="mt-4">
      <div className="mb-2 flex flex-wrap gap-2">
        <button className="btn btn-outline btn-sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} aria-label="Zoom out">−</button>
        <button className="btn btn-outline btn-sm" onClick={() => setZoom((z) => Math.min(2, z + 0.25))} aria-label="Zoom in">+</button>
        <button className="btn btn-outline btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev page</button>
        <span className="chip self-center">Page {page}</span>
        <button className="btn btn-outline btn-sm" onClick={() => setPage((p) => p + 1)}>Next page</button>
        <button className="btn btn-outline btn-sm" onClick={() => box.current?.requestFullscreen?.()}>Fullscreen</button>
        <a className="btn btn-outline btn-sm" href={url} target="_blank" rel="noopener noreferrer">Open in new tab</a>
      </div>
      <div ref={box} className="overflow-auto rounded-xl border border-brand-navy/15 bg-white">
        <iframe key={src} title="Document preview" src={src}
          style={{ width: `${100 / zoom}%`, transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          className="h-[70vh] border-0" />
      </div>
      <p className="mt-2 text-xs text-brand-navy/60">If nothing loads, the source may block embedding. Use “Open in new tab”.</p>
    </div>
  )
}
