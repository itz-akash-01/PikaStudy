import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './auth'
import { isConfigured } from './supabase'
import { usePageTitle } from './useAsync'

export default function AdminLogin() {
  usePageTitle('Admin login')
  const { isAdmin, signIn } = useAuth()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (isAdmin) return <Navigate to="/admin" replace />

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    setError((await signIn(String(f.get('email')), String(f.get('password')))) ?? '')
    setBusy(false)
  }
  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-2xl">Admin login</h1>
      {!isConfigured && <p className="rounded-xl bg-brand-sky/40 p-3 text-sm font-bold">Demo mode: connect Supabase to enable admin login.</p>}
      <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" required className="input" /></div>
      <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required className="input" /></div>
      {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy || !isConfigured}>{busy ? 'Signing in…' : 'Log in'}</button>
    </form>
  )
}
