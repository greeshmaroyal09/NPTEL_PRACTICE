'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { ShieldCheck } from 'lucide-react'

export function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      const response = await fetch('/api/admin')
      if (response.status === 403) {
        await supabase.auth.signOut()
        throw new Error('This account is not authorized as an administrator.')
      }
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error ?? 'Administrator verification failed.')
      }
      router.replace('/admin/dashboard')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in.')
      setBusy(false)
    }
  }
  return <main className="login-page"><Link href="/" className="back-link"><span>←</span> Back to Courses</Link><form className="login-card" onSubmit={submit}><span className="admin-symbol"><ShieldCheck size={22} /></span><span className="eyebrow">PRIVATE AREA</span><h1>Administrator Login</h1><p>Sign in with your authorized administrator account.</p><label htmlFor="admin-email">Email</label><input id="admin-email" className="text-field" type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /><label htmlFor="admin-password">Password</label><input id="admin-password" className="text-field" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />{error && <div className="notice notice-error">{error}</div>}<button className="button button-primary start-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button></form></main>
}
