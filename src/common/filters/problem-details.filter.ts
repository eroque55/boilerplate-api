import { STATUS_CODES } from 'node:http';

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';

import { Prisma } from '@/generated/prisma/client';

import {
  TFieldError,
  ValidationException,
} from '../exceptions/validation.exception';

export type TProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: TFieldError[];
};

const DEFAULT_DETAILS: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Requisição inválida',
  [HttpStatus.UNAUTHORIZED]: 'Não autenticado',
  [HttpStatus.FORBIDDEN]: 'Acesso negado',
  [HttpStatus.NOT_FOUND]: 'Recurso não encontrado',
  [HttpStatus.CONFLICT]: 'Conflito com o estado atual do recurso',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'Conteúdo da requisição muito grande',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Dados inválidos',
  [HttpStatus.SERVICE_UNAVAILABLE]:
    'Serviço indisponível, tente novamente em instantes',
  [HttpStatus.TOO_MANY_REQUESTS]:
    'Muitas requisições, tente novamente em instantes',
};

const INTERNAL_ERROR_DETAIL = 'Houve um imprevisto, tente novamente mais tarde';

const PRISMA_STATUS: Partial<Record<string, HttpStatus>> = {
  P2002: HttpStatus.CONFLICT,
  P2025: HttpStatus.NOT_FOUND,
};

// Errors raised by Nest's router (`Cannot GET /path`) or by Express's body
// parser (`Unexpected token…`, `request entity too large`) carry English
// messages we did not write, so they fall back to the pt-BR default.
const isFrameworkMessage = (exception: HttpException, message: string) => {
  const { cause } = exception;

  return (
    message === exception.name ||
    message === STATUS_CODES[exception.getStatus()] ||
    (exception instanceof NotFoundException &&
      /^Cannot \w+ \//.test(message)) ||
    (typeof cause === 'object' &&
      cause !== null &&
      ('status' in cause || 'statusCode' in cause))
  );
};

const getHttpExceptionMessage = (exception: HttpException) => {
  const response = exception.getResponse();

  if (typeof response === 'string') {
    return response;
  }

  const { message } = response as { message?: unknown };

  return typeof message === 'string' ? message : undefined;
};

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.adapterHost;
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();

    const problem = this.toProblem(
      exception,
      request.originalUrl.split('?')[0] ?? '/',
    );

    if (problem.status >= 500) {
      this.logger.error(exception);
    }

    const response = context.getResponse();
    httpAdapter.setHeader(response, 'Content-Type', 'application/problem+json');
    httpAdapter.reply(response, problem, problem.status);
  }

  private toProblem(exception: unknown, instance: string): TProblemDetails {
    const build = (status: number, detail?: string): TProblemDetails => ({
      type: 'about:blank',
      title: STATUS_CODES[status] ?? 'Error',
      status,
      detail: detail ?? DEFAULT_DETAILS[status] ?? INTERNAL_ERROR_DETAIL,
      instance,
    });

    if (exception instanceof ValidationException) {
      return { ...build(exception.getStatus()), errors: exception.errors };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message = getHttpExceptionMessage(exception);

      if (!message || isFrameworkMessage(exception, message)) {
        return build(status);
      }

      return build(status, message);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const status = PRISMA_STATUS[exception.code];

      if (status) {
        return build(status);
      }
    }

    return build(HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
