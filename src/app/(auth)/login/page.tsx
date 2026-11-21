'use client'

import { T, LanguageToggle, useT } from '@/lib/i18n/client'
import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/ui/logo'

export default function LoginPage() {
  const t = useT()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get('email')),
      password: String(form.get('password')),
    })
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    // Full navigation, not router.replace: the client router may hold a cached
    // pre-login prefetch of /dashboard (a redirect back to /login), which would
    // leave this page stuck on "Signing in…". A hard load sends the new session cookie.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard load, see above
    window.location.assign('/dashboard')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex items-center justify-between">
        <Logo />
        <LanguageToggle />
      </div>
      <h1 className="text-2xl font-semibold"><T>Welcome back</T> 🥥</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email"><T>Email</T></Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password"><T>Password</T></Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? t('Signing in…') : t('Sign in')}</Button>
      </form>
      <p className="text-sm text-muted-foreground">
        <T>New here?</T>{' '}
        <Link href="/signup" className="underline">
          <T>Create an account</T>
        </Link>
      </p>
    </main>
  )
}
