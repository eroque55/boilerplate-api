import { describe, expect, it } from 'vitest';

import { LoginSchema, RegisterSchema } from './auth.schemas';

describe('auth schemas', () => {
  it('normalizes e-mail to trimmed lowercase', () => {
    const data = LoginSchema.parse({
      email: '  ANA@Example.COM ',
      password: 'x',
    });

    expect(data.email).toBe('ana@example.com');
  });

  it('enforces the password policy on register with pt-BR messages', () => {
    const result = RegisterSchema.safeParse({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'fraca',
    });

    const messages = result.error?.issues.map(issue => issue.message);
    expect(messages).toContain('A senha deve ter pelo menos 8 caracteres');
    expect(messages).toContain(
      'A senha deve conter pelo menos 1 letra maiúscula',
    );
  });
});
