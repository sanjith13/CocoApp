import { z } from 'zod'

export const applicationIdSchema = z.string().uuid()
