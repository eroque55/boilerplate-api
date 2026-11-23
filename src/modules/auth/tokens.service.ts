import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { Env } from '@/env';
import { Role } from '@/generated/prisma/enums';
import { PrismaService } from '@/prisma/prisma.service';
import { durationToSeconds } from '@/utils/duration';

import type { TAuthUser } from './decorators/current-user.decorator';

type TAccessTokenPayload = {
  sub: string;
  role: Role;
};

export type TTokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

const INVALID_REFRESH_TOKEN = 'Sessão expirada, faça login novamente';

const hashSecret = (secret: string) =>
  createHash('sha256').update(secret).digest();

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const parseRefreshToken = (token: string) => {
  const [id, secret, ...rest] = token.split('.');

  if (!id || !UUID_PATTERN.test(id) || !secret || rest.length > 0) {
    return undefined;
  }

  return { id, secret };
};

@Injectable()
export class TokensService {
  private readonly accessTokenTtl: number;
  private readonly refreshTokenTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService<Env, true>,
  ) {
    this.accessTokenTtl = durationToSeconds(
      config.get('JWT_ACCESS_EXPIRES_IN', { infer: true }),
    );
    this.refreshTokenTtlMs =
      config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) *
      24 *
      60 *
      60 *
      1000;
  }

  async issue(user: TAuthUser, familyId: string = randomUUID()) {
    const payload: TAccessTokenPayload = { sub: user.id, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, { expiresIn: this.accessTokenTtl }),
      this.createRefreshToken(user.id, familyId),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.accessTokenTtl,
    } satisfies TTokenPair;
  }

  async verifyAccessToken(token: string): Promise<TAuthUser> {
    try {
      const { sub, role } =
        await this.jwt.verifyAsync<TAccessTokenPayload>(token);

      return { id: sub, role };
    } catch {
      throw new UnauthorizedException('Token de acesso inválido ou expirado');
    }
  }

  async rotate(refreshToken: string) {
    const record = await this.findValidRecord(refreshToken);

    if (record.revokedAt) {
      await this.revokeFamily(record.familyId);
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    if (record.expiresAt <= new Date()) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    // Guarded update: if two requests race with the same token, only one
    // revokes it. The loser is treated as reuse and kills the whole family.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (count === 0) {
      await this.revokeFamily(record.familyId);
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    return this.issue(
      { id: record.user.id, role: record.user.role },
      record.familyId,
    );
  }

  async revoke(refreshToken: string) {
    const parsed = parseRefreshToken(refreshToken);

    if (!parsed) {
      return;
    }

    const record = await this.prisma.refreshToken.findUnique({
      where: { id: parsed.id },
    });

    if (record && this.secretMatches(parsed.secret, record.tokenHash)) {
      await this.revokeFamily(record.familyId);
    }
  }

  async revokeAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async createRefreshToken(userId: string, familyId: string) {
    const secret = randomBytes(32).toString('base64url');

    const { id } = await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: hashSecret(secret).toString('hex'),
        expiresAt: new Date(Date.now() + this.refreshTokenTtlMs),
      },
      select: { id: true },
    });

    return `${id}.${secret}`;
  }

  private async findValidRecord(refreshToken: string) {
    const parsed = parseRefreshToken(refreshToken);

    const record = parsed
      ? await this.prisma.refreshToken.findUnique({
          where: { id: parsed.id },
          include: { user: { select: { id: true, role: true } } },
        })
      : null;

    if (
      !parsed ||
      !record ||
      !this.secretMatches(parsed.secret, record.tokenHash)
    ) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    return record;
  }

  private secretMatches(secret: string, storedHash: string) {
    return timingSafeEqual(hashSecret(secret), Buffer.from(storedHash, 'hex'));
  }

  private async revokeFamily(familyId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
