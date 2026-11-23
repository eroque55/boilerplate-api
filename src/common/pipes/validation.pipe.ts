import { StandardSchemaValidationPipe } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';

import { ValidationException } from '../exceptions/validation.exception';

const toPointer = (path: StandardSchemaV1.Issue['path']) => {
  const segments = (path ?? []).map(segment =>
    typeof segment === 'object' ? String(segment.key) : String(segment),
  );

  return `#/${segments.join('/')}`;
};

export const createValidationPipe = () =>
  new StandardSchemaValidationPipe({
    exceptionFactory: issues =>
      new ValidationException(
        issues.map(issue => ({
          pointer: toPointer(issue.path),
          detail: issue.message,
        })),
      ),
  });
