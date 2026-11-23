import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import {
  PaginationQuerySchema,
  type TPaginationQuery,
} from '@/common/schemas/pagination.schema';
import { Role } from '@/generated/prisma/enums';

import {
  CurrentUser,
  type TAuthUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

import { UserListSchema, UserSchema } from './users.schemas';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Returns the authenticated user' })
  @ApiOkResponse({ standardSchema: UserSchema })
  async me(@CurrentUser() authUser: TAuthUser) {
    const user = await this.usersService.findById(authUser.id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lists users (admin only)' })
  @ApiOkResponse({ standardSchema: UserListSchema })
  list(@Query({ schema: PaginationQuerySchema }) query: TPaginationQuery) {
    return this.usersService.list(query);
  }
}
