'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

/** Copy / Share / Print for a report prompt. Falls back to a selectable textarea without clipboard. */
export function PromptActions({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false)
  const [manual, setManual] = useState(false)

  async function copy(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setManual(false)
      setTimeout(() => setCopied(false), 2000)
      return true
    } catch {
      setManual(true)
      return false
    }
  }

  async function share() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: prompt })
        return
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
      }
    }
    await copy()
  }

  return (
    <div className="space-y-3">
      <div className="no-print grid grid-cols-3 gap-2">
        <Button type="button" onClick={copy} className="h-11">
          {copied ? 'Copied' : 'Copy prompt'}
        </Button>
        <Button type="button" variant="outline" onClick={share} className="h-11">
          Share
        </Button>
        <Button type="button" variant="outline" onClick={() => window.print()} className="h-11">
          Print
        </Button>
      </div>
      {manual && (
        <div className="no-print space-y-1">
          <p className="text-sm text-muted-foreground">Copying is unavailable here. Select the text below and copy it.</p>
          <textarea
            readOnly
            value={prompt}
            rows={12}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-md border bg-background p-2 text-sm"
          />
        </div>
      )}
      <pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm">{prompt}</pre>
    </div>
  )
}
