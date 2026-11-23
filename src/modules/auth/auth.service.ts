import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';

import { TPublicUser, UsersService } from '@/modules/users/users.service';

import { TLoginInput, TRegisterInput } from './auth.schemas';
import { TokensService } from './tokens.service';

const INVALID_CREDENTIALS = 'E-mail ou senha inválidos';

@Injectable()
export class AuthService {
  // Verifying against a real hash when the e-mail does not exist keeps the
  // response time equal, so timing cannot reveal which e-mails are registered.
  private dummyHash?: Promise<string>;

  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: TokensService,
  ) {}

  async register({ name, email, password }: TRegisterInput) {
    const existing = await this.usersService.findByEmailWithPassword(email);

    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const user = await this.usersService.create({
      name,
      email,
      passwordHash: await argon2.hash(password),
    });

    return this.startSession(user);
  }

  async login({ email, password }: TLoginInput) {
    const found = await this.usersService.findByEmailWithPassword(email);

    if (!found) {
      this.dummyHash ??= argon2.hash('dummy-password');
      await argon2.verify(await this.dummyHash, password);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const { passwordHash, ...user } = found;

    if (!(await argon2.verify(passwordHash, password))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return this.startSession(user);
  }

  refresh(refreshToken: string) {
    return this.tokensService.rotate(refreshToken);
  }

  logout(refreshToken: string) {
    return this.tokensService.revoke(refreshToken);
  }

  logoutAll(userId: string) {
    return this.tokensService.revokeAll(userId);
  }

  private async startSession(user: TPublicUser) {
    const tokens = await this.tokensService.issue(user);

    return { ...tokens, user };
  }
}
