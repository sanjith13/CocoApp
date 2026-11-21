/* eslint-disable @typescript-eslint/no-explicit-any */
type Page = PromiseLike<{ data: any[] | null; error: { message: string } | null }>

/**
 * Reads every row of an ordered query in pages, so no panel depends on PostgREST's silent
 * 1000-row cap. `make` must apply a deterministic order and the given range.
 */
export async function fetchAll(
  make: (from: number, to: number) => Page,
  pageSize = 1000,
  maxPages = 20,
): Promise<{ data: any[]; error: { message: string } | null }> {
  const out: any[] = []
  for (let p = 0; p < maxPages; p++) {
    const { data, error } = await make(p * pageSize, p * pageSize + pageSize - 1)
    if (error) return { data: out, error }
    out.push(...(data ?? []))
    if ((data ?? []).length < pageSize) break
  }
  return { data: out, error: null }
}
