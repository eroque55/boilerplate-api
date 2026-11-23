import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ProblemDetailsSchema } from '@/common/schemas/problem-details.schema';

import {
  AuthSessionSchema,
  LoginSchema,
  RefreshTokenSchema,
  RegisterSchema,
  type TLoginInput,
  type TRefreshTokenInput,
  type TRegisterInput,
  TokenPairSchema,
} from './auth.schemas';
import { AuthService } from './auth.service';
import {
  CurrentUser,
  type TAuthUser,
} from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

const STRICT_LIMIT = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('auth')
@ApiTooManyRequestsResponse({ standardSchema: ProblemDetailsSchema })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle(STRICT_LIMIT)
  @Post('register')
  @ApiOperation({ summary: 'Creates an account and starts a session' })
  @ApiCreatedResponse({ standardSchema: AuthSessionSchema })
  @ApiConflictResponse({ standardSchema: ProblemDetailsSchema })
  register(@Body({ schema: RegisterSchema }) body: TRegisterInput) {
    return this.authService.register(body);
  }

  @Public()
  @Throttle(STRICT_LIMIT)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Starts a session with e-mail and password' })
  @ApiOkResponse({ standardSchema: AuthSessionSchema })
  @ApiUnauthorizedResponse({ standardSchema: ProblemDetailsSchema })
  login(@Body({ schema: LoginSchema }) body: TLoginInput) {
    return this.authService.login(body);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchanges a refresh token for a new token pair',
    description:
      'Refresh tokens rotate: each one works once. Reusing a spent token revokes every session that descends from the same login.',
  })
  @ApiOkResponse({ standardSchema: TokenPairSchema })
  @ApiUnauthorizedResponse({ standardSchema: ProblemDetailsSchema })
  refresh(@Body({ schema: RefreshTokenSchema }) body: TRefreshTokenInput) {
    return this.authService.refresh(body.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Ends the session of a refresh token' })
  @ApiNoContentResponse()
  async logout(@Body({ schema: RefreshTokenSchema }) body: TRefreshTokenInput) {
    await this.authService.logout(body.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ends every session of the authenticated user' })
  @ApiNoContentResponse()
  async logoutAll(@CurrentUser() user: TAuthUser) {
    await this.authService.logoutAll(user.id);
  }
}
