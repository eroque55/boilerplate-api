import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '@/generated/prisma/client';

import { ValidationException } from '../exceptions/validation.exception';

import { ProblemDetailsFilter } from './problem-details.filter';

const reply = vi.fn();
const setHeader = vi.fn();

const host = {
  switchToHttp: () => ({
    getRequest: () => ({ originalUrl: '/v1/things?page=2' }),
    getResponse: () => ({}),
  }),
} as unknown as ArgumentsHost;

const filter = new ProblemDetailsFilter({
  httpAdapter: { reply, setHeader },
} as unknown as HttpAdapterHost);

const catchAndGetBody = (exception: unknown) => {
  filter.catch(exception, host);
  return reply.mock.lastCall?.[1] as Record<string, unknown>;
};

describe('ProblemDetailsFilter', () => {
  beforeEach(() => {
    reply.mockClear();
    setHeader.mockClear();
  });

  it('answers with application/problem+json and the status code', () => {
    catchAndGetBody(new ConflictException('E-mail já cadastrado'));

    expect(setHeader).toHaveBeenCalledWith(
      {},
      'Content-Type',
      'application/problem+json',
    );
    expect(reply.mock.lastCall?.[2]).toBe(409);
  });

  it('keeps a message written by the app as the detail', () => {
    expect(
      catchAndGetBody(new ConflictException('E-mail já cadastrado')),
    ).toEqual({
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      detail: 'E-mail já cadastrado',
      instance: '/v1/things',
    });
  });

  it('replaces a default English message with the pt-BR one', () => {
    expect(catchAndGetBody(new ForbiddenException()).detail).toBe(
      'Acesso negado',
    );
  });

  it('hides the router message for unknown routes', () => {
    expect(
      catchAndGetBody(new NotFoundException('Cannot GET /v1/nope')).detail,
    ).toBe('Recurso não encontrado');
  });

  it('hides the body parser message for malformed JSON', () => {
    const cause = Object.assign(new SyntaxError('Unexpected token'), {
      status: 400,
    });

    expect(
      catchAndGetBody(new BadRequestException(cause.message, { cause })).detail,
    ).toBe('Requisição inválida');
  });

  it('lists field errors for validation failures', () => {
    const body = catchAndGetBody(
      new ValidationException([
        { pointer: '#/email', detail: 'E-mail inválido' },
      ]),
    );

    expect(body.status).toBe(422);
    expect(body.errors).toEqual([
      { pointer: '#/email', detail: 'E-mail inválido' },
    ]);
  });

  it('maps a Prisma unique violation to 409', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
    });

    expect(catchAndGetBody(error).status).toBe(409);
  });

  it('never leaks the message of an unexpected error, but logs it', () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const body = catchAndGetBody(new Error('connection string with password'));

    expect(body.status).toBe(500);
    expect(body.detail).toBe('Houve um imprevisto, tente novamente mais tarde');
    expect(logError).toHaveBeenCalledOnce();
  });
});
