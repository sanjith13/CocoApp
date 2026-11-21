'use client'

import { T, LanguageToggle, useT } from '@/lib/i18n/client'
import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/ui/logo'

export default function SignupPage() {
  const t = useT()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setBusy(false)
      return
    }
    if (password !== String(form.get('confirm'))) {
      setError('Passwords do not match.')
      setBusy(false)
      return
    }
    const supabase = createBrowserClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    if (data.session) {
      // Email confirmation is off: the user is signed in. Hard load so the new cookie is sent.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- hard load sends the new session cookie
      window.location.assign('/farms/new')
      return
    }
    setNotice('Check your email to confirm your account, then sign in.')
    setBusy(false)
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex items-center justify-between">
        <Logo />
        <LanguageToggle />
      </div>
      <h1 className="text-2xl font-semibold"><T>Create your account</T> 🌴</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email"><T>Email</T></Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password"><T>Password</T></Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm"><T>Confirm password</T></Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
        <Button type="submit" disabled={busy}>{busy ? t('Creating account…') : t('Sign up')}</Button>
      </form>
      <p className="text-sm text-muted-foreground">
        <T>Already have an account?</T>{' '}
        <Link href="/login" className="underline">
          <T>Sign in</T>
        </Link>
      </p>
    </main>
  )
}
