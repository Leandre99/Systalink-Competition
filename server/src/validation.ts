import { BadRequestException } from '@nestjs/common';
import type { z } from 'zod';

export function parseBody<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Requête invalide',
      issues: result.error.issues.slice(0, 20).map((i) => `${i.path.join('.') || '(racine)'} : ${i.message}`),
    });
  }
  return result.data;
}
