import z from '@/validation/zod';

export const ProblemDetailsSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int(),
    detail: z.string(),
    instance: z.string(),
    errors: z
      .array(z.object({ pointer: z.string(), detail: z.string() }))
      .optional(),
  })
  .meta({ id: 'ProblemDetails' });
