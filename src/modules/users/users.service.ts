import { Injectable } from '@nestjs/common';

import {
  TPaginationQuery,
  toPaginationMeta,
  toPrismaPagination,
} from '@/common/schemas/pagination.schema';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type TPublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<TPublicUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  }

  findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { ...publicUserSelect, passwordHash: true },
    });
  }

  create(data: Prisma.UserCreateInput): Promise<TPublicUser> {
    return this.prisma.user.create({ data, select: publicUserSelect });
  }

  async list(query: TPaginationQuery) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: publicUserSelect,
        orderBy: { createdAt: 'desc' },
        ...toPrismaPagination(query),
      }),
      this.prisma.user.count(),
    ]);

    return { data, meta: toPaginationMeta(query, total) };
  }
}
