import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { brand } from './brand'
import { isConfigured } from './supabase'
import { Mascot } from './Mascot'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/class/10', label: 'Classes' },
  { to: '/library', label: 'Library' },
  { to: '/subjects', label: 'Subjects' },
  { to: '/request', label: 'Request a Book' },
  { to: '/admin', label: 'Admin' },
]
const navCls = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-2 text-sm font-bold ${isActive ? 'bg-brand-yellow' : 'hover:bg-brand-navy/5'}`

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-brand-navy/10 bg-brand-cream/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-extrabold" aria-label={`${brand.name} home`}>
            <Mascot width={40} className="rounded-lg" /> {brand.name}
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={navCls}>{l.label}</NavLink>)}
          </nav>
          <button className="btn btn-outline btn-sm md:hidden" aria-expanded={open} aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}>{open ? 'Close' : 'Menu'}</button>
        </div>
        {open && (
          <nav id="mobile-nav" className="border-t border-brand-navy/10 px-4 pb-3 md:hidden" aria-label="Mobile">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end}
                className="flex min-h-[48px] items-center border-b border-brand-navy/10 text-sm font-bold">{l.label}</NavLink>
            ))}
          </nav>
        )}
      </header>

      {!isConfigured && (
        <p className="bg-brand-sky/40 px-4 py-2 text-center text-xs font-bold">
          Demo mode: sample data only. Add Supabase keys to enable the library, requests and admin (see README).
        </p>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8"><Outlet /></main>

      <footer className="mt-8 bg-brand-navy text-brand-cream">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <p className="flex items-center gap-2 text-lg font-extrabold"><Mascot width={32} className="rounded bg-white" /> {brand.name}</p>
          <p className="mt-1 text-sm opacity-80">{brand.tagline}</p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold">
            {[['/about', 'About'], ['/contact', 'Contact'], ['/privacy', 'Privacy'], ['/terms', 'Terms']].map(([to, l]) => (
              <li key={to}><Link to={to} className="hover:underline">{l}</Link></li>
            ))}
          </ul>
          <p className="mt-4 text-xs opacity-60">© {new Date().getFullYear()} {brand.name}</p>
        </div>
      </footer>
    </div>
  )
}
