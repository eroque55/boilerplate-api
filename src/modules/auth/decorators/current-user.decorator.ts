import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { Role } from '@/generated/prisma/enums';

export type TAuthUser = {
  id: string;
  role: Role;
};

export type TAuthenticatedRequest = Request & { user: TAuthUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TAuthUser =>
    context.switchToHttp().getRequest<TAuthenticatedRequest>().user,
);
