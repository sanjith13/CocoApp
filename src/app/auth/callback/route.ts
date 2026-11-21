import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/** Email-confirmation landing: exchanges the code for a session, then opens the app. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL('/farms/new', url.origin))
  }
  return NextResponse.redirect(new URL('/login', url.origin))
}
