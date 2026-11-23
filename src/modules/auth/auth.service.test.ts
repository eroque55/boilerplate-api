import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TPublicUser, UsersService } from '@/modules/users/users.service';

import { AuthService } from './auth.service';
import type { TokensService } from './tokens.service';

const user: TPublicUser = {
  id: '01a205d8-8e70-7597-948b-642707c38b2c',
  name: 'Ana',
  email: 'ana@example.com',
  role: 'USER',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const tokens = {
  accessToken: 'access',
  refreshToken: 'refresh',
  tokenType: 'Bearer' as const,
  expiresIn: 900,
};

const usersService = {
  findByEmailWithPassword: vi.fn(),
  create: vi.fn(),
};

const tokensService = {
  issue: vi.fn(),
};

const service = new AuthService(
  usersService as unknown as UsersService,
  tokensService as unknown as TokensService,
);

describe('AuthService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    tokensService.issue.mockResolvedValue(tokens);
  });

  describe('register', () => {
    it('stores an argon2 hash, never the plain password', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);
      usersService.create.mockResolvedValue(user);

      const session = await service.register({
        name: 'Ana',
        email: 'ana@example.com',
        password: 'Senha@123',
      });

      const { passwordHash } = usersService.create.mock.calls[0]?.[0] as {
        passwordHash: string;
      };
      expect(passwordHash).toMatch(/^\$argon2id\$/);
      await expect(argon2.verify(passwordHash, 'Senha@123')).resolves.toBe(
        true,
      );
      expect(session).toEqual({ ...tokens, user });
    });

    it('rejects an e-mail that is already registered', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(user);

      await expect(
        service.register({
          name: 'Ana',
          email: 'ana@example.com',
          password: 'Senha@123',
        }),
      ).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('starts a session without exposing the password hash', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue({
        ...user,
        passwordHash: await argon2.hash('Senha@123'),
      });

      const session = await service.login({
        email: 'ana@example.com',
        password: 'Senha@123',
      });

      expect(session.user).toEqual(user);
      expect(session.user).not.toHaveProperty('passwordHash');
    });

    it('gives the same answer for a wrong password and an unknown e-mail', async () => {
      usersService.findByEmailWithPassword.mockResolvedValueOnce({
        ...user,
        passwordHash: await argon2.hash('Senha@123'),
      });
      const wrongPassword = service.login({
        email: 'ana@example.com',
        password: 'wrong',
      });

      await expect(wrongPassword).rejects.toThrow(
        new UnauthorizedException('E-mail ou senha inválidos'),
      );

      usersService.findByEmailWithPassword.mockResolvedValueOnce(null);
      const unknownEmail = service.login({
        email: 'nobody@example.com',
        password: 'wrong',
      });

      await expect(unknownEmail).rejects.toThrow(
        new UnauthorizedException('E-mail ou senha inválidos'),
      );
      expect(tokensService.issue).not.toHaveBeenCalled();
    });
  });
});
