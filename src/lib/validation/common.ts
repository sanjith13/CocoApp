import { z } from 'zod'

// Empty text clears the column (null) so updates can unset optional fields.
export const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null))

// Blank input must fail as required instead of coercing to 0.
export const blankToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v)
export const num = () => z.preprocess(blankToUndefined, z.coerce.number({ error: 'Required' }))

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
