import { HttpStatus, UnprocessableEntityException } from '@nestjs/common';

export type TFieldError = {
  pointer: string;
  detail: string;
};

export class ValidationException extends UnprocessableEntityException {
  constructor(readonly errors: TFieldError[]) {
    super({ statusCode: HttpStatus.UNPROCESSABLE_ENTITY, errors });
  }
}
