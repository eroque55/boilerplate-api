import z from '@/validation/zod';

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type TPaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const PaginationMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  pageCount: z.number().int(),
  total: z.number().int(),
});

export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({
    data: z.array(item),
    meta: PaginationMetaSchema,
  });

export const toPaginationMeta = (
  { page, pageSize }: TPaginationQuery,
  total: number,
) => ({
  page,
  pageSize,
  pageCount: Math.ceil(total / pageSize),
  total,
});

export const toPrismaPagination = ({ page, pageSize }: TPaginationQuery) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
});
