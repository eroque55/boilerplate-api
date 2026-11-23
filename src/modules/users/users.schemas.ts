import { paginated } from '@/common/schemas/pagination.schema';
import { Role } from '@/generated/prisma/enums';
import z from '@/validation/zod';

export const UserSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    email: z.email(),
    role: z.enum(Role),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'User' });

export const UserListSchema = paginated(UserSchema).meta({ id: 'UserList' });
