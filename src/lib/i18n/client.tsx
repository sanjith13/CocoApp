'use client'

import { useSyncExternalStore } from 'react'
import { LANGS, isLang, translate, type Lang } from './dict'

const COOKIE = 'lang'
const listeners = new Set<() => void>()

function read(): Lang {
  const m = document.cookie.match(/(?:^|; )lang=([^;]*)/)
  return m && isLang(m[1]) ? m[1] : 'en'
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function setLang(lang: Lang) {
  document.cookie = `${COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`
  document.documentElement.lang = lang
  listeners.forEach((l) => l())
}

/** Current language. The server render is always English; the browser switches after hydration. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, read, () => 'en')
}

export function useT() {
  const lang = useLang()
  return (text: string) => translate(lang, text)
}

/** Translates its text child, falling back to English: <T>Dashboard</T>. */
export function T({ children }: { children: string }) {
  return <>{useT()(children)}</>
}

export function LanguageToggle({ className = '' }: { className?: string }) {
  const lang = useLang()
  return (
    <div role="group" aria-label="Language" className={`inline-flex overflow-hidden rounded-full border border-current/30 text-xs ${className}`}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          aria-pressed={lang === l.code}
          onClick={() => setLang(l.code)}
          className={`px-3 py-1 ${lang === l.code ? 'bg-primary text-primary-foreground font-semibold' : 'opacity-80 hover:opacity-100'}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
