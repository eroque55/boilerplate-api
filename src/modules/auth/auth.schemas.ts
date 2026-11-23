import { UserSchema } from '@/modules/users/users.schemas';
import z, { password } from '@/validation/zod';

const email = z.string().trim().toLowerCase().pipe(z.email());

export const RegisterSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email,
    password,
  })
  .meta({ id: 'RegisterInput' });

export type TRegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z
  .object({
    email,
    password: z.string().min(1),
  })
  .meta({ id: 'LoginInput' });

export type TLoginInput = z.infer<typeof LoginSchema>;

export const RefreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .meta({ id: 'RefreshTokenInput' });

export type TRefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

export const TokenPairSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string(),
    tokenType: z.literal('Bearer'),
    expiresIn: z.number().int().describe('Access token lifetime in seconds'),
  })
  .meta({ id: 'TokenPair' });

export const AuthSessionSchema = TokenPairSchema.extend({
  user: UserSchema,
}).meta({ id: 'AuthSession' });
